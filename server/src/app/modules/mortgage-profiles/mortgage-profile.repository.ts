import { Injectable, InternalServerErrorException } from '@nestjs/common';
import { Database } from '../../../database/schema';
import {
  mortgageProfiles,
  NewMortgageProfile
} from './schemas/mortgage-profile';

@Injectable()
export class MortgageProfileRepository {
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
