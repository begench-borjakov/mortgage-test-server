import { Controller, Post, Body, Req } from '@nestjs/common';
import { JwtAuth } from '../../decorators/jwt-auth.decorator';
import { MortgageService } from './mortgage.service';
import { CreateMortgageProfileDto } from './dto/create-mortgage.dto';
import { MortgageCalculationRto } from './rto/mortgage-calculation.rto';
import { RequestWithUser } from '../auth/interfaces/request-with-user.interface';

@Controller('mortgage-profiles')
export class MortgageProfilesController {
  constructor(private readonly mortgageService: MortgageService) {}

  @JwtAuth()
  @Post()
  async createMortgageProfile(
    @Req() req: RequestWithUser,
    @Body() dto: CreateMortgageProfileDto
  ): Promise<MortgageCalculationRto> {
    const userId = req.user.tgId;

    return this.mortgageService.createMortgageCalculation(userId, dto);
  }
}
