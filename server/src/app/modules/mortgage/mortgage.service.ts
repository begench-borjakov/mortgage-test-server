import {
  Inject,
  Injectable,
  BadRequestException,
  InternalServerErrorException
} from '@nestjs/common';
import { Database } from '../../../database/schema';
import { CreateMortgageProfileDto } from './dto/create-mortgage.dto';
import {
  MortgageCalculationRto,
  MortgagePaymentSchedule
} from './rto/mortgage-calculation.rto';
import {
  mortgageProfiles,
  NewMortgageProfile
} from './schemas/mortgage-profile';
import {
  mortgageCalculations,
  NewMortgageCalculation
} from './schemas/mortgage-calculation';

@Injectable()
export class MortgageService {
  constructor(
    @Inject('DATABASE')
    private readonly db: Database
  ) {}

  async createMortgageCalculation(
    userId: string,
    dto: CreateMortgageProfileDto
  ): Promise<MortgageCalculationRto> {
    this.validateBusinessRules(dto);

    const result = await this.db.transaction(async tx => {
      const profileModel = this.buildProfileModel(dto, userId);
      const profileId = await this.saveProfileTx(tx, profileModel);

      const calcResult = this.calculateMortgage(dto);

      const calculationModel = this.buildCalculationModel(
        userId,
        profileId,
        calcResult
      );
      await this.saveCalculationTx(tx, calculationModel);

      return calcResult;
    });

    return result;
  }

  private validateBusinessRules(dto: CreateMortgageProfileDto): void {
    const {
      propertyPrice,
      downPaymentAmount,
      matCapitalAmount,
      matCapitalIncluded,
      loanTermYears,
      interestRate
    } = dto;

    if (downPaymentAmount > propertyPrice) {
      throw new BadRequestException(
        'Первоначальный взнос не может быть больше стоимости недвижимости'
      );
    }

    if (matCapitalIncluded) {
      if (matCapitalAmount == null || matCapitalAmount <= 0) {
        throw new BadRequestException(
          'При включённом материнском капитале необходимо указать его положительную сумму'
        );
      }
    }

    if (matCapitalAmount != null && matCapitalAmount > propertyPrice) {
      throw new BadRequestException(
        'Сумма материнского капитала не может быть больше стоимости недвижимости'
      );
    }

    const usedMatCapital =
      matCapitalIncluded && matCapitalAmount ? matCapitalAmount : 0;

    if (downPaymentAmount + usedMatCapital > propertyPrice) {
      throw new BadRequestException(
        'Сумма первоначального взноса и материнского капитала не может превышать стоимость недвижимости'
      );
    }

    if (loanTermYears > 50) {
      throw new BadRequestException('Срок ипотеки не может превышать 50 лет');
    }

    if (interestRate <= 0 || interestRate > 100) {
      throw new BadRequestException(
        'Процентная ставка должна быть в диапазоне от 0.01% до 100%'
      );
    }
  }

  private buildProfileModel(
    dto: CreateMortgageProfileDto,
    userId: string
  ): NewMortgageProfile {
    const {
      propertyPrice,
      propertyType,
      downPaymentAmount,
      matCapitalAmount,
      matCapitalIncluded,
      loanTermYears,
      interestRate
    } = dto;

    return {
      userId,
      propertyPrice,
      propertyType,
      downPaymentAmount,
      matCapitalAmount: matCapitalAmount ?? null,
      matCapitalIncluded,
      loanTermYears,
      interestRate
    };
  }

  private async saveProfileTx(
    tx: Database,
    profile: NewMortgageProfile
  ): Promise<number> {
    const inserted = await tx
      .insert(mortgageProfiles)
      .values(profile)
      .$returningId();

    const [row] = inserted;
    const insertId = row?.id;

    if (!insertId) {
      throw new InternalServerErrorException(
        'Не удалось сохранить ипотечный профиль'
      );
    }

    return insertId;
  }

  private calculateMortgage(
    dto: CreateMortgageProfileDto
  ): MortgageCalculationRto {
    const {
      propertyPrice,
      downPaymentAmount,
      matCapitalAmount,
      matCapitalIncluded,
      loanTermYears,
      interestRate
    } = dto;

    const round2 = (value: number) => Math.round(value * 100) / 100;

    const usedMatCapital =
      matCapitalIncluded && matCapitalAmount ? matCapitalAmount : 0;

    let loanAmount = propertyPrice - downPaymentAmount - usedMatCapital;
    if (loanAmount < 0) loanAmount = 0;

    const monthsCount = loanTermYears * 12;
    const monthlyRate = interestRate / 12 / 100;

    let monthlyPayment = 0;

    if (loanAmount === 0 || monthsCount <= 0) {
      monthlyPayment = 0;
    } else if (monthlyRate === 0) {
      monthlyPayment = loanAmount / monthsCount;
    } else {
      const factor = Math.pow(1 + monthlyRate, monthsCount);
      monthlyPayment = (loanAmount * monthlyRate * factor) / (factor - 1);
    }

    monthlyPayment = round2(monthlyPayment);

    const schedule: MortgagePaymentSchedule = {};
    let remainingDebt = loanAmount;
    let totalPaid = 0;
    let totalInterest = 0;

    const startYear = new Date().getFullYear();

    for (let i = 0; i < monthsCount; i++) {
      if (remainingDebt <= 0) break;

      const year = startYear + Math.floor(i / 12);
      const monthNumber = (i % 12) + 1;
      const yearKey = String(year);
      const monthKey = String(monthNumber);

      if (!schedule[yearKey]) {
        schedule[yearKey] = {};
      }

      const interestRaw = monthlyRate === 0 ? 0 : remainingDebt * monthlyRate;
      let principalRaw = monthlyPayment - interestRaw;

      if (principalRaw > remainingDebt) {
        principalRaw = remainingDebt;
      }

      const interestPayment = round2(interestRaw);
      const principalPayment = round2(principalRaw);
      const totalPaymentForMonth = round2(principalPayment + interestPayment);

      remainingDebt = round2(remainingDebt - principalPayment);
      totalPaid += totalPaymentForMonth;
      totalInterest += interestPayment;

      schedule[yearKey][monthKey] = {
        totalPayment: totalPaymentForMonth,
        repaymentOfMortgageBody: principalPayment,
        repaymentOfMortgageInterest: interestPayment,
        mortgageBalance: remainingDebt
      };
    }

    const totalPayment = round2(totalPaid);
    const totalOverpaymentAmount = round2(totalInterest);

    const propertyDeductionBase = Math.min(propertyPrice, 2_000_000);
    const propertyDeduction = round2(propertyDeductionBase * 0.13);

    const interestDeductionBase = Math.min(totalOverpaymentAmount, 3_000_000);
    const interestDeduction = round2(interestDeductionBase * 0.13);

    const possibleTaxDeduction = round2(propertyDeduction + interestDeduction);

    const savingsDueMotherCapital = round2(usedMatCapital);

    const recommendedIncome =
      monthlyPayment > 0 ? round2(monthlyPayment / 0.35) : 0;

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

  private buildCalculationModel(
    userId: string,
    mortgageProfileId: number,
    result: MortgageCalculationRto
  ): NewMortgageCalculation {
    const {
      monthlyPayment,
      totalPayment,
      totalOverpaymentAmount,
      possibleTaxDeduction,
      savingsDueMotherCapital,
      recommendedIncome,
      mortgagePaymentSchedule
    } = result;

    return {
      userId,
      mortgageProfileId,
      monthlyPayment,
      totalPayment,
      totalOverpaymentAmount,
      possibleTaxDeduction,
      savingsDueMotherCapital,
      recommendedIncome,
      paymentSchedule: JSON.stringify(mortgagePaymentSchedule)
    };
  }

  private async saveCalculationTx(
    tx: Database,
    calculation: NewMortgageCalculation
  ): Promise<void> {
    await tx.insert(mortgageCalculations).values(calculation);
  }
}
