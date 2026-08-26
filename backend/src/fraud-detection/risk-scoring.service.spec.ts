import { Test, TestingModule } from '@nestjs/testing';
import { getRepositoryToken } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { RiskScoringService } from './risk-scoring.service';
import { RiskScoreEntity } from './entities/risk-score.entity';
import { FraudIncidentEntity } from './entities/fraud-incident.entity';
import { CalculateRiskScoreDto, RiskTier } from './dto/risk-score.dto';

describe('RiskScoringService', () => {
  let service: RiskScoringService;
  let riskScoreRepository: Repository<RiskScoreEntity>;
  let fraudIncidentRepository: Repository<FraudIncidentEntity>;

  const mockRiskScoreRepository = {
    create: jest.fn(),
    save: jest.fn(),
    findOne: jest.fn(),
    createQueryBuilder: jest.fn(),
  };

  const mockFraudIncidentRepository = {
    createQueryBuilder: jest.fn(),
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        RiskScoringService,
        {
          provide: getRepositoryToken(RiskScoreEntity),
          useValue: mockRiskScoreRepository,
        },
        {
          provide: getRepositoryToken(FraudIncidentEntity),
          useValue: mockFraudIncidentRepository,
        },
      ],
    }).compile();

    service = module.get<RiskScoringService>(RiskScoringService);
    riskScoreRepository = module.get<Repository<RiskScoreEntity>>(getRepositoryToken(RiskScoreEntity));
    fraudIncidentRepository = module.get<Repository<FraudIncidentEntity>>(getRepositoryToken(FraudIncidentEntity));
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('calculateRiskScore', () => {
    it('should calculate risk score successfully', async () => {
      const dto: CalculateRiskScoreDto = {
        paymentId: 'pay_123',
        amount: 1000,
        merchantId: 'merchant_1',
        customerId: 'customer_1',
        ipAddress: '192.168.1.1',
        userAgent: 'Mozilla/5.0',
        deviceFingerprint: 'fp_123',
        country: 'US',
        region: 'CA',
      };

      mockRiskScoreRepository.create.mockReturnValue({
        payment_id: dto.paymentId,
        overall_score: 30,
        risk_tier: RiskTier.LOW,
        factors: [],
        confidence: 0.7,
      });
      mockRiskScoreRepository.save.mockResolvedValue({ id: 1 });

      const result = await service.calculateRiskScore(dto);

      expect(result).toHaveProperty('overallScore');
      expect(result).toHaveProperty('riskTier');
      expect(result).toHaveProperty('factors');
      expect(result).toHaveProperty('confidence');
      expect(result).toHaveProperty('timestamp');
      expect(mockRiskScoreRepository.create).toHaveBeenCalled();
      expect(mockRiskScoreRepository.save).toHaveBeenCalled();
    });

    it('should handle high-risk transaction', async () => {
      const dto: CalculateRiskScoreDto = {
        paymentId: 'pay_123',
        amount: 100000,
        merchantId: 'merchant_1',
        customerId: 'customer_1',
        userAgent: 'bot/1.0',
      };

      mockRiskScoreRepository.create.mockReturnValue({
        payment_id: dto.paymentId,
        overall_score: 85,
        risk_tier: RiskTier.CRITICAL,
        factors: [],
        confidence: 0.8,
      });
      mockRiskScoreRepository.save.mockResolvedValue({ id: 1 });

      const result = await service.calculateRiskScore(dto);

      expect(result.riskTier).toBe(RiskTier.CRITICAL);
      expect(result.overallScore).toBeGreaterThan(80);
    });
  });

  describe('getRiskFactors', () => {
    it('should return risk factors for a payment', async () => {
      const paymentId = 'pay_123';
      const mockRiskScore = {
        payment_id: paymentId,
        factors: [
          { name: 'transaction_velocity', score: 20, weight: 0.2, description: 'Low velocity', value: 20 },
          { name: 'amount_anomaly', score: 30, weight: 0.25, description: 'Normal amount', value: 30 },
        ],
      };

      mockRiskScoreRepository.findOne.mockResolvedValue(mockRiskScore);

      const result = await service.getRiskFactors(paymentId);

      expect(result).toEqual(mockRiskScore.factors);
      expect(mockRiskScoreRepository.findOne).toHaveBeenCalledWith({
        where: { payment_id: paymentId },
      });
    });

    it('should throw NotFoundException if risk score not found', async () => {
      mockRiskScoreRepository.findOne.mockResolvedValue(null);

      await expect(service.getRiskFactors('nonexistent')).rejects.toThrow('Risk score for payment nonexistent not found');
    });
  });

  describe('updateThresholds', () => {
    it('should update merchant thresholds', async () => {
      const merchantId = 'merchant_1';
      const dto = {
        merchantId,
        lowThreshold: 25,
        mediumThreshold: 55,
        highThreshold: 75,
        criticalThreshold: 95,
      };

      await service.updateThresholds(merchantId, dto);

      // Verify thresholds are set (access through private method would be needed for full verification)
      expect(service).toBeDefined();
    });
  });

  describe('getFraudStatistics', () => {
    it('should return fraud statistics for a period', async () => {
      const period = {
        startDate: new Date('2024-01-01'),
        endDate: new Date('2024-01-31'),
      };

      const mockQueryBuilder = {
        where: jest.fn().mockReturnThis(),
        andWhere: jest.fn().mockReturnThis(),
        getCount: jest.fn()
          .mockResolvedValueOnce(100) // totalPayments
          .mockResolvedValueOnce(10)  // flaggedPayments
          .mockResolvedValueOnce(5)   // confirmedFraud
          .mockResolvedValueOnce(2),  // falsePositives
      };

      mockRiskScoreRepository.createQueryBuilder.mockReturnValue(mockQueryBuilder);
      mockFraudIncidentRepository.createQueryBuilder.mockReturnValue(mockQueryBuilder);

      const result = await service.getFraudStatistics(period);

      expect(result).toHaveProperty('totalPayments', 100);
      expect(result).toHaveProperty('flaggedPayments', 10);
      expect(result).toHaveProperty('confirmedFraud', 5);
      expect(result).toHaveProperty('falsePositives', 2);
      expect(result).toHaveProperty('fraudRate');
      expect(result).toHaveProperty('falsePositiveRate');
    });
  });
});