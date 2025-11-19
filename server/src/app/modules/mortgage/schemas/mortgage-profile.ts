import {
  mysqlTable,
  int,
  double,
  varchar,
  boolean,
  timestamp
} from 'drizzle-orm/mysql-core';
import { InferInsertModel, InferSelectModel } from 'drizzle-orm';

export const mortgageProfiles = mysqlTable('MortgageProfiles', {
  id: int('id').autoincrement().primaryKey(),
  userId: varchar('userId', { length: 36 }).notNull(),

  propertyPrice: double('propertyPrice').notNull(),
  propertyType: varchar('propertyType', { length: 255 }).notNull(),
  downPaymentAmount: double('downPaymentAmount').notNull(),

  matCapitalAmount: double('matCapitalAmount'),
  matCapitalIncluded: boolean('matCapitalIncluded').notNull().default(false),

  loanTermYears: int('loanTermYears').notNull(),
  interestRate: double('interestRate').notNull(),

  createdAt: timestamp('createdAt').defaultNow().notNull(),
  updatedAt: timestamp('updatedAt').defaultNow().onUpdateNow().notNull()
});

export type MortgageProfile = InferSelectModel<typeof mortgageProfiles>;
export type NewMortgageProfile = InferInsertModel<typeof mortgageProfiles>;
