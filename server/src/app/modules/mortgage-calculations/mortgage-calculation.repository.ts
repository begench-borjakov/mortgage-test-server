import { Injectable } from '@nestjs/common';
import { Database } from '../../../database/schema';
import {
  mortgageCalculations,
  NewMortgageCalculation
} from './schemas/mortgage-calculation';

@Injectable()
export class MortgageCalculationRepository {
  async saveCalculationTx(
    tx: Database,
    calculation: NewMortgageCalculation
  ): Promise<void> {
    await tx.insert(mortgageCalculations).values(calculation);
  }
}
