import { Injectable, Logger } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { PriceFeedEntity } from './entities/price-feed.entity';
import { PriceDto, GetPriceDto, GetTWAPDto, CheckPriceDeviationDto, GetHistoricalPricesDto } from './dto/price-oracle.dto';
import { ConfigService } from '@nestjs/config';
import axios from 'axios';

interface OracleSource {
  name: string;
  url: string;
  apiKey?: string;
  enabled: boolean;
  weight: number;
}

@Injectable()
export class PriceOracleService {
  private readonly logger = new Logger(PriceOracleService.name);
  private oracleSources: OracleSource[];
  private priceCache: Map<string, { price: number; timestamp: number }>;
  private readonly CACHE_TTL = 30000; // 30 seconds cache

  constructor(
    @InjectRepository(PriceFeedEntity)
    private priceFeedRepository: Repository<PriceFeedEntity>,
    private configService: ConfigService,
  ) {
    this.oracleSources = this.initializeOracleSources();
    this.priceCache = new Map();
    this.startPriceUpdates();
  }

  private initializeOracleSources(): OracleSource[] {
    return [
      {
        name: 'chainlink',
        url: this.configService.get<string>('CHAINLINK_API_URL') || 'https://feeds.chain.link',
        apiKey: this.configService.get<string>('CHAINLINK_API_KEY'),
        enabled: true,
        weight: 0.4,
      },
      {
        name: 'coingecko',
        url: this.configService.get<string>('COINGECKO_API_URL') || 'https://api.coingecko.com/api/v3',
        enabled: true,
        weight: 0.3,
      },
      {
        name: 'coinmarketcap',
        url: this.configService.get<string>('COINMARKETCAP_API_URL') || 'https://pro-api.coinmarketcap.com',
        apiKey: this.configService.get<string>('COINMARKETCAP_API_KEY'),
        enabled: true,
        weight: 0.3,
      },
    ];
  }

  /**
   * Get current price for asset pair
   */
  async getPrice(baseAsset: string, quoteAsset: string, chain: string): Promise<PriceDto> {
    const cacheKey = `${baseAsset}-${quoteAsset}-${chain}`;
    const cached = this.priceCache.get(cacheKey);
    
    if (cached && Date.now() - cached.timestamp < this.CACHE_TTL) {
      this.logger.debug(`Returning cached price for ${cacheKey}`);
      return {
        baseAsset,
        quoteAsset,
        price: cached.price,
        chain,
        timestamp: new Date(cached.timestamp),
        source: 'cache',
      };
    }

    this.logger.log(`Fetching price for ${baseAsset}/${quoteAsset} on ${chain}`);
    
    const prices = await this.fetchPricesFromAllSources(baseAsset, quoteAsset, chain);
    const aggregatedPrice = this.aggregatePrices(prices);
    
    // Cache the result
    this.priceCache.set(cacheKey, {
      price: aggregatedPrice,
      timestamp: Date.now(),
    });

    // Store in database
    await this.savePriceFeed({
      baseAsset,
      quoteAsset,
      price: aggregatedPrice,
      chain,
      timestamp: new Date(),
      source: 'aggregated',
    });

    return {
      baseAsset,
      quoteAsset,
      price: aggregatedPrice,
      chain,
      timestamp: new Date(),
      source: 'aggregated',
    };
  }

  /**
   * Get TWAP (Time-Weighted Average Price)
   */
  async getTWAP(baseAsset: string, quoteAsset: string, period: number): Promise<PriceDto> {
    this.logger.log(`Calculating TWAP for ${baseAsset}/${quoteAsset} over ${period} seconds`);

    const endDate = new Date();
    const startDate = new Date(endDate.getTime() - period * 1000);

    const priceFeeds = await this.priceFeedRepository.find({
      where: {
        baseAsset,
        quoteAsset,
      },
      order: { timestamp: 'ASC' },
    });

    if (priceFeeds.length === 0) {
      throw new Error(`No price data found for ${baseAsset}/${quoteAsset}`);
    }

    // Filter by time period
    const recentFeeds = priceFeeds.filter(
      feed => feed.timestamp >= startDate && feed.timestamp <= endDate,
    );

    if (recentFeeds.length === 0) {
      throw new Error(`No price data found for ${baseAsset}/${quoteAsset} in the specified period`);
    }

    // Calculate TWAP
    let totalWeightedPrice = 0;
    let totalWeight = 0;

    for (let i = 0; i < recentFeeds.length; i++) {
      const currentFeed = recentFeeds[i];
      const nextFeed = recentFeeds[i + 1] || { timestamp: endDate };
      
      const timeWeight = (nextFeed.timestamp.getTime() - currentFeed.timestamp.getTime()) / 1000;
      totalWeightedPrice += currentFeed.price * timeWeight;
      totalWeight += timeWeight;
    }

    const twap = totalWeight / totalWeight;

    return {
      baseAsset,
      quoteAsset,
      price: twap,
      chain: 'aggregated',
      timestamp: new Date(),
      source: 'twap',
    };
  }

  /**
   * Check price deviation against threshold
   */
  async checkPriceDeviation(asset: string, threshold: number): Promise<boolean> {
    this.logger.log(`Checking price deviation for ${asset} with threshold ${threshold}%`);

    const recentFeeds = await this.priceFeedRepository.find({
      where: { baseAsset: asset },
      order: { timestamp: 'DESC' },
      take: 2,
    });

    if (recentFeeds.length < 2) {
      this.logger.warn(`Not enough price data to check deviation for ${asset}`);
      return false;
    }

    const latestPrice = recentFeeds[0].price;
    const previousPrice = recentFeeds[1].price;
    
    const deviation = Math.abs((latestPrice - previousPrice) / previousPrice) * 100;
    
    const isDeviated = deviation > threshold;
    
    if (isDeviated) {
      this.logger.warn(`Price deviation detected for ${asset}: ${deviation.toFixed(2)}% exceeds threshold ${threshold}%`);
    }

    return isDeviated;
  }

  /**
   * Update price feeds from all sources
   */
  async updatePriceFeeds(): Promise<void> {
    this.logger.log('Updating price feeds from all sources');

    const majorPairs = [
      { base: 'BTC', quote: 'USD' },
      { base: 'ETH', quote: 'USD' },
      { base: 'XLM', quote: 'USD' },
      { base: 'MATIC', quote: 'USD' },
      { base: 'USDC', quote: 'USD' },
    ];

    for (const pair of majorPairs) {
      try {
        const price = await this.getPrice(pair.base, pair.quote, 'global');
        this.logger.debug(`Updated price for ${pair.base}/${pair.quote}: ${price.price}`);
      } catch (error) {
        this.logger.error(`Failed to update price for ${pair.base}/${pair.quote}:`, error);
      }
    }
  }

  /**
   * Get historical prices
   */
  async getHistoricalPrices(asset: string, from: Date, to: Date): Promise<PriceDto[]> {
    this.logger.log(`Fetching historical prices for ${asset} from ${from} to ${to}`);

    const priceFeeds = await this.priceFeedRepository.find({
      where: {
        baseAsset: asset,
      },
      order: { timestamp: 'ASC' },
    });

    return priceFeeds.filter(feed => feed.timestamp >= from && feed.timestamp <= to);
  }

  /**
   * Fetch prices from all enabled oracle sources
   */
  private async fetchPricesFromAllSources(
    baseAsset: string,
    quoteAsset: string,
    chain: string,
  ): Promise<{ source: string; price: number; weight: number }[]> {
    const prices: { source: string; price: number; weight: number }[] = [];

    for (const source of this.oracleSources) {
      if (!source.enabled) continue;

      try {
        const price = await this.fetchPriceFromSource(source, baseAsset, quoteAsset, chain);
        if (price !== null) {
          prices.push({
            source: source.name,
            price,
            weight: source.weight,
          });
        }
      } catch (error) {
        this.logger.error(`Failed to fetch price from ${source.name}:`, error);
      }
    }

    if (prices.length === 0) {
      throw new Error(`Failed to fetch price from any source for ${baseAsset}/${quoteAsset}`);
    }

    return prices;
  }

  /**
   * Fetch price from a specific oracle source
   */
  private async fetchPriceFromSource(
    source: OracleSource,
    baseAsset: string,
    quoteAsset: string,
    chain: string,
  ): Promise<number | null> {
    // In production, this would make actual API calls to the oracle sources
    // For now, we'll implement a placeholder
    
    this.logger.debug(`Fetching price from ${source.name} for ${baseAsset}/${quoteAsset}`);
    
    // Placeholder: In production, use actual API calls
    // Example for Chainlink:
    // const response = await axios.get(`${source.url}/price`, {
    //   params: { base: baseAsset, quote: quoteAsset },
    //   headers: { 'X-API-Key': source.apiKey }
    // });
    // return response.data.price;
    
    // Return placeholder price
    const placeholderPrices: Record<string, number> = {
      'BTC-USD': 45000,
      'ETH-USD': 3000,
      'XLM-USD': 0.15,
      'MATIC-USD': 0.8,
      'USDC-USD': 1.0,
    };
    
    const key = `${baseAsset}-${quoteAsset}`;
    return placeholderPrices[key] || null;
  }

  /**
   * Aggregate prices from multiple sources using weighted average
   */
  private aggregatePrices(prices: { source: string; price: number; weight: number }[]): number {
    let totalWeightedPrice = 0;
    let totalWeight = 0;

    for (const { price, weight } of prices) {
      totalWeightedPrice += price * weight;
      totalWeight += weight;
    }

    return totalWeight / totalWeight;
  }

  /**
   * Save price feed to database
   */
  private async savePriceFeed(priceDto: PriceDto): Promise<void> {
    const priceFeed = this.priceFeedRepository.create(priceDto);
    await this.priceFeedRepository.save(priceFeed);
  }

  /**
   * Start periodic price updates
   */
  private startPriceUpdates(): void {
    // Update prices every 30 seconds
    setInterval(async () => {
      try {
        await this.updatePriceFeeds();
      } catch (error) {
        this.logger.error('Failed to update price feeds:', error);
      }
    }, 30000);

    this.logger.log('Started periodic price updates');
  }

  /**
   * Get oracle sources status
   */
  getOracleSourcesStatus(): OracleSource[] {
    return this.oracleSources;
  }

  /**
   * Enable/disable oracle source
   */
  setOracleSourceEnabled(sourceName: string, enabled: boolean): void {
    const source = this.oracleSources.find(s => s.name === sourceName);
    if (source) {
      source.enabled = enabled;
      this.logger.log(`Oracle source ${sourceName} ${enabled ? 'enabled' : 'disabled'}`);
    } else {
      throw new Error(`Oracle source ${sourceName} not found`);
    }
  }
}