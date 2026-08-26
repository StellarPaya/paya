import { IsString, IsNumber, IsOptional, IsDateString } from 'class-validator';

export class PriceDto {
  @IsString()
  baseAsset: string;

  @IsString()
  quoteAsset: string;

  @IsNumber()
  price: number;

  @IsString()
  chain: string;

  @IsDateString()
  timestamp: Date;

  @IsString()
  source: string;
}

export class GetPriceDto {
  @IsString()
  baseAsset: string;

  @IsString()
  quoteAsset: string;

  @IsString()
  chain: string;
}

export class GetTWAPDto {
  @IsString()
  baseAsset: string;

  @IsString()
  quoteAsset: string;

  @IsNumber()
  period: number; // in seconds
}

export class CheckPriceDeviationDto {
  @IsString()
  asset: string;

  @IsNumber()
  threshold: number; // percentage threshold
}

export class GetHistoricalPricesDto {
  @IsString()
  asset: string;

  @IsDateString()
  from: Date;

  @IsDateString()
  to: Date;
}