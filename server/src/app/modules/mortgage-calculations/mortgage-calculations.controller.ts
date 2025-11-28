import { Controller, Post, Body, Req } from '@nestjs/common';
import { JwtAuth } from '../../decorators/jwt-auth.decorator';
import { MortgageCalculationService } from './mortgage-calculation.service';
import { CreateMortgageProfileDto } from '../mortgage-profiles/dto/create-mortgage.dto';
import { MortgageCalculationRto } from './rto/mortgage-calculation.rto';
import { RequestWithUser } from '../auth/interfaces/request-with-user.interface';

@Controller('mortgage-calculations')
export class MortgageCalculationsController {
  constructor(
    private readonly mortgageCalculationService: MortgageCalculationService
  ) {}

  @JwtAuth()
  @Post()
  async createMortgageCalculation(
    @Req() req: RequestWithUser,
    @Body() dto: CreateMortgageProfileDto
  ): Promise<MortgageCalculationRto> {
    const userId = req.user.tgId;

    return this.mortgageCalculationService.createMortgageCalculation(
      userId,
      dto
    );
  }
}
