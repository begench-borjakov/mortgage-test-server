import { Module } from '@nestjs/common';
import { DatabaseModule } from '../../../database/database.module';
import { MortgageProfileService } from './mortgage-profile.service';
import { MortgageProfileRepository } from './mortgage-profile.repository';

@Module({
  imports: [DatabaseModule],
  providers: [MortgageProfileService, MortgageProfileRepository],
  exports: [MortgageProfileService]
})
export class MortgageProfilesModule {}
