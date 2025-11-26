import { Injectable } from '@nestjs/common';
import { Database } from '../../../../database/schema';
import { MortgageCalculationDto } from '../dto/mortgage-calculation.dto';
import {
  MortgageCalculationRto,
  MortgagePaymentSchedule
} from '../rto/mortgage-calculation.rto';
import {
  mortgageCalculations,
  NewMortgageCalculation
} from '../calculations/schemas/mortgage-calculation';

@Injectable()
export class MortgageCalculationService {
  calculateMortgage(dto: MortgageCalculationDto): MortgageCalculationRto {
    const round2 = (value: number) => Math.round(value * 100) / 100;

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

    const propertyDeductionBase = Math.min(dto.propertyPrice, 2_000_000);
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

  async saveCalculationTx(
    tx: Database,
    calculation: NewMortgageCalculation
  ): Promise<void> {
    await tx.insert(mortgageCalculations).values(calculation);
  }
}
