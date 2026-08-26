import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { RiskScoreEntity } from './entities/risk-score.entity';
import { FraudIncidentEntity } from './entities/fraud-incident.entity';
import { CalculateRiskScoreDto, RiskScore, RiskFactor, RiskTier, UpdateThresholdsDto, FraudStatistics, DateRange } from './dto/risk-score.dto';

@Injectable()
export class RiskScoringService {
  private riskThresholds = new Map<string, { low: number; medium: number; high: number; critical: number }>();

  constructor(
    @InjectRepository(RiskScoreEntity)
    private riskScoreRepository: Repository<RiskScoreEntity>,
    @InjectRepository(FraudIncidentEntity)
    private fraudIncidentRepository: Repository<FraudIncidentEntity>,
  ) {
    // Initialize default thresholds
    this.riskThresholds.set('default', { low: 30, medium: 60, high: 80, critical: 100 });
  }

  async calculateRiskScore(dto: CalculateRiskScoreDto): Promise<RiskScore> {
    const factors = await this.calculateRiskFactors(dto);
    const overallScore = this.calculateOverallScore(factors);
    const riskTier = this.determineRiskTier(overallScore, dto.merchantId);
    const confidence = this.calculateConfidence(factors);

    const riskScore: RiskScore = {
      overallScore,
      riskTier,
      factors,
      confidence,
      timestamp: new Date(),
    };

    // Save to database
    const entity = this.riskScoreRepository.create({
      payment_id: dto.paymentId,
      overall_score: overallScore,
      risk_tier: riskTier,
      factors: factors,
      confidence: confidence,
    });
    await this.riskScoreRepository.save(entity);

    return riskScore;
  }

  private async calculateRiskFactors(dto: CalculateRiskScoreDto): Promise<RiskFactor[]> {
    const factors: RiskFactor[] = [];

    // Transaction velocity factor
    const velocityScore = await this.calculateTransactionVelocity(dto.customerId);
    factors.push({
      name: 'transaction_velocity',
      score: velocityScore,
      weight: 0.2,
      description: 'Rate of recent transactions compared to user baseline',
      value: velocityScore,
    });

    // Amount anomaly factor
    const amountScore = this.calculateAmountAnomaly(dto.amount, dto.customerId);
    factors.push({
      name: 'amount_anomaly',
      score: amountScore,
      weight: 0.25,
      description: 'Deviation of transaction amount from user historical average',
      value: { amount: dto.amount, score: amountScore },
    });

    // Geographic pattern factor
    const geoScore = this.calculateGeographicRisk(dto.ipAddress, dto.country, dto.customerId);
    factors.push({
      name: 'geographic_risk',
      score: geoScore,
      weight: 0.15,
      description: 'Risk based on geographic location and travel patterns',
      value: { country: dto.country, score: geoScore },
    });

    // Device fingerprinting factor
    const deviceScore = this.calculateDeviceRisk(dto.deviceFingerprint, dto.userAgent, dto.customerId);
    factors.push({
      name: 'device_risk',
      score: deviceScore,
      weight: 0.15,
      description: 'Risk based on device fingerprint and browser characteristics',
      value: { deviceFingerprint: dto.deviceFingerprint, score: deviceScore },
    });

    // Time pattern factor
    const timeScore = this.calculateTimePatternRisk(dto.customerId);
    factors.push({
      name: 'time_pattern',
      score: timeScore,
      weight: 0.1,
      description: 'Risk based on transaction timing patterns',
      value: { score: timeScore },
    });

    // Merchant risk factor
    const merchantScore = await this.calculateMerchantRisk(dto.merchantId);
    factors.push({
      name: 'merchant_risk',
      score: merchantScore,
      weight: 0.15,
      description: 'Historical fraud rate for this merchant',
      value: { merchantId: dto.merchantId, score: merchantScore },
    });

    return factors;
  }

  private calculateOverallScore(factors: RiskFactor[]): number {
    let weightedSum = 0;
    let totalWeight = 0;

    for (const factor of factors) {
      weightedSum += factor.score * factor.weight;
      totalWeight += factor.weight;
    }

    return Math.round((weightedSum / totalWeight) * 100) / 100;
  }

  private determineRiskTier(score: number, merchantId: string): RiskTier {
    const thresholds = this.riskThresholds.get(merchantId) || this.riskThresholds.get('default')!;
    
    if (score <= thresholds.low) return RiskTier.LOW;
    if (score <= thresholds.medium) return RiskTier.MEDIUM;
    if (score <= thresholds.high) return RiskTier.HIGH;
    return RiskTier.CRITICAL;
  }

  private calculateConfidence(factors: RiskFactor[]): number {
    // Higher confidence when more factors are available and have clear scores
    const factorCount = factors.length;
    const avgScore = factors.reduce((sum, f) => sum + f.score, 0) / factorCount;
    
    // Base confidence on number of factors and score clarity
    let confidence = 0.5 + (factorCount * 0.05);
    
    // Adjust based on score clarity (extreme scores give higher confidence)
    if (avgScore > 70 || avgScore < 30) {
      confidence += 0.2;
    }
    
    return Math.min(confidence, 0.95);
  }

  private async calculateTransactionVelocity(customerId: string): Promise<number> {
    // Get recent transaction count for this customer
    const recentHours = 1;
    const cutoffDate = new Date(Date.now() - recentHours * 60 * 60 * 1000);
    
    const recentCount = await this.riskScoreRepository
      .createQueryBuilder('risk_score')
      .innerJoin('risk_score.payment', 'payment')
      .where('payment.customer_id = :customerId', { customerId })
      .andWhere('payment.created_at > :cutoffDate', { cutoffDate })
      .getCount();

    // Simple velocity scoring: more transactions = higher risk
    if (recentCount === 0) return 10;
    if (recentCount <= 2) return 20;
    if (recentCount <= 5) return 40;
    if (recentCount <= 10) return 60;
    return 80;
  }

  private calculateAmountAnomaly(amount: number, customerId: string): number {
    // In a real implementation, this would query historical transactions
    // For now, use simple thresholds
    if (amount < 100) return 10;
    if (amount < 1000) return 20;
    if (amount < 10000) return 40;
    if (amount < 100000) return 60;
    return 80;
  }

  private calculateGeographicRisk(ipAddress: string | undefined, country: string | undefined, customerId: string): number {
    // High-risk countries list (simplified)
    const highRiskCountries = ['XX', 'YY', 'ZZ']; // Replace with actual high-risk countries
    
    if (!country) return 30; // Unknown location
    if (highRiskCountries.includes(country)) return 80;
    
    return 20; // Normal risk
  }

  private calculateDeviceRisk(deviceFingerprint: string | undefined, userAgent: string | undefined, customerId: string): number {
    // Check for suspicious user agents
    const suspiciousPatterns = ['bot', 'crawler', 'spider', 'curl', 'wget'];
    
    if (userAgent && suspiciousPatterns.some(pattern => userAgent.toLowerCase().includes(pattern))) {
      return 90;
    }
    
    if (!deviceFingerprint) return 40; // No device fingerprint
    
    return 15; // Normal device
  }

  private calculateTimePatternRisk(customerId: string): number {
    const hour = new Date().getHours();
    
    // Unusual hours (midnight to 6 AM) might be higher risk
    if (hour >= 0 && hour < 6) return 35;
    if (hour >= 6 && hour < 12) return 20;
    if (hour >= 12 && hour < 18) return 15;
    return 25; // Evening
  }

  private async calculateMerchantRisk(merchantId: string): Promise<number> {
    // Get fraud incidents for this merchant
    const fraudCount = await this.fraudIncidentRepository
      .createQueryBuilder('fraud')
      .innerJoin('fraud.payment', 'payment')
      .where('payment.merchant_id = :merchantId', { merchantId })
      .andWhere('fraud.status = :status', { status: 'confirmed' })
      .getCount();

    // Simple merchant risk scoring
    if (fraudCount === 0) return 10;
    if (fraudCount <= 2) return 30;
    if (fraudCount <= 5) return 50;
    return 70;
  }

  async getRiskFactors(paymentId: string): Promise<RiskFactor[]> {
    const riskScore = await this.riskScoreRepository.findOne({
      where: { payment_id: paymentId },
    });

    if (!riskScore) {
      throw new NotFoundException(`Risk score for payment ${paymentId} not found`);
    }

    return riskScore.factors as RiskFactor[];
  }

  async updateThresholds(merchantId: string, dto: UpdateThresholdsDto): Promise<void> {
    this.riskThresholds.set(merchantId, {
      low: dto.lowThreshold,
      medium: dto.mediumThreshold,
      high: dto.highThreshold,
      critical: dto.criticalThreshold,
    });
  }

  async getFraudStatistics(period: DateRange): Promise<FraudStatistics> {
    const totalPayments = await this.riskScoreRepository
      .createQueryBuilder('risk_score')
      .where('risk_score.created_at >= :startDate', { startDate: period.startDate })
      .andWhere('risk_score.created_at <= :endDate', { endDate: period.endDate })
      .getCount();

    const flaggedPayments = await this.riskScoreRepository
      .createQueryBuilder('risk_score')
      .where('risk_score.created_at >= :startDate', { startDate: period.startDate })
      .andWhere('risk_score.created_at <= :endDate', { endDate: period.endDate })
      .andWhere('risk_score.risk_tier IN (:...riskTiers)', { riskTiers: ['high', 'critical'] })
      .getCount();

    const confirmedFraud = await this.fraudIncidentRepository
      .createQueryBuilder('fraud')
      .where('fraud.detected_at >= :startDate', { startDate: period.startDate })
      .andWhere('fraud.detected_at <= :endDate', { endDate: period.endDate })
      .andWhere('fraud.status = :status', { status: 'confirmed' })
      .getCount();

    const falsePositives = await this.fraudIncidentRepository
      .createQueryBuilder('fraud')
      .where('fraud.detected_at >= :startDate', { startDate: period.startDate })
      .andWhere('fraud.detected_at <= :endDate', { endDate: period.endDate })
      .andWhere('fraud.status = :status', { status: 'false_positive' })
      .getCount();

    const fraudRate = totalPayments > 0 ? (confirmedFraud / totalPayments) * 100 : 0;
    const falsePositiveRate = flaggedPayments > 0 ? (falsePositives / flaggedPayments) * 100 : 0;

    return {
      totalPayments,
      flaggedPayments,
      confirmedFraud,
      falsePositives,
      fraudRate: Math.round(fraudRate * 100) / 100,
      falsePositiveRate: Math.round(falsePositiveRate * 100) / 100,
    };
  }
}