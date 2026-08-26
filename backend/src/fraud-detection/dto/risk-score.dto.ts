import { IsNumber, IsString, IsEnum, IsArray, IsObject, ValidateNested, IsOptional, IsDateString } from 'class-validator';
import { Type } from 'class-transformer';

export enum RiskTier {
  LOW = 'low',
  MEDIUM = 'medium',
  HIGH = 'high',
  CRITICAL = 'critical'
}

export class RiskFactor {
  @IsString()
  name: string;

  @IsNumber()
  score: number;

  @IsNumber()
  weight: number;

  @IsString()
  description: string;

  value: any;
}

export class RiskScore {
  @IsNumber()
  overallScore: number;

  @IsEnum(RiskTier)
  riskTier: RiskTier;

  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => RiskFactor)
  factors: RiskFactor[];

  @IsNumber()
  confidence: number;

  @IsDateString()
  timestamp: Date;
}

export class CalculateRiskScoreDto {
  @IsString()
  paymentId: string;

  @IsNumber()
  amount: number;

  @IsString()
  merchantId: string;

  @IsString()
  customerId: string;

  @IsOptional()
  @IsString()
  ipAddress?: string;

  @IsOptional()
  @IsString()
  userAgent?: string;

  @IsOptional()
  @IsString()
  deviceFingerprint?: string;

  @IsOptional()
  @IsString()
  country?: string;

  @IsOptional()
  @IsString()
  region?: string;
}

export class UpdateThresholdsDto {
  @IsString()
  merchantId: string;

  @IsNumber()
  lowThreshold: number;

  @IsNumber()
  mediumThreshold: number;

  @IsNumber()
  highThreshold: number;

  @IsNumber()
  criticalThreshold: number;
}

export class FraudStatistics {
  @IsNumber()
  totalPayments: number;

  @IsNumber()
  flaggedPayments: number;

  @IsNumber()
  confirmedFraud: number;

  @IsNumber()
  falsePositives: number;

  @IsNumber()
  fraudRate: number;

  @IsNumber()
  falsePositiveRate: number;
}

export class DateRange {
  @IsDateString()
  startDate: Date;

  @IsDateString()
  endDate: Date;
}