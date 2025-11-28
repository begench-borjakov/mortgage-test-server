import { Module } from '@nestjs/common';
import { DatabaseModule } from '../../../database/database.module';
import { MortgageCalculationService } from './mortgage-calculation.service';
import { MortgageCalculationRepository } from './mortgage-calculation.repository';
import { MortgageProfileService } from '../mortgage-profiles/mortgage-profile.service';
import { MortgageCalculationsController } from './mortgage-calculations.controller';

@Module({
  imports: [DatabaseModule],
  controllers: [MortgageCalculationsController],
  providers: [
    MortgageCalculationService,
    MortgageCalculationRepository,
    MortgageProfileService
  ],
  exports: [MortgageCalculationService]
})
export class MortgageCalculationsModule {}
