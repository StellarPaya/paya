import { Test, TestingModule } from '@nestjs/testing';
import { getRepositoryToken } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { BehavioralAnalysisService } from './behavioral-analysis.service';
import { BehavioralProfileEntity } from './entities/behavioral-profile.entity';

describe('BehavioralAnalysisService', () => {
  let service: BehavioralAnalysisService;
  let repository: Repository<BehavioralProfileEntity>;

  const mockRepository = {
    findOne: jest.fn(),
    create: jest.fn(),
    save: jest.fn(),
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        BehavioralAnalysisService,
        {
          provide: getRepositoryToken(BehavioralProfileEntity),
          useValue: mockRepository,
        },
      ],
    }).compile();

    service = module.get<BehavioralAnalysisService>(BehavioralAnalysisService);
    repository = module.get<Repository<BehavioralProfileEntity>>(getRepositoryToken(BehavioralProfileEntity));
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('trackBehavior', () => {
    it('should create new profile if none exists', async () => {
      const userId = 'user_123';
      const behaviorEvent = {
        eventType: 'transaction',
        timestamp: new Date(),
        data: { amount: 100, merchantId: 'merchant_1' },
      };

      mockRepository.findOne.mockResolvedValue(null);
      mockRepository.create.mockReturnValue({
        user_id: userId,
        profile_data: {},
        baseline_data: {},
      });
      mockRepository.save.mockResolvedValue({ id: 1 });

      await service.trackBehavior(userId, behaviorEvent);

      expect(mockRepository.create).toHaveBeenCalled();
      expect(mockRepository.save).toHaveBeenCalled();
    });

    it('should update existing profile', async () => {
      const userId = 'user_123';
      const behaviorEvent = {
        eventType: 'transaction',
        timestamp: new Date(),
        data: { amount: 100, merchantId: 'merchant_1' },
      };

      const existingProfile = {
        user_id: userId,
        profile_data: {
          transactionPatterns: { amounts: [50], merchants: ['merchant_2'] },
        },
        baseline_data: {},
      };

      mockRepository.findOne.mockResolvedValue(existingProfile);
      mockRepository.save.mockResolvedValue({ id: 1 });

      await service.trackBehavior(userId, behaviorEvent);

      expect(mockRepository.findOne).toHaveBeenCalledWith({
        where: { user_id: userId },
      });
      expect(mockRepository.save).toHaveBeenCalled();
    });
  });

  describe('buildProfile', () => {
    it('should return user profile', async () => {
      const userId = 'user_123';
      const mockProfile = {
        user_id: userId,
        profile_data: {
          userId,
          transactionPatterns: { amounts: [100, 200], merchants: ['merchant_1'] },
        },
        baseline_data: {},
      };

      mockRepository.findOne.mockResolvedValue(mockProfile);

      const result = await service.buildProfile(userId);

      expect(result).toEqual(mockProfile.profile_data);
      expect(mockRepository.findOne).toHaveBeenCalledWith({
        where: { user_id: userId },
      });
    });

    it('should throw error if profile not found', async () => {
      mockRepository.findOne.mockResolvedValue(null);

      await expect(service.buildProfile('nonexistent')).rejects.toThrow('Behavioral profile for user nonexistent not found');
    });
  });

  describe('detectAnomalies', () => {
    it('should return empty array for new users', async () => {
      const userId = 'user_123';
      const behaviorEvent = {
        eventType: 'transaction',
        timestamp: new Date(),
        data: { amount: 1000 },
      };

      mockRepository.findOne.mockResolvedValue(null);

      const result = await service.detectAnomalies(userId, behaviorEvent);

      expect(result).toEqual([]);
    });

    it('should detect amount anomalies', async () => {
      const userId = 'user_123';
      const behaviorEvent = {
        eventType: 'transaction',
        timestamp: new Date(),
        data: { amount: 10000 },
      };

      const mockProfile = {
        user_id: userId,
        profile_data: {},
        baseline_data: {
          transactionPatterns: {
            averageAmount: 100,
            amountStdDev: 50,
          },
        },
      };

      mockRepository.findOne.mockResolvedValue(mockProfile);

      const result = await service.detectAnomalies(userId, behaviorEvent);

      expect(result.length).toBeGreaterThan(0);
      expect(result[0].type).toBe('amount_anomaly');
      expect(result[0].score).toBeGreaterThan(50);
    });
  });

  describe('compareWithBaseline', () => {
    it('should return high deviation for new users', async () => {
      const userId = 'user_123';
      const behaviorEvent = {
        eventType: 'transaction',
        timestamp: new Date(),
        data: { amount: 100 },
      };

      mockRepository.findOne.mockResolvedValue(null);

      const result = await service.compareWithBaseline(userId, behaviorEvent);

      expect(result.overallDeviation).toBe(100);
      expect(result.deviations).toEqual([]);
    });

    it('should calculate deviation score for existing users', async () => {
      const userId = 'user_123';
      const behaviorEvent = {
        eventType: 'transaction',
        timestamp: new Date(),
        data: { amount: 100 },
      };

      const mockProfile = {
        user_id: userId,
        profile_data: {},
        baseline_data: {
          transactionPatterns: {
            averageAmount: 100,
            amountStdDev: 50,
          },
        },
      };

      mockRepository.findOne.mockResolvedValue(mockProfile);

      const result = await service.compareWithBaseline(userId, behaviorEvent);

      expect(result).toHaveProperty('overallDeviation');
      expect(result).toHaveProperty('deviations');
    });
  });
});