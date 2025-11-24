import { Injectable, InternalServerErrorException } from '@nestjs/common';
import { Database } from '../../../../database/schema';
import { CreateMortgageProfileDto } from '../dto/create-mortgage.dto';
import {
  mortgageProfiles,
  NewMortgageProfile
} from '../profiles/schemas/mortgage-profile';

@Injectable()
export class MortgageProfileService {
  buildProfileModel(
    dto: CreateMortgageProfileDto,
    userId: string
  ): NewMortgageProfile {
    const {
      propertyPrice,
      propertyType,
      downPaymentAmount,
      matCapitalAmount,
      matCapitalIncluded,
      loanTermYears,
      interestRate
    } = dto;

    return {
      userId,
      propertyPrice,
      propertyType,
      downPaymentAmount,
      matCapitalAmount: matCapitalAmount ?? null,
      matCapitalIncluded,
      loanTermYears,
      interestRate
    };
  }

  async saveProfileTx(
    tx: Database,
    profile: NewMortgageProfile
  ): Promise<number> {
    const inserted = await tx
      .insert(mortgageProfiles)
      .values(profile)
      .$returningId();

    const [row] = inserted;
    const insertId = row?.id;

    if (!insertId) {
      throw new InternalServerErrorException(
        'Не удалось сохранить ипотечный профиль'
      );
    }

    return insertId;
  }
}
