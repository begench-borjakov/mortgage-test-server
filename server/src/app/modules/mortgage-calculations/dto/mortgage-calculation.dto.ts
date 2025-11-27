import { IsBoolean, IsNumber, IsOptional, Min, Max } from 'class-validator';

export class MortgageCalculationDto {
  @IsNumber()
  @Min(1)
  propertyPrice: number;

  @IsNumber()
  @Min(0)
  downPaymentAmount: number;

  @IsOptional()
  @IsNumber()
  @Min(0)
  matCapitalAmount?: number;

  @IsBoolean()
  matCapitalIncluded: boolean;

  @IsNumber()
  @Min(1)
  @Max(50)
  loanTermYears: number;

  @IsNumber()
  @Min(0.01)
  @Max(100)
  interestRate: number;
}
