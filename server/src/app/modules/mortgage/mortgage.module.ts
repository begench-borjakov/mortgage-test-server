import { Module } from '@nestjs/common';
import { MortgageService } from './mortgage.service';
import { MortgageProfilesController } from './mortgage.controller';
import { DatabaseModule } from '../../../database/database.module';
import { MortgageProfileService } from './profiles/mortgage-profile.service';
import { MortgageCalculationService } from './calculations/mortgage-calculation.service';

@Module({
  imports: [DatabaseModule],
  controllers: [MortgageProfilesController],
  providers: [
    MortgageService,
    MortgageService,
    MortgageProfileService,
    MortgageCalculationService
  ],
  exports: [MortgageService]
})
export class MortgageModule {}
