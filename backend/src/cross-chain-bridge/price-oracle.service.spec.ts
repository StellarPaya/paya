import { Test, TestingModule } from '@nestjs/testing';
import { getRepositoryToken } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { PriceOracleService } from './price-oracle.service';
import { PriceFeedEntity } from './entities/price-feed.entity';
import { ConfigService } from '@nestjs/config';

describe('PriceOracleService', () => {
  let service: PriceOracleService;
  let priceFeedRepository: Repository<PriceFeedEntity>;
  let configService: ConfigService;

  const mockPriceFeedRepository = {
    find: jest.fn(),
    create: jest.fn(),
    save: jest.fn(),
  };

  const mockConfigService = {
    get: jest.fn(),
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        PriceOracleService,
        {
          provide: getRepositoryToken(PriceFeedEntity),
          useValue: mockPriceFeedRepository,
        },
        {
          provide: ConfigService,
          useValue: mockConfigService,
        },
      ],
    }).compile();

    service = module.get<PriceOracleService>(PriceOracleService);
    priceFeedRepository = module.get<Repository<PriceFeedEntity>>(getRepositoryToken(PriceFeedEntity));
    configService = module.get<ConfigService>(ConfigService);
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('getPrice', () => {
    it('should return price from cache if available', async () => {
      mockConfigService.get.mockReturnValue('test_config');
      
      // First call to populate cache
      mockPriceFeedRepository.find.mockResolvedValue([]);
      mockPriceFeedRepository.create.mockReturnValue({});
      mockPriceFeedRepository.save.mockResolvedValue({});

      await service.getPrice('BTC', 'USD', 'stellar');

      // Second call should use cache
      const result = await service.getPrice('BTC', 'USD', 'stellar');

      expect(result).toHaveProperty('baseAsset', 'BTC');
      expect(result).toHaveProperty('quoteAsset', 'USD');
      expect(result).toHaveProperty('price');
      expect(result).toHaveProperty('chain', 'stellar');
    });

    it('should fetch price from oracle sources if not cached', async () => {
      mockConfigService.get.mockReturnValue('test_config');
      mockPriceFeedRepository.find.mockResolvedValue([]);
      mockPriceFeedRepository.create.mockReturnValue({});
      mockPriceFeedRepository.save.mockResolvedValue({});

      const result = await service.getPrice('ETH', 'USD', 'ethereum');

      expect(result).toHaveProperty('baseAsset', 'ETH');
      expect(result).toHaveProperty('quoteAsset', 'USD');
      expect(result).toHaveProperty('price');
      expect(mockPriceFeedRepository.save).toHaveBeenCalled();
    });
  });

  describe('getTWAP', () => {
    it('should calculate TWAP for asset pair', async () => {
      const mockPriceFeeds = [
        {
          baseAsset: 'BTC',
          quoteAsset: 'USD',
          price: 45000,
          chain: 'global',
          timestamp: new Date(Date.now() - 3600000),
          source: 'aggregated',
        },
        {
          baseAsset: 'BTC',
          quoteAsset: 'USD',
          price: 45100,
          chain: 'global',
          timestamp: new Date(Date.now() - 1800000),
          source: 'aggregated',
        },
      ];

      mockPriceFeedRepository.find.mockResolvedValue(mockPriceFeeds);

      const result = await service.getTWAP('BTC', 'USD', 7200); // 2 hours

      expect(result).toHaveProperty('baseAsset', 'BTC');
      expect(result).toHaveProperty('quoteAsset', 'USD');
      expect(result).toHaveProperty('price');
      expect(result.source).toBe('twap');
    });

    it('should throw error if no price data found', async () => {
      mockPriceFeedRepository.find.mockResolvedValue([]);

      await expect(service.getTWAP('BTC', 'USD', 3600)).rejects.toThrow(
        'No price data found for BTC/USD'
      );
    });
  });

  describe('checkPriceDeviation', () => {
    it('should return false if deviation is within threshold', async () => {
      const mockPriceFeeds = [
        {
          baseAsset: 'BTC',
          quoteAsset: 'USD',
          price: 45000,
          chain: 'global',
          timestamp: new Date(Date.now() - 3600000),
          source: 'aggregated',
        },
        {
          baseAsset: 'BTC',
          quoteAsset: 'USD',
          price: 45050, // 0.11% deviation
          chain: 'global',
          timestamp: new Date(),
          source: 'aggregated',
        },
      ];

      mockPriceFeedRepository.find.mockResolvedValue(mockPriceFeeds);

      const result = await service.checkPriceDeviation('BTC', 5); // 5% threshold

      expect(result).toBe(false);
    });

    it('should return true if deviation exceeds threshold', async () => {
      const mockPriceFeeds = [
        {
          baseAsset: 'BTC',
          quoteAsset: 'USD',
          price: 45000,
          chain: 'global',
          timestamp: new Date(Date.now() - 3600000),
          source: 'aggregated',
        },
        {
          baseAsset: 'BTC',
          quoteAsset: 'USD',
          price: 50000, // 11.1% deviation
          chain: 'global',
          timestamp: new Date(),
          source: 'aggregated',
        },
      ];

      mockPriceFeedRepository.find.mockResolvedValue(mockPriceFeeds);

      const result = await service.checkPriceDeviation('BTC', 5); // 5% threshold

      expect(result).toBe(true);
    });

    it('should return false if insufficient data', async () => {
      mockPriceFeedRepository.find.mockResolvedValue([]);

      const result = await service.checkPriceDeviation('BTC', 5);

      expect(result).toBe(false);
    });
  });

  describe('getHistoricalPrices', () => {
    it('should return historical prices for asset', async () => {
      const mockPriceFeeds = [
        {
          baseAsset: 'BTC',
          quoteAsset: 'USD',
          price: 45000,
          chain: 'global',
          timestamp: new Date('2024-01-01'),
          source: 'aggregated',
        },
        {
          baseAsset: 'BTC',
          quoteAsset: 'USD',
          price: 45100,
          chain: 'global',
          timestamp: new Date('2024-01-02'),
          source: 'aggregated',
        },
      ];

      mockPriceFeedRepository.find.mockResolvedValue(mockPriceFeeds);

      const result = await service.getHistoricalPrices(
        'BTC',
        new Date('2024-01-01'),
        new Date('2024-01-31')
      );

      expect(Array.isArray(result)).toBe(true);
      expect(result.length).toBe(2);
    });
  });

  describe('getOracleSourcesStatus', () => {
    it('should return status of all oracle sources', () => {
      const status = service.getOracleSourcesStatus();

      expect(Array.isArray(status)).toBe(true);
      status.forEach(source => {
        expect(source).toHaveProperty('name');
        expect(source).toHaveProperty('url');
        expect(source).toHaveProperty('enabled');
        expect(source).toHaveProperty('weight');
      });
    });
  });

  describe('setOracleSourceEnabled', () => {
    it('should enable oracle source', () => {
      service.setOracleSourceEnabled('chainlink', true);

      const status = service.getOracleSourcesStatus();
      const chainlinkSource = status.find(s => s.name === 'chainlink');
      expect(chainlinkSource?.enabled).toBe(true);
    });

    it('should disable oracle source', () => {
      service.setOracleSourceEnabled('chainlink', false);

      const status = service.getOracleSourcesStatus();
      const chainlinkSource = status.find(s => s.name === 'chainlink');
      expect(chainlinkSource?.enabled).toBe(false);
    });

    it('should throw error for non-existent source', () => {
      expect(() => {
        service.setOracleSourceEnabled('nonexistent', true);
      }).toThrow('Oracle source nonexistent not found');
    });
  });
});