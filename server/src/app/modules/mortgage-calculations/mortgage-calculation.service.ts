import { Inject, Injectable, BadRequestException } from '@nestjs/common';
import { Database } from '../../../database/schema';
import { MortgageCalculationDto } from './dto/mortgage-calculation.dto';
import { CreateMortgageProfileDto } from '../mortgage-profiles/dto/create-mortgage.dto';
import {
  MortgageCalculationRto,
  MortgagePaymentSchedule
} from './rto/mortgage-calculation.rto';
import { NewMortgageCalculation } from './schemas/mortgage-calculation';
import { MortgageProfileService } from '../mortgage-profiles/mortgage-profile.service';
import { MortgageCalculationRepository } from './mortgage-calculation.repository';

@Injectable()
export class MortgageCalculationService {
  constructor(
    @Inject('DATABASE')
    private readonly db: Database,
    private readonly profileService: MortgageProfileService,
    private readonly calcRepo: MortgageCalculationRepository
  ) {}

  async createMortgageCalculation(
    userId: string,
    dto: CreateMortgageProfileDto
  ): Promise<MortgageCalculationRto> {
    this.validateBusinessRules(dto);

    const result = await this.db.transaction(async tx => {
      const profileModel = this.profileService.buildProfileModel(dto, userId);
      const profileId = await this.profileService.saveProfileTx(
        tx,
        profileModel
      );

      const calcResult = this.calculateMortgage(dto);

      const calculationModel = this.buildCalculationModel(
        userId,
        profileId,
        calcResult
      );

      await this.calcRepo.saveCalculationTx(tx, calculationModel);

      return calcResult;
    });

    return result;
  }

  private validateBusinessRules(dto: CreateMortgageProfileDto): void {
    const matAmount = dto.matCapitalAmount ?? 0;

    const usedMatCapital = dto.matCapitalIncluded ? matAmount : 0;

    if (dto.downPaymentAmount > dto.propertyPrice) {
      throw new BadRequestException(
        'Первоначальный взнос не может быть больше стоимости недвижимости'
      );
    }

    if (matAmount < 0) {
      throw new BadRequestException(
        'Сумма материнского капитала не может быть отрицательной'
      );
    }

    if (matAmount > dto.propertyPrice) {
      throw new BadRequestException(
        'Сумма материнского капитала не может быть больше стоимости недвижимости'
      );
    }

    if (dto.downPaymentAmount + usedMatCapital > dto.propertyPrice) {
      throw new BadRequestException(
        'Сумма первоначального взноса и материнского капитала не может превышать стоимость недвижимости'
      );
    }
  }

  private round2(value: number): number {
    return Number(value.toFixed(2));
  }

  private calculateMortgage(
    dto: MortgageCalculationDto
  ): MortgageCalculationRto {
    const matAmount = dto.matCapitalAmount ?? 0;
    const usedMatCapital = dto.matCapitalIncluded ? matAmount : 0;

    let loanAmount = dto.propertyPrice - dto.downPaymentAmount - usedMatCapital;
    if (loanAmount < 0) loanAmount = 0;

    const monthsCount = dto.loanTermYears * 12;
    const monthlyRate = dto.interestRate / 12 / 100;

    let monthlyPayment = 0;

    if (loanAmount === 0 || monthsCount <= 0) {
      monthlyPayment = 0;
    } else if (monthlyRate === 0) {
      monthlyPayment = loanAmount / monthsCount;
    } else {
      const factor = Math.pow(1 + monthlyRate, monthsCount);
      monthlyPayment = (loanAmount * monthlyRate * factor) / (factor - 1);
    }

    monthlyPayment = this.round2(monthlyPayment);

    const result = this.buildPaymentSchedule(
      loanAmount,
      monthlyRate,
      monthsCount,
      monthlyPayment
    );

    const schedule = result.schedule;
    const totalPaid = result.totalPaid;
    const totalInterest = result.totalInterest;

    const totalPayment = totalPaid;
    const totalOverpaymentAmount = totalInterest;

    const propertyDeductionBase = Math.min(dto.propertyPrice, 2_000_000);
    const propertyDeduction = this.round2(propertyDeductionBase * 0.13);

    const interestDeductionBase = Math.min(totalOverpaymentAmount, 3_000_000);
    const interestDeduction = this.round2(interestDeductionBase * 0.13);

    const possibleTaxDeduction = this.round2(
      propertyDeduction + interestDeduction
    );

    const savingsDueMotherCapital = this.round2(usedMatCapital);

    const recommendedIncome =
      monthlyPayment > 0 ? this.round2(monthlyPayment / 0.35) : 0;

    return {
      monthlyPayment,
      totalPayment,
      totalOverpaymentAmount,
      possibleTaxDeduction,
      savingsDueMotherCapital,
      recommendedIncome,
      mortgagePaymentSchedule: schedule
    };
  }

  private buildPaymentSchedule(
    loanAmount: number,
    monthlyRate: number,
    monthsCount: number,
    monthlyPayment: number,
    startDate: Date = new Date()
  ): {
    schedule: MortgagePaymentSchedule;
    totalPaid: number;
    totalInterest: number;
  } {
    const schedule: MortgagePaymentSchedule = {};

    if (loanAmount <= 0 || monthlyPayment <= 0 || monthsCount <= 0) {
      return { schedule, totalPaid: 0, totalInterest: 0 };
    }

    let remainingDebt = loanAmount;

    let totalPaid = 0;

    let totalInterest = 0;

    let year = startDate.getFullYear();

    let month = startDate.getMonth() + 1;

    for (let i = 0; i < monthsCount && remainingDebt > 0; i++) {
      const yearKey = String(year);
      const monthKey = String(month);

      if (!schedule[yearKey]) {
        schedule[yearKey] = {};
      }

      const interestPayment =
        monthlyRate === 0 ? 0 : this.round2(remainingDebt * monthlyRate);

      let principalPayment =
        monthlyPayment > 0 ? this.round2(monthlyPayment - interestPayment) : 0;

      if (principalPayment > remainingDebt) {
        principalPayment = remainingDebt;
      }

      const totalPaymentForMonth = this.round2(
        principalPayment + interestPayment
      );

      remainingDebt = this.round2(remainingDebt - principalPayment);

      totalPaid += totalPaymentForMonth;

      totalInterest += interestPayment;

      schedule[yearKey][monthKey] = {
        totalPayment: totalPaymentForMonth,
        repaymentOfMortgageBody: principalPayment,
        repaymentOfMortgageInterest: interestPayment,
        mortgageBalance: remainingDebt
      };

      month++;
      if (month > 12) {
        month = 1;
        year++;
      }
    }

    return {
      schedule,
      totalPaid: this.round2(totalPaid),
      totalInterest: this.round2(totalInterest)
    };
  }

  buildCalculationModel(
    userId: string,
    mortgageProfileId: number,
    result: MortgageCalculationRto
  ): NewMortgageCalculation {
    return {
      userId,
      mortgageProfileId,
      monthlyPayment: result.monthlyPayment,
      totalPayment: result.totalPayment,
      totalOverpaymentAmount: result.totalOverpaymentAmount,
      possibleTaxDeduction: result.possibleTaxDeduction,
      savingsDueMotherCapital: result.savingsDueMotherCapital,
      recommendedIncome: result.recommendedIncome,
      paymentSchedule: JSON.stringify(result.mortgagePaymentSchedule)
    };
  }
}
