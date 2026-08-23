import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { HttpService } from '@nestjs/axios';
import { firstValueFrom } from 'rxjs';
import { TokenType, Chain } from '../entities/conversion.entity';
import { PriceSource } from '../dto/price-quote.dto';

interface PriceData {
  price: number;
  source: string;
  timestamp: Date;
  confidence: number;
}

@Injectable()
export class PriceDiscoveryService {
  private readonly logger = new Logger(PriceDiscoveryService.name);
  private priceCache = new Map<string, { data: PriceData[]; expiresAt: Date }>();
  private readonly CACHE_TTL = 30000; // 30 seconds

  constructor(
    private configService: ConfigService,
    private httpService: HttpService,
  ) {}

  async getBestPrice(
    sourceToken: TokenType,
    sourceChain: Chain,
    targetToken: TokenType,
    targetChain: Chain,
    amount: number,
  ): Promise<{ price: number; sources: PriceSource[] }> {
    const cacheKey = `${sourceToken}-${sourceChain}-${targetToken}-${targetChain}-${amount}`;
    
    // Check cache
    const cached = this.priceCache.get(cacheKey);
    if (cached && cached.expiresAt > new Date()) {
      return this.calculateAveragePrice(cached.data);
    }

    // Fetch from multiple sources
    const pricePromises = [
      this.fetchFromDexAggregators(sourceToken, sourceChain, targetToken, targetChain, amount),
      this.fetchFromCex(sourceToken, targetToken),
      this.fetchFromOracles(sourceToken, targetToken),
    ];

    const results = await Promise.allSettled(pricePromises);
    const priceData: PriceData[] = [];

    results.forEach((result, index) => {
      if (result.status === 'fulfilled' && result.value) {
        priceData.push(...result.value);
      } else {
        this.logger.warn(`Price source ${index} failed: ${result.reason}`);
      }
    });

    if (priceData.length === 0) {
      throw new Error('No price data available from any source');
    }

    // Cache the results
    this.priceCache.set(cacheKey, {
      data: priceData,
      expiresAt: new Date(Date.now() + this.CACHE_TTL),
    });

    return this.calculateAveragePrice(priceData);
  }

  private calculateAveragePrice(priceData: PriceData[]): { price: number; sources: PriceSource[] } {
    // Remove outliers using IQR method
    const prices = priceData.map((d) => d.price).sort((a, b) => a - b);
    const q1 = prices[Math.floor(prices.length * 0.25)];
    const q3 = prices[Math.floor(prices.length * 0.75)];
    const iqr = q3 - q1;
    const lowerBound = q1 - 1.5 * iqr;
    const upperBound = q3 + 1.5 * iqr;

    const filteredPrices = priceData.filter(
      (d) => d.price >= lowerBound && d.price <= upperBound,
    );

    if (filteredPrices.length === 0) {
      // Fallback to median if all are outliers
      const median = prices[Math.floor(prices.length / 2)];
      return {
        price: median,
        sources: priceData.map((d) => ({
          name: d.source,
          price: d.price,
          confidence: d.confidence,
          timestamp: d.timestamp,
        })),
      };
    }

    // Weighted average based on confidence
    const totalConfidence = filteredPrices.reduce((sum, d) => sum + d.confidence, 0);
    const weightedAverage =
      filteredPrices.reduce((sum, d) => sum + d.price * d.confidence, 0) / totalConfidence;

    return {
      price: weightedAverage,
      sources: filteredPrices.map((d) => ({
        name: d.source,
        price: d.price,
        confidence: d.confidence,
        timestamp: d.timestamp,
      })),
    };
  }

  private async fetchFromDexAggregators(
    sourceToken: TokenType,
    sourceChain: Chain,
    targetToken: TokenType,
    targetChain: Chain,
    amount: number,
  ): Promise<PriceData[]> {
    const results: PriceData[] = [];

    try {
      // 1inch API
      const oneInchPrice = await this.fetchFrom1inch(sourceToken, sourceChain, targetToken, amount);
      if (oneInchPrice) {
        results.push(oneInchPrice);
      }
    } catch (error) {
      this.logger.warn('1inch API failed', error);
    }

    try {
      // Jupiter API (Solana)
      if (sourceChain === Chain.SOLANA || targetChain === Chain.SOLANA) {
        const jupiterPrice = await this.fetchFromJupiter(sourceToken, targetToken, amount);
        if (jupiterPrice) {
          results.push(jupiterPrice);
        }
      }
    } catch (error) {
      this.logger.warn('Jupiter API failed', error);
    }

    try {
      // 0x API
      const zeroXPrice = await this.fetchFrom0x(sourceToken, sourceChain, targetToken, amount);
      if (zeroXPrice) {
        results.push(zeroXPrice);
      }
    } catch (error) {
      this.logger.warn('0x API failed', error);
    }

    return results;
  }

  private async fetchFrom1inch(
    sourceToken: TokenType,
    chain: Chain,
    targetToken: TokenType,
    amount: number,
  ): Promise<PriceData | null> {
    const chainId = this.getChainId(chain);
    const tokenAddress = this.getTokenAddress(sourceToken, chain);

    const url = `https://api.1inch.dev/swap/v6.0/${chainId}/quote`;
    const params = {
      src: tokenAddress,
      dst: this.getTokenAddress(targetToken, chain),
      amount: this.amountToWei(amount, sourceToken),
    };

    try {
      const response = await firstValueFrom(
        this.httpService.get(url, {
          params,
          headers: {
            Authorization: `Bearer ${this.configService.get('1INCH_API_KEY')}`,
          },
        }),
      );

      return {
        price: this.weiToAmount(response.data.dstAmount, targetToken) / amount,
        source: '1inch',
        timestamp: new Date(),
        confidence: 0.9,
      };
    } catch (error) {
      this.logger.error('1inch fetch error', error);
      return null;
    }
  }

  private async fetchFromJupiter(
    sourceToken: TokenType,
    targetToken: TokenType,
    amount: number,
  ): Promise<PriceData | null> {
    const url = 'https://quote-api.jup.ag/v6/quote';
    const params = {
      inputMint: this.getTokenAddress(sourceToken, Chain.SOLANA),
      outputMint: this.getTokenAddress(targetToken, Chain.SOLANA),
      amount: this.amountToWei(amount, sourceToken),
    };

    try {
      const response = await firstValueFrom(this.httpService.get(url, { params }));

      return {
        price: this.weiToAmount(response.data.outAmount, targetToken) / amount,
        source: 'Jupiter',
        timestamp: new Date(),
        confidence: 0.85,
      };
    } catch (error) {
      this.logger.error('Jupiter fetch error', error);
      return null;
    }
  }

  private async fetchFrom0x(
    sourceToken: TokenType,
    chain: Chain,
    targetToken: TokenType,
    amount: number,
  ): Promise<PriceData | null> {
    const chainId = this.getChainId(chain);
    const url = `https://api.0x.org/swap/v1/quote`;
    const params = {
      sellToken: this.getTokenAddress(sourceToken, chain),
      buyToken: this.getTokenAddress(targetToken, chain),
      sellAmount: this.amountToWei(amount, sourceToken),
    };

    try {
      const response = await firstValueFrom(
        this.httpService.get(url, {
          params,
          headers: {
            '0x-api-key': this.configService.get('ZEROX_API_KEY'),
          },
        }),
      );

      return {
        price: this.weiToAmount(response.data.buyAmount, targetToken) / amount,
        source: '0x',
        timestamp: new Date(),
        confidence: 0.88,
      };
    } catch (error) {
      this.logger.error('0x fetch error', error);
      return null;
    }
  }

  private async fetchFromCex(sourceToken: TokenType, targetToken: TokenType): Promise<PriceData[]> {
    const results: PriceData[] = [];

    try {
      // Binance
      const binancePrice = await this.fetchFromBinance(sourceToken, targetToken);
      if (binancePrice) {
        results.push(binancePrice);
      }
    } catch (error) {
      this.logger.warn('Binance API failed', error);
    }

    try {
      // Coinbase
      const coinbasePrice = await this.fetchFromCoinbase(sourceToken, targetToken);
      if (coinbasePrice) {
        results.push(coinbasePrice);
      }
    } catch (error) {
      this.logger.warn('Coinbase API failed', error);
    }

    return results;
  }

  private async fetchFromBinance(
    sourceToken: TokenType,
    targetToken: TokenType,
  ): Promise<PriceData | null> {
    const symbol = `${sourceToken}${targetToken}`;
    const url = `https://api.binance.com/api/v3/ticker/price?symbol=${symbol}`;

    try {
      const response = await firstValueFrom(this.httpService.get(url));

      return {
        price: parseFloat(response.data.price),
        source: 'Binance',
        timestamp: new Date(),
        confidence: 0.75,
      };
    } catch (error) {
      this.logger.error('Binance fetch error', error);
      return null;
    }
  }

  private async fetchFromCoinbase(
    sourceToken: TokenType,
    targetToken: TokenType,
  ): Promise<PriceData | null> {
    const url = `https://api.coinbase.com/v2/exchange-rates?currency=${sourceToken}`;

    try {
      const response = await firstValueFrom(this.httpService.get(url));
      const rate = response.data.data.rates[targetToken];

      if (!rate) return null;

      return {
        price: parseFloat(rate),
        source: 'Coinbase',
        timestamp: new Date(),
        confidence: 0.7,
      };
    } catch (error) {
      this.logger.error('Coinbase fetch error', error);
      return null;
    }
  }

  private async fetchFromOracles(sourceToken: TokenType, targetToken: TokenType): Promise<PriceData[]> {
    const results: PriceData[] = [];

    try {
      // Chainlink
      const chainlinkPrice = await this.fetchFromChainlink(sourceToken, targetToken);
      if (chainlinkPrice) {
        results.push(chainlinkPrice);
      }
    } catch (error) {
      this.logger.warn('Chainlink API failed', error);
    }

    try {
      // Band Protocol
      const bandPrice = await this.fetchFromBandProtocol(sourceToken, targetToken);
      if (bandPrice) {
        results.push(bandPrice);
      }
    } catch (error) {
      this.logger.warn('Band Protocol API failed', error);
    }

    return results;
  }

  private async fetchFromChainlink(
    sourceToken: TokenType,
    targetToken: TokenType,
  ): Promise<PriceData | null> {
    // Chainlink Price Feed API integration
    // This would typically use the Chainlink Data Feeds smart contracts
    // For now, return a placeholder
    return null;
  }

  private async fetchFromBandProtocol(
    sourceToken: TokenType,
    targetToken: TokenType,
  ): Promise<PriceData | null> {
    // Band Protocol API integration
    // This would typically use the Band Protocol REST API
    // For now, return a placeholder
    return null;
  }

  private getChainId(chain: Chain): number {
    const chainIds: Record<Chain, number> = {
      [Chain.ETHEREUM]: 1,
      [Chain.BSC]: 56,
      [Chain.SOLANA]: 0, // Solana uses different addressing
      [Chain.STELLAR]: 0,
    };
    return chainIds[chain];
  }

  private getTokenAddress(token: TokenType, chain: Chain): string {
    // Token addresses would be configured per chain
    const addresses: Record<string, Record<TokenType, string>> = {
      [Chain.ETHEREUM]: {
        [TokenType.BTC]: '0x2260fac5e5542a773aa44fbcfedf7c193bc2c599', // WBTC
        [TokenType.ETH]: '0xc02aaa39b223fe8d0a0e5c4f27ead9083c756cc2', // WETH
        [TokenType.USDC]: '0xa0b86991c6218b36c1d19d4a2e9eb0ce3606eb48',
        [TokenType.USDT]: '0xdac17f958d2ee523a2206206994597c13d831ec7',
      },
      [Chain.BSC]: {
        [TokenType.BTC]: '0x7130d2A12B9BCbFAe4f2634d864A1Ee1Ce3Ead9c', // BTCB
        [TokenType.ETH]: '0x2170Ed0880ac9D75be0eCc1B9937C5dD8679fAe9', // WBNB
        [TokenType.USDC]: '0x8AC76a51cc950d9822D68b83fE1Ad97B32Cd580d',
        [TokenType.USDT]: '0x55d398326f99059fF775485246999027B3197955',
      },
      [Chain.SOLANA]: {
        [TokenType.BTC]: '9n4nbM75f5Ui33ZbPYXn59uHW6eP1wq24kF6p5AjF88',
        [TokenType.ETH]: '7vfCXTUXx5WJV5JADk17DUJ4ksgau7tNKQ4jJwMPb8qB',
        [TokenType.USDC]: 'EPjFWdd5AufqSSqeM2qN1xzybapC8G4wEGGkZwyTDt1v',
        [TokenType.USDT]: 'Es9vMFrzaCERmJfrF4H2FYD4KCoNkY11McCe8BenwNYB',
      },
      [Chain.STELLAR]: {
        [TokenType.BTC]: 'BTC',
        [TokenType.ETH]: 'ETH',
        [TokenType.USDC]: 'USDC',
        [TokenType.USDT]: 'USDT',
      },
    };
    return addresses[chain]?.[token] || '';
  }

  private amountToWei(amount: number, token: TokenType): string {
    // Convert to wei/smallest unit
    const decimals = token === TokenType.USDC || token === TokenType.USDT ? 6 : 18;
    return (amount * 10 ** decimals).toString();
  }

  private weiToAmount(wei: string, token: TokenType): number {
    const decimals = token === TokenType.USDC || token === TokenType.USDT ? 6 : 18;
    return parseFloat(wei) / 10 ** decimals;
  }
}
