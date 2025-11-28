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

    const result = await this.db.transaction(async transactionDb => {
      const profileModel = this.profileService.buildProfileModel(dto, userId);
      const profileId = await this.profileService.saveProfileInTransaction(
        transactionDb,
        profileModel
      );

      const calcResult = this.calculateMortgage(dto);

      const calculationModel = this.buildCalculationModel(
        userId,
        profileId,
        calcResult
      );

      await this.calcRepo.saveCalculationTx(transactionDb, calculationModel);

      return calcResult;
    });

    return result;
  }

  private validateBusinessRules(dto: CreateMortgageProfileDto): void {
    const matAmount = dto.matCapitalAmount ?? 0;

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
  }

  private calculateMortgage(
    dto: MortgageCalculationDto
  ): MortgageCalculationRto {
    const matAmount = dto.matCapitalAmount ?? 0;

    let loanAmount = dto.propertyPrice - dto.downPaymentAmount;
    if (loanAmount < 0) loanAmount = 0;

    const monthsCount = dto.loanTermYears * 12;
    const monthlyRate = dto.interestRate / 12 / 100;

    const monthlyPayment = this.calculateMonthlyPaymentValue(
      loanAmount,
      monthsCount,
      monthlyRate
    );

    const schedule = this.buildPaymentSchedule(
      loanAmount,
      monthlyRate,
      monthsCount,
      monthlyPayment
    );

    const { totalPayment, totalOverpaymentAmount } =
      this.calculateTotalsFromSchedule(schedule, loanAmount);

    const possibleTaxDeduction = this.calculatePossibleTaxDeduction(
      dto.propertyPrice,
      totalOverpaymentAmount
    );

    const savingsDueMotherCapital = Number(
      (dto.matCapitalIncluded ? matAmount : 0).toFixed(2)
    );

    const recommendedIncome = this.calculateRecommendedIncome(monthlyPayment);

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

  private calculateMonthlyPaymentValue(
    loanAmount: number,
    monthsCount: number,
    monthlyRate: number
  ): number {
    if (loanAmount <= 0 || monthsCount <= 0) {
      return 0;
    }

    if (monthlyRate <= 0) {
      const payment = loanAmount / monthsCount;
      return Number(payment.toFixed(2));
    }

    const factor = Math.pow(1 + monthlyRate, monthsCount);

    if (!Number.isFinite(factor) || factor <= 1) {
      const fallback = loanAmount / monthsCount;
      return Number(fallback.toFixed(2));
    }

    const annuity = (loanAmount * monthlyRate * factor) / (factor - 1);
    return Number(annuity.toFixed(2));
  }

  private buildPaymentSchedule(
    loanAmount: number,
    monthlyRate: number,
    monthsCount: number,
    monthlyPayment: number,
    startDate: Date = new Date()
  ): MortgagePaymentSchedule {
    const schedule: MortgagePaymentSchedule = {};

    if (monthlyPayment <= 0) {
      return schedule;
    }

    let remainingDebt = loanAmount;

    let year = startDate.getFullYear();
    let month = startDate.getMonth() + 1;

    for (let i = 0; i < monthsCount && remainingDebt > 0; i++) {
      const yearKey = String(year);
      const monthKey = String(month);

      if (!schedule[yearKey]) {
        schedule[yearKey] = {};
      }

      const interestPaymentRaw = remainingDebt * monthlyRate;
      const interestPayment = Number(interestPaymentRaw.toFixed(2));

      if (monthlyRate > 0 && monthlyPayment <= interestPayment) {
        throw new Error(
          'Ежемесячный платёж меньше или равен сумме процентов, кредит не погашается'
        );
      }

      let principalPaymentRaw = monthlyPayment - interestPayment;

      if (principalPaymentRaw > remainingDebt) {
        principalPaymentRaw = remainingDebt;
      }

      const principalPayment = Number(principalPaymentRaw.toFixed(2));

      const totalPaymentForMonth = Number(
        (principalPayment + interestPayment).toFixed(2)
      );

      remainingDebt = Number((remainingDebt - principalPayment).toFixed(2));

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

    return schedule;
  }

  private calculateTotalsFromSchedule(
    schedule: MortgagePaymentSchedule,
    initialLoanAmount: number
  ): { totalPayment: number; totalOverpaymentAmount: number } {
    let totalPayment = 0;

    for (const year of Object.values(schedule)) {
      for (const month of Object.values(year)) {
        totalPayment += month.totalPayment;
      }
    }

    totalPayment = Number(totalPayment.toFixed(2));

    const totalOverpaymentAmount = Number(
      (totalPayment - initialLoanAmount).toFixed(2)
    );

    return { totalPayment, totalOverpaymentAmount };
  }

  private calculatePossibleTaxDeduction(
    propertyPrice: number,
    totalOverpaymentAmount: number
  ): number {
    const propertyDeductionBase = Math.min(propertyPrice, 2_000_000);
    const propertyDeduction = Number((propertyDeductionBase * 0.13).toFixed(2));

    const interestDeductionBase = Math.min(totalOverpaymentAmount, 3_000_000);
    const interestDeduction = Number((interestDeductionBase * 0.13).toFixed(2));

    return Number((propertyDeduction + interestDeduction).toFixed(2));
  }

  private calculateRecommendedIncome(monthlyPayment: number): number {
    if (monthlyPayment <= 0) return 0;
    const income = monthlyPayment / 0.35;
    return Number(income.toFixed(2));
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
