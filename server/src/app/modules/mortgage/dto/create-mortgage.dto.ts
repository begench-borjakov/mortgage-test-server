import { IsEnum } from 'class-validator';
import { MortgageCalculationDto } from './mortgage-calculation.dto';

export enum PropertyType {
  APARTMENT_IN_NEW_BUILDING = 'apartment_in_new_building',
  APARTMENT_IN_SECONDARY_BUILDING = 'apartment_in_secondary_building',
  HOUSE = 'house',
  HOUSE_WITH_LAND_PLOT = 'house_with_land_plot',
  LAND_PLOT = 'land_plot',
  OTHER = 'other'
}

export class CreateMortgageProfileDto extends MortgageCalculationDto {
  @IsEnum(PropertyType)
  propertyType: PropertyType;
}
