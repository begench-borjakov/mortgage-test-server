import { Inject, Injectable, BadRequestException } from '@nestjs/common';
import { Database } from '../../../database/schema';
import { CreateMortgageProfileDto } from './dto/create-mortgage.dto';
import { MortgageCalculationRto } from './rto/mortgage-calculation.rto';
import { MortgageProfileService } from './profiles/mortgage-profile.service';
import { MortgageCalculationService } from './calculations/mortgage-calculation.service';

@Injectable()
export class MortgageService {
  constructor(
    @Inject('DATABASE')
    private readonly db: Database,
    private readonly profileService: MortgageProfileService,
    private readonly calculationService: MortgageCalculationService
  ) {}

  async createMortgageCalculation(
    userId: string,
    dto: CreateMortgageProfileDto
  ): Promise<MortgageCalculationRto> {
    this.validateBusinessRules(dto);

    const result = await this.db.transaction(async tx => {
      const profileModel = this.profileService.buildProfileModel(dto, userId);
      const profileId = await this.profileService.saveProfileTx(
        tx,
        profileModel
      );

      const calcResult = this.calculationService.calculateMortgage(dto);

      const calculationModel = this.calculationService.buildCalculationModel(
        userId,
        profileId,
        calcResult
      );
      await this.calculationService.saveCalculationTx(tx, calculationModel);

      return calcResult;
    });

    return result;
  }

  private validateBusinessRules(dto: CreateMortgageProfileDto): void {
    const matAmount = dto.matCapitalAmount ?? 0;

    const usedMatCapital = dto.matCapitalIncluded ? matAmount : 0;

    if (dto.downPaymentAmount > dto.propertyPrice) {
      throw new BadRequestException(
        'Первоначальный взнос не может быть больше стоимости недвижимости'
      );
    }

    if (matAmount < 0) {
      throw new BadRequestException(
        'Сумма материнского капитала не может быть отрицательной'
      );
    }

    if (matAmount > dto.propertyPrice) {
      throw new BadRequestException(
        'Сумма материнского капитала не может быть больше стоимости недвижимости'
      );
    }

    if (dto.downPaymentAmount + usedMatCapital > dto.propertyPrice) {
      throw new BadRequestException(
        'Сумма первоначального взноса и материнского капитала не может превышать стоимость недвижимости'
      );
    }
  }
}
