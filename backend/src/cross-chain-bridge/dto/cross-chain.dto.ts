import { IsString, IsNumber, IsEnum, IsOptional, IsDateString } from 'class-validator';

export enum ChainType {
  STELLAR = 'stellar',
  ETHEREUM = 'ethereum',
  POLYGON = 'polygon',
  BSC = 'bsc',
  SOLANA = 'solana',
}

export enum SwapStatus {
  INITIATED = 'initiated',
  COMPLETED = 'completed',
  REFUNDED = 'refunded',
  EXPIRED = 'expired',
}

export class SwapDto {
  @IsString()
  swapId: string;

  @IsString()
  sourceChain: ChainType;

  @IsString()
  targetChain: ChainType;

  @IsString()
  initiatorAddress: string;

  @IsString()
  recipientAddress: string;

  @IsNumber()
  amount: number;

  @IsString()
  asset: string;

  @IsString()
  hashLock: string;

  @IsNumber()
  timeLock: number;

  @IsEnum(SwapStatus)
  status: SwapStatus;

  @IsDateString()
  createdAt: Date;

  @IsOptional()
  @IsDateString()
  completedAt?: Date;

  @IsOptional()
  @IsDateString()
  refundedAt?: Date;
}

export class InitiateSwapDto {
  @IsString()
  swapId: string;

  @IsEnum(ChainType)
  sourceChain: ChainType;

  @IsEnum(ChainType)
  targetChain: ChainType;

  @IsString()
  initiatorAddress: string;

  @IsString()
  recipientAddress: string;

  @IsNumber()
  amount: number;

  @IsString()
  asset: string;

  @IsString()
  hashLock: string;

  @IsNumber()
  timeLock: number;

  @IsString()
  targetAddress: string;
}

export class CompleteSwapDto {
  @IsString()
  swapId: string;

  @IsString()
  secret: string;

  @IsEnum(ChainType)
  targetChain: ChainType;
}

export class RefundSwapDto {
  @IsString()
  swapId: string;

  @IsEnum(ChainType)
  sourceChain: ChainType;
}

export class RelayRequestDto {
  @IsString()
  swapId: string;

  @IsString()
  secret?: string;

  @IsEnum(ChainType)
  targetChain: ChainType;

  @IsString()
  transactionType: 'complete' | 'refund';
}