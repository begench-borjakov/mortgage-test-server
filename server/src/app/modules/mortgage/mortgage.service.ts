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
    const {
      propertyPrice,
      downPaymentAmount,
      matCapitalAmount,
      matCapitalIncluded,
      loanTermYears,
      interestRate
    } = dto;

    if (downPaymentAmount > propertyPrice) {
      throw new BadRequestException(
        'Первоначальный взнос не может быть больше стоимости недвижимости'
      );
    }

    if (matCapitalIncluded) {
      if (matCapitalAmount == null || matCapitalAmount <= 0) {
        throw new BadRequestException(
          'При включённом материнском капитале необходимо указать его положительную сумму'
        );
      }
    }

    if (matCapitalAmount != null && matCapitalAmount > propertyPrice) {
      throw new BadRequestException(
        'Сумма материнского капитала не может быть больше стоимости недвижимости'
      );
    }

    const usedMatCapital =
      matCapitalIncluded && matCapitalAmount ? matCapitalAmount : 0;

    if (downPaymentAmount + usedMatCapital > propertyPrice) {
      throw new BadRequestException(
        'Сумма первоначального взноса и материнского капитала не может превышать стоимость недвижимости'
      );
    }

    if (loanTermYears > 50) {
      throw new BadRequestException('Срок ипотеки не может превышать 50 лет');
    }

    if (interestRate <= 0 || interestRate > 100) {
      throw new BadRequestException(
        'Процентная ставка должна быть в диапазоне от 0.01% до 100%'
      );
    }
  }
}
