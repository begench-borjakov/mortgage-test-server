import {
  mysqlTable,
  int,
  double,
  varchar,
  text,
  timestamp
} from 'drizzle-orm/mysql-core';
import { InferInsertModel, InferSelectModel } from 'drizzle-orm';

export const mortgageCalculations = mysqlTable('MortgageCalculations', {
  id: int('id').autoincrement().primaryKey(),
  userId: varchar('userId', { length: 36 }).notNull(),

  mortgageProfileId: int('mortgageProfileId').notNull(),

  monthlyPayment: double('monthlyPayment').notNull(),
  totalPayment: double('totalPayment').notNull(),
  totalOverpaymentAmount: double('totalOverpaymentAmount').notNull(),
  possibleTaxDeduction: double('possibleTaxDeduction').notNull(),
  savingsDueMotherCapital: double('savingsDueMotherCapital').notNull(),
  recommendedIncome: double('recommendedIncome').notNull(),

  paymentSchedule: text('paymentSchedule').notNull(),

  createdAt: timestamp('createdAt').defaultNow().notNull(),
  updatedAt: timestamp('updatedAt').defaultNow().onUpdateNow().notNull()
});

export type MortgageCalculation = InferSelectModel<typeof mortgageCalculations>;
export type NewMortgageCalculation = InferInsertModel<
  typeof mortgageCalculations
>;
