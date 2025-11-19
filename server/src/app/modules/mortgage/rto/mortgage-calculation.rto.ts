export type MortgagePayment = {
  totalPayment: number;
  repaymentOfMortgageBody: number;
  repaymentOfMortgageInterest: number;
  mortgageBalance: number;
};

export type MonthlyMortgagePayments = {
  [month: string]: MortgagePayment;
};

export type MortgagePaymentSchedule = {
  [year: string]: MonthlyMortgagePayments;
};

export class MortgageCalculationRto {
  monthlyPayment: number;
  totalPayment: number;
  totalOverpaymentAmount: number;
  possibleTaxDeduction: number;
  savingsDueMotherCapital: number;
  recommendedIncome: number;
  mortgagePaymentSchedule: MortgagePaymentSchedule;
}
