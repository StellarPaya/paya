import { IsEnum, IsNumber, IsString, Min, Max } from 'class-validator';
import { TokenType, Chain } from '../entities/conversion.entity';

export class PriceQuoteDto {
  @IsEnum(TokenType)
  sourceToken: TokenType;

  @IsEnum(Chain)
  sourceChain: Chain;

  @IsEnum(TokenType)
  targetToken: TokenType;

  @IsEnum(Chain)
  targetChain: Chain;

  @IsNumber()
  @Min(0)
  amount: number;

  @IsNumber()
  @Min(0)
  @Max(100)
  @IsOptional()
  slippageTolerance?: number;
}

export class PriceQuoteResponseDto {
  sourceToken: TokenType;
  sourceChain: Chain;
  targetToken: TokenType;
  targetChain: Chain;
  amount: number;
  expectedAmount: number;
  price: number;
  slippageTolerance: number;
  minAmount: number;
  priceSources: PriceSource[];
  averagePrice: number;
  priceDeviation: number;
  timestamp: Date;
}

export class PriceSource {
  name: string;
  price: number;
  confidence: number;
  timestamp: Date;
}
