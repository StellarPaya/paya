import { IsEnum, IsNumber, IsString, IsOptional, Min, Max, IsUUID } from 'class-validator';
import { TokenType, Chain, DexType, BridgeType } from '../entities/conversion.entity';

export class CreateConversionDto {
  @IsUUID()
  merchantId: string;

  @IsEnum(TokenType)
  sourceToken: TokenType;

  @IsEnum(Chain)
  sourceChain: Chain;

  @IsNumber()
  @Min(0)
  sourceAmount: number;

  @IsEnum(TokenType)
  targetToken: TokenType;

  @IsEnum(Chain)
  targetChain: Chain;

  @IsNumber()
  @Min(0)
  @Max(100)
  slippageTolerance: number;

  @IsEnum(DexType, { each: true })
  @IsOptional()
  preferredDexes?: DexType[];

  @IsEnum(BridgeType, { each: true })
  @IsOptional()
  preferredBridges?: BridgeType[];

  @IsNumber()
  @Min(0)
  @Max(100)
  @IsOptional()
  maxSlippage?: number;

  @IsString()
  @IsOptional()
  priceSource?: string;
}
