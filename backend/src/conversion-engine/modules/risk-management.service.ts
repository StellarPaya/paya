import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { TokenType, Chain } from '../entities/conversion.entity';

interface PositionLimit {
  maxTradeSize: number;
  dailyVolumeLimit: number;
  concentrationLimit: number;
  merchantId: string;
}

interface CircuitBreaker {
  enabled: boolean;
  threshold: number;
  cooldownPeriod: number;
  lastTriggered: Date;
}

interface RiskAssessment {
  approved: boolean;
  reasons: string[];
  riskLevel: 'LOW' | 'MEDIUM' | 'HIGH' | 'EXTREME';
  recommendedActions: string[];
}

@Injectable()
export class RiskManagementService {
  private readonly logger = new Logger(RiskManagementService.name);
  private positionLimits = new Map<string, PositionLimit>();
  private dailyVolumes = new Map<string, number>();
  private circuitBreakers = new Map<string, CircuitBreaker>();
  private lastResetDate = new Date();

  constructor(private configService: ConfigService) {
    this.initializeDefaultLimits();
    this.initializeCircuitBreakers();
  }

  async assessRisk(
    merchantId: string,
    sourceToken: TokenType,
    targetToken: TokenType,
    amount: number,
  ): Promise<RiskAssessment> {
    const reasons: string[] = [];
    const recommendedActions: string[] = [];
    let riskLevel: 'LOW' | 'MEDIUM' | 'HIGH' | 'EXTREME' = 'LOW';

    // Check position limits
    const positionCheck = this.checkPositionLimits(merchantId, amount);
    if (!positionCheck.approved) {
      reasons.push(...positionCheck.reasons);
      riskLevel = this.increaseRiskLevel(riskLevel, positionCheck.riskLevel);
    }

    // Check daily volume limits
    const volumeCheck = this.checkDailyVolume(merchantId, amount);
    if (!volumeCheck.approved) {
      reasons.push(...volumeCheck.reasons);
      recommendedActions.push('Reduce trade size or wait for daily reset');
      riskLevel = this.increaseRiskLevel(riskLevel, volumeCheck.riskLevel);
    }

    // Check concentration limits
    const concentrationCheck = this.checkConcentration(merchantId, sourceToken, targetToken);
    if (!concentrationCheck.approved) {
      reasons.push(...concentrationCheck.reasons);
      recommendedActions.push('Diversify token exposure');
      riskLevel = this.increaseRiskLevel(riskLevel, concentrationCheck.riskLevel);
    }

    // Check circuit breakers
    const circuitBreakerCheck = this.checkCircuitBreakers(sourceToken, targetToken);
    if (!circuitBreakerCheck.approved) {
      reasons.push(...circuitBreakerCheck.reasons);
      recommendedActions.push('Wait for circuit breaker cooldown');
      riskLevel = 'EXTREME';
    }

    // Check volatility
    const volatilityCheck = await this.checkVolatility(sourceToken, targetToken);
    if (!volatilityCheck.approved) {
      reasons.push(...volatilityCheck.reasons);
      recommendedActions.push('Increase slippage tolerance or wait for market stabilization');
      riskLevel = this.increaseRiskLevel(riskLevel, volatilityCheck.riskLevel);
    }

    const approved = reasons.length === 0;

    if (!approved) {
      this.logger.warn(`Risk assessment failed for merchant ${merchantId}: ${reasons.join(', ')}`);
    }

    return {
      approved,
      reasons,
      riskLevel,
      recommendedActions,
    };
  }

  async executeTrade(
    merchantId: string,
    sourceToken: TokenType,
    targetToken: TokenType,
    amount: number,
  ): Promise<{ approved: boolean; reason?: string }> {
    const assessment = await this.assessRisk(merchantId, sourceToken, targetToken, amount);

    if (!assessment.approved) {
      return {
        approved: false,
        reason: assessment.reasons.join('; '),
      };
    }

    // Update daily volume
    this.updateDailyVolume(merchantId, amount);

    return { approved: true };
  }

  private checkPositionLimits(merchantId: string, amount: number): {
    approved: boolean;
    reasons: string[];
    riskLevel: 'LOW' | 'MEDIUM' | 'HIGH' | 'EXTREME';
  } {
    const limits = this.positionLimits.get(merchantId) || this.getDefaultLimits(merchantId);

    if (amount > limits.maxTradeSize) {
      return {
        approved: false,
        reasons: [`Trade size ${amount} exceeds maximum ${limits.maxTradeSize}`],
        riskLevel: 'HIGH',
      };
    }

    return { approved: true, reasons: [], riskLevel: 'LOW' };
  }

  private checkDailyVolume(merchantId: string, amount: number): {
    approved: boolean;
    reasons: string[];
    riskLevel: 'LOW' | 'MEDIUM' | 'HIGH' | 'EXTREME';
  } {
    this.resetDailyVolumesIfNeeded();

    const limits = this.positionLimits.get(merchantId) || this.getDefaultLimits(merchantId);
    const currentVolume = this.dailyVolumes.get(merchantId) || 0;
    const newVolume = currentVolume + amount;

    if (newVolume > limits.dailyVolumeLimit) {
      return {
        approved: false,
        reasons: [
          `Daily volume ${newVolume} would exceed limit ${limits.dailyVolumeLimit}`,
        ],
        riskLevel: 'HIGH',
      };
    }

    return { approved: true, reasons: [], riskLevel: 'LOW' };
  }

  private checkConcentration(
    merchantId: string,
    sourceToken: TokenType,
    targetToken: TokenType,
  ): {
    approved: boolean;
    reasons: string[];
    riskLevel: 'LOW' | 'MEDIUM' | 'HIGH' | 'EXTREME';
  } {
    const limits = this.positionLimits.get(merchantId) || this.getDefaultLimits(merchantId);

    // In production, this would check actual concentration from database
    // For now, return approved
    return { approved: true, reasons: [], riskLevel: 'LOW' };
  }

  private checkCircuitBreakers(sourceToken: TokenType, targetToken: TokenType): {
    approved: boolean;
    reasons: string[];
    riskLevel: 'LOW' | 'MEDIUM' | 'HIGH' | 'EXTREME';
  } {
    const key = `${sourceToken}-${targetToken}`;
    const breaker = this.circuitBreakers.get(key);

    if (breaker?.enabled) {
      const cooldownRemaining = Date.now() - breaker.lastTriggered.getTime();
      if (cooldownRemaining < breaker.cooldownPeriod) {
        return {
          approved: false,
          reasons: [
            `Circuit breaker active for ${sourceToken}/${targetToken}. Cooldown remaining: ${Math.ceil((breaker.cooldownPeriod - cooldownRemaining) / 1000)}s`,
          ],
          riskLevel: 'EXTREME',
        };
      } else {
        // Reset circuit breaker
        breaker.enabled = false;
        this.circuitBreakers.set(key, breaker);
      }
    }

    return { approved: true, reasons: [], riskLevel: 'LOW' };
  }

  private async checkVolatility(sourceToken: TokenType, targetToken: TokenType): Promise<{
    approved: boolean;
    reasons: string[];
    riskLevel: 'LOW' | 'MEDIUM' | 'HIGH' | 'EXTREME';
  }> {
    // In production, this would fetch real volatility data
    const volatilityMap: Record<TokenType, number> = {
      [TokenType.BTC]: 0.03,
      [TokenType.ETH]: 0.04,
      [TokenType.USDC]: 0.001,
      [TokenType.USDT]: 0.001,
    };

    const volatility = Math.max(
      volatilityMap[sourceToken] || 0.02,
      volatilityMap[targetToken] || 0.02,
    );

    const threshold = this.configService.get('VOLATILITY_THRESHOLD', 0.05);

    if (volatility > threshold) {
      return {
        approved: false,
        reasons: [`Volatility ${volatility} exceeds threshold ${threshold}`],
        riskLevel: 'MEDIUM',
      };
    }

    return { approved: true, reasons: [], riskLevel: 'LOW' };
  }

  private updateDailyVolume(merchantId: string, amount: number): void {
    this.resetDailyVolumesIfNeeded();
    const currentVolume = this.dailyVolumes.get(merchantId) || 0;
    this.dailyVolumes.set(merchantId, currentVolume + amount);
  }

  private resetDailyVolumesIfNeeded(): void {
    const today = new Date();
    if (today.toDateString() !== this.lastResetDate.toDateString()) {
      this.dailyVolumes.clear();
      this.lastResetDate = today;
    }
  }

  private triggerCircuitBreaker(sourceToken: TokenType, targetToken: TokenType): void {
    const key = `${sourceToken}-${targetToken}`;
    const breaker = this.circuitBreakers.get(key) || {
      enabled: false,
      threshold: 0.1,
      cooldownPeriod: 300000, // 5 minutes
      lastTriggered: new Date(),
    };

    breaker.enabled = true;
    breaker.lastTriggered = new Date();
    this.circuitBreakers.set(key, breaker);

    this.logger.warn(`Circuit breaker triggered for ${sourceToken}/${targetToken}`);
  }

  private increaseRiskLevel(
    current: 'LOW' | 'MEDIUM' | 'HIGH' | 'EXTREME',
    newLevel: 'LOW' | 'MEDIUM' | 'HIGH' | 'EXTREME',
  ): 'LOW' | 'MEDIUM' | 'HIGH' | 'EXTREME' {
    const levels = ['LOW', 'MEDIUM', 'HIGH', 'EXTREME'];
    const currentIndex = levels.indexOf(current);
    const newIndex = levels.indexOf(newLevel);
    return levels[Math.max(currentIndex, newIndex)] as any;
  }

  private initializeDefaultLimits(): void {
    const defaultLimits: PositionLimit = {
      maxTradeSize: 100000, // $100k
      dailyVolumeLimit: 1000000, // $1M
      concentrationLimit: 0.5, // 50%
      merchantId: 'default',
    };
    this.positionLimits.set('default', defaultLimits);
  }

  private initializeCircuitBreakers(): void {
    const tokens: TokenType[] = [TokenType.BTC, TokenType.ETH, TokenType.USDC, TokenType.USDT];
    tokens.forEach((source) => {
      tokens.forEach((target) => {
        if (source !== target) {
          this.circuitBreakers.set(`${source}-${target}`, {
            enabled: false,
            threshold: 0.1,
            cooldownPeriod: 300000,
            lastTriggered: new Date(),
          });
        }
      });
    });
  }

  private getDefaultLimits(merchantId: string): PositionLimit {
    return this.positionLimits.get('default') || {
      maxTradeSize: 100000,
      dailyVolumeLimit: 1000000,
      concentrationLimit: 0.5,
      merchantId,
    };
  }

  setMerchantLimits(merchantId: string, limits: Partial<PositionLimit>): void {
    const current = this.positionLimits.get(merchantId) || this.getDefaultLimits(merchantId);
    this.positionLimits.set(merchantId, { ...current, ...limits, merchantId });
  }

  getMerchantLimits(merchantId: string): PositionLimit {
    return this.positionLimits.get(merchantId) || this.getDefaultLimits(merchantId);
  }

  getDailyVolume(merchantId: string): number {
    this.resetDailyVolumesIfNeeded();
    return this.dailyVolumes.get(merchantId) || 0;
  }

  async monitorAndAlert(): Promise<void> {
    // Check for unusual patterns and send alerts
    this.logger.log('Running risk monitoring and alerting');
    
    // In production, this would:
    // - Monitor for unusual trading patterns
    // - Check for approaching limits
    // - Send alerts to administrators
    // - Trigger automatic safeguards
  }
}
