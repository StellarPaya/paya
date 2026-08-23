import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { TokenType, Chain } from '../entities/conversion.entity';

interface SlippageCalculation {
  expectedSlippage: number;
  slippageTolerance: number;
  minAmount: number;
  maxAmount: number;
  riskLevel: 'LOW' | 'MEDIUM' | 'HIGH' | 'EXTREME';
  warnings: string[];
}

interface PoolDepth {
  token: TokenType;
  chain: Chain;
  liquidity: number;
  volume24h: number;
  volatility: number;
}

@Injectable()
export class SlippageProtectionService {
  private readonly logger = new Logger(SlippageProtectionService.name);
  private poolDepthCache = new Map<string, { data: PoolDepth; expiresAt: Date }>();
  private readonly CACHE_TTL = 60000; // 1 minute

  constructor(private configService: ConfigService) {}

  async calculateSlippage(
    sourceToken: TokenType,
    sourceChain: Chain,
    targetToken: TokenType,
    targetChain: Chain,
    amount: number,
    expectedPrice: number,
    userTolerance: number,
  ): Promise<SlippageCalculation> {
    const poolDepth = await this.getPoolDepth(sourceToken, sourceChain, amount);
    const volatility = await this.getVolatility(sourceToken, sourceChain);
    
    // Calculate expected slippage based on pool depth
    const expectedSlippage = this.calculateExpectedSlippage(amount, poolDepth.liquidity, volatility);
    
    // Determine dynamic slippage tolerance
    const dynamicTolerance = this.calculateDynamicTolerance(expectedSlippage, volatility, userTolerance);
    
    // Calculate min/max amounts
    const minAmount = amount * (1 - dynamicTolerance / 100);
    const maxAmount = amount * (1 + dynamicTolerance / 100);
    
    // Determine risk level
    const riskLevel = this.assessRiskLevel(expectedSlippage, volatility, poolDepth.liquidity);
    
    // Generate warnings
    const warnings = this.generateWarnings(expectedSlippage, dynamicTolerance, riskLevel, poolDepth);
    
    return {
      expectedSlippage,
      slippageTolerance: dynamicTolerance,
      minAmount,
      maxAmount,
      riskLevel,
      warnings,
    };
  }

  private calculateExpectedSlippage(amount: number, liquidity: number, volatility: number): number {
    // Slippage increases with trade size relative to pool liquidity
    const liquidityRatio = amount / liquidity;
    const baseSlippage = liquidityRatio * 100; // Base slippage from liquidity impact
    
    // Add volatility component
    const volatilityComponent = volatility * 0.5;
    
    // Combine with square root scaling for large trades
    const sizeComponent = Math.sqrt(liquidityRatio) * 10;
    
    return Math.min(baseSlippage + volatilityComponent + sizeComponent, 50); // Cap at 50%
  }

  private calculateDynamicTolerance(
    expectedSlippage: number,
    volatility: number,
    userTolerance: number,
  ): number {
    // Base tolerance is the higher of expected slippage + buffer and user tolerance
    const baseTolerance = Math.max(expectedSlippage * 1.5, userTolerance);
    
    // Add volatility buffer
    const volatilityBuffer = volatility * 2;
    
    // Apply minimum and maximum limits
    const minTolerance = this.configService.get('MIN_SLIPPAGE_TOLERANCE', 0.1);
    const maxTolerance = this.configService.get('MAX_SLIPPAGE_TOLERANCE', 5);
    
    let dynamicTolerance = baseTolerance + volatilityBuffer;
    
    return Math.max(minTolerance, Math.min(dynamicTolerance, maxTolerance));
  }

  private assessRiskLevel(
    expectedSlippage: number,
    volatility: number,
    liquidity: number,
  ): 'LOW' | 'MEDIUM' | 'HIGH' | 'EXTREME' {
    const slippageScore = expectedSlippage / 2; // Normalize to 0-25
    const volatilityScore = volatility * 10; // Normalize to 0-10
    const liquidityScore = liquidity < 100000 ? 10 : liquidity < 1000000 ? 5 : 0;
    
    const totalScore = slippageScore + volatilityScore + liquidityScore;
    
    if (totalScore < 5) return 'LOW';
    if (totalScore < 15) return 'MEDIUM';
    if (totalScore < 25) return 'HIGH';
    return 'EXTREME';
  }

  private generateWarnings(
    expectedSlippage: number,
    tolerance: number,
    riskLevel: string,
    poolDepth: PoolDepth,
  ): string[] {
    const warnings: string[] = [];
    
    if (expectedSlippage > 1) {
      warnings.push(`Expected slippage is high (${expectedSlippage.toFixed(2)}%)`);
    }
    
    if (tolerance > 3) {
      warnings.push(`Slippage tolerance is set high (${tolerance.toFixed(2)}%)`);
    }
    
    if (riskLevel === 'HIGH' || riskLevel === 'EXTREME') {
      warnings.push(`Trade risk level is ${riskLevel}`);
    }
    
    if (poolDepth.liquidity < 100000) {
      warnings.push('Low liquidity in target pool may cause high slippage');
    }
    
    if (poolDepth.volatility > 0.05) {
      warnings.push('High market volatility detected');
    }
    
    return warnings;
  }

  private async getPoolDepth(token: TokenType, chain: Chain, amount: number): Promise<PoolDepth> {
    const cacheKey = `${token}-${chain}`;
    
    const cached = this.poolDepthCache.get(cacheKey);
    if (cached && cached.expiresAt > new Date()) {
      return cached.data;
    }

    // In production, this would fetch real pool depth data from DEX APIs
    // For now, return simulated data
    const poolDepth: PoolDepth = {
      token,
      chain,
      liquidity: this.getSimulatedLiquidity(token, chain),
      volume24h: this.getSimulatedVolume(token, chain),
      volatility: this.getSimulatedVolatility(token, chain),
    };

    this.poolDepthCache.set(cacheKey, {
      data: poolDepth,
      expiresAt: new Date(Date.now() + this.CACHE_TTL),
    });

    return poolDepth;
  }

  private async getVolatility(token: TokenType, chain: Chain): Promise<number> {
    const poolDepth = await this.getPoolDepth(token, chain, 0);
    return poolDepth.volatility;
  }

  private getSimulatedLiquidity(token: TokenType, chain: Chain): number {
    // Simulated liquidity values (in USD)
    const liquidityMap: Record<TokenType, number> = {
      [TokenType.BTC]: 50000000,
      [TokenType.ETH]: 100000000,
      [TokenType.USDC]: 500000000,
      [TokenType.USDT]: 500000000,
    };
    return liquidityMap[token] || 10000000;
  }

  private getSimulatedVolume(token: TokenType, chain: Chain): number {
    // Simulated 24h volume (in USD)
    const volumeMap: Record<TokenType, number> = {
      [TokenType.BTC]: 1000000000,
      [TokenType.ETH]: 2000000000,
      [TokenType.USDC]: 5000000000,
      [TokenType.USDT]: 5000000000,
    };
    return volumeMap[token] || 100000000;
  }

  private getSimulatedVolatility(token: TokenType, chain: Chain): number {
    // Simulated volatility (daily)
    const volatilityMap: Record<TokenType, number> = {
      [TokenType.BTC]: 0.03,
      [TokenType.ETH]: 0.04,
      [TokenType.USDC]: 0.001,
      [TokenType.USDT]: 0.001,
    };
    return volatilityMap[token] || 0.02;
  }

  validateSlippage(actualAmount: number, expectedAmount: number, tolerance: number): boolean {
    const actualSlippage = Math.abs((actualAmount - expectedAmount) / expectedAmount) * 100;
    return actualSlippage <= tolerance;
  }

  calculateMevProtection(amount: number, slippage: number): {
    useFlashbots: boolean;
    usePrivateMempool: boolean;
    maxPriorityFee: string;
  } {
    const isHighValue = amount > 100000; // $100k+
    const isHighSlippage = slippage > 1;

    return {
      useFlashbots: isHighValue && isHighSlippage,
      usePrivateMempool: isHighValue,
      maxPriorityFee: isHighValue ? '5000000000' : '2000000000', // 5 Gwei vs 2 Gwei
    };
  }
}
