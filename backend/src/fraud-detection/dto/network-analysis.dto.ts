import { IsDateString, IsOptional } from 'class-validator';

export class TimeRangeDto {
  @IsDateString()
  startDate: Date;

  @IsDateString()
  endDate: Date;
}

export class CalculateSimilarityDto {
  entity1: string;
  entity2: string;
}