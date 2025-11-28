import { IsEnum } from 'class-validator';
import { MortgageCalculationDto } from '../../mortgage-calculations/dto/mortgage-calculation.dto';
import { PropertyType } from '../types/types';

export class CreateMortgageProfileDto extends MortgageCalculationDto {
  @IsEnum(PropertyType)
  propertyType: PropertyType;
}
