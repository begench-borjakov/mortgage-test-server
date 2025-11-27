import { Injectable, InternalServerErrorException } from '@nestjs/common';
import { Database } from '../../../database/schema';
import { CreateMortgageProfileDto } from './dto/create-mortgage.dto';
import { NewMortgageProfile } from './schemas/mortgage-profile';
import { MortgageProfileRepository } from './mortgage-profile.repository';

@Injectable()
export class MortgageProfileService {
  constructor(private readonly profileRepo: MortgageProfileRepository) {}

  buildProfileModel(
    dto: CreateMortgageProfileDto,
    userId: string
  ): NewMortgageProfile {
    return {
      userId,
      propertyPrice: dto.propertyPrice,
      propertyType: dto.propertyType,
      downPaymentAmount: dto.downPaymentAmount,
      matCapitalAmount: dto.matCapitalAmount ?? null,
      matCapitalIncluded: dto.matCapitalIncluded,
      loanTermYears: dto.loanTermYears,
      interestRate: dto.interestRate
    };
  }

  async saveProfileTx(
    tx: Database,
    profile: NewMortgageProfile
  ): Promise<number> {
    return this.profileRepo.saveProfileTx(tx, profile);
  }
}
