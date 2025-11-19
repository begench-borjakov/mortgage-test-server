import { Module } from '@nestjs/common';
import { MortgageService } from './mortgage.service';
import { MortgageProfilesController } from './mortgage.controller';
import { DatabaseModule } from '../../../database/database.module';

@Module({
  imports: [DatabaseModule],
  controllers: [MortgageProfilesController],
  providers: [MortgageService],
  exports: [MortgageService]
})
export class MortgageModule {}
