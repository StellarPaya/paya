import { Test, TestingModule } from '@nestjs/testing';
import { getRepositoryToken } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { NetworkAnalysisService } from './network-analysis.service';
import { TransactionGraphEdgeEntity } from './entities/transaction-graph-edge.entity';

describe('NetworkAnalysisService', () => {
  let service: NetworkAnalysisService;
  let repository: Repository<TransactionGraphEdgeEntity>;

  const mockRepository = {
    createQueryBuilder: jest.fn(),
    find: jest.fn(),
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        NetworkAnalysisService,
        {
          provide: getRepositoryToken(TransactionGraphEdgeEntity),
          useValue: mockRepository,
        },
      ],
    }).compile();

    service = module.get<NetworkAnalysisService>(NetworkAnalysisService);
    repository = module.get<Repository<TransactionGraphEdgeEntity>>(getRepositoryToken(TransactionGraphEdgeEntity));
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('buildTransactionGraph', () => {
    it('should build transaction graph from database edges', async () => {
      const timeWindow = {
        startDate: new Date('2024-01-01'),
        endDate: new Date('2024-01-31'),
      };

      const mockEdges = [
        {
          id: 1,
          source_entity: 'addr1',
          target_entity: 'addr2',
          edge_type: 'payment',
          weight: 1.0,
          transaction_count: 5,
          first_seen: new Date('2024-01-01'),
          last_seen: new Date('2024-01-15'),
        },
        {
          id: 2,
          source_entity: 'addr2',
          target_entity: 'addr3',
          edge_type: 'payment',
          weight: 0.8,
          transaction_count: 3,
          first_seen: new Date('2024-01-05'),
          last_seen: new Date('2024-01-20'),
        },
      ];

      const mockQueryBuilder = {
        where: jest.fn().mockReturnThis(),
        andWhere: jest.fn().mockReturnThis(),
        getMany: jest.fn().mockResolvedValue(mockEdges),
      };

      mockRepository.createQueryBuilder.mockReturnValue(mockQueryBuilder);

      const result = await service.buildTransactionGraph(timeWindow);

      expect(result).toHaveProperty('nodes');
      expect(result).toHaveProperty('edges');
      expect(result.edges).toEqual(mockEdges);
      expect(result.nodes.size).toBe(3); // addr1, addr2, addr3
      expect(mockRepository.createQueryBuilder).toHaveBeenCalled();
    });

    it('should handle empty graph', async () => {
      const timeWindow = {
        startDate: new Date('2024-01-01'),
        endDate: new Date('2024-01-31'),
      };

      const mockQueryBuilder = {
        where: jest.fn().mockReturnThis(),
        andWhere: jest.fn().mockReturnThis(),
        getMany: jest.fn().mockResolvedValue([]),
      };

      mockRepository.createQueryBuilder.mockReturnValue(mockQueryBuilder);

      const result = await service.buildTransactionGraph(timeWindow);

      expect(result.nodes.size).toBe(0);
      expect(result.edges).toEqual([]);
    });
  });

  describe('detectFraudRings', () => {
    it('should detect fraud rings in graph', async () => {
      const graph = {
        nodes: new Map([
          ['addr1', { id: 'addr1', connections: 2 }],
          ['addr2', { id: 'addr2', connections: 3 }],
          ['addr3', { id: 'addr3', connections: 2 }],
        ]),
        edges: [
          {
            source_entity: 'addr1',
            target_entity: 'addr2',
            edge_type: 'payment',
            weight: 1.0,
            transaction_count: 5,
            first_seen: new Date(),
            last_seen: new Date(),
          },
          {
            source_entity: 'addr2',
            target_entity: 'addr3',
            edge_type: 'payment',
            weight: 0.8,
            transaction_count: 3,
            first_seen: new Date(),
            last_seen: new Date(),
          },
        ],
      };

      const result = await service.detectFraudRings(graph);

      expect(Array.isArray(result)).toBe(true);
      // Each fraud ring should have required properties
      result.forEach(ring => {
        expect(ring).toHaveProperty('id');
        expect(ring).toHaveProperty('members');
        expect(ring).toHaveProperty('centralNode');
        expect(ring).toHaveProperty('riskScore');
        expect(ring).toHaveProperty('patterns');
      });
    });

    it('should not detect fraud rings in small components', async () => {
      const graph = {
        nodes: new Map([
          ['addr1', { id: 'addr1', connections: 1 }],
          ['addr2', { id: 'addr2', connections: 1 }],
        ]),
        edges: [
          {
            source_entity: 'addr1',
            target_entity: 'addr2',
            edge_type: 'payment',
            weight: 1.0,
            transaction_count: 1,
            first_seen: new Date(),
            last_seen: new Date(),
          },
        ],
      };

      const result = await service.detectFraudRings(graph);

      // Small components (less than 3 members) should not be flagged
      result.forEach(ring => {
        expect(ring.riskScore).toBeLessThanOrEqual(50);
      });
    });
  });

  describe('calculateSimilarity', () => {
    it('should calculate similarity between entities', async () => {
      const entity1 = 'addr1';
      const entity2 = 'addr2';

      const mockEdges1 = [
        { source_entity: 'addr1', target_entity: 'addr3' },
        { source_entity: 'addr3', target_entity: 'addr1' },
      ];

      const mockEdges2 = [
        { source_entity: 'addr2', target_entity: 'addr3' },
        { source_entity: 'addr3', target_entity: 'addr2' },
      ];

      mockRepository.find
        .mockResolvedValueOnce(mockEdges1)
        .mockResolvedValueOnce(mockEdges2);

      const result = await service.calculateSimilarity(entity1, entity2);

      expect(result).toHaveProperty('entity1', entity1);
      expect(result).toHaveProperty('entity2', entity2);
      expect(result).toHaveProperty('similarity');
      expect(result).toHaveProperty('commonConnections');
      expect(result.similarity).toBeGreaterThanOrEqual(0);
      expect(result.similarity).toBeLessThanOrEqual(100);
    });

    it('should handle entities with no connections', async () => {
      const entity1 = 'addr1';
      const entity2 = 'addr2';

      mockRepository.find
        .mockResolvedValueOnce([])
        .mockResolvedValueOnce([]);

      const result = await service.calculateSimilarity(entity1, entity2);

      expect(result.similarity).toBe(0);
      expect(result.commonConnections).toBe(0);
    });
  });

  describe('detectMoneyLaundering', () => {
    it('should detect money laundering patterns', async () => {
      const graph = {
        nodes: new Map([
          ['addr1', { id: 'addr1', connections: 5 }],
          ['addr2', { id: 'addr2', connections: 3 }],
          ['addr3', { id: 'addr3', connections: 3 }],
          ['addr4', { id: 'addr4', connections: 3 }],
          ['addr5', { id: 'addr5', connections: 3 }],
        ]),
        edges: [
          {
            source_entity: 'addr1',
            target_entity: 'addr2',
            edge_type: 'payment',
            weight: 1.0,
            transaction_count: 15,
            first_seen: new Date(),
            last_seen: new Date(),
          },
          {
            source_entity: 'addr1',
            target_entity: 'addr3',
            edge_type: 'payment',
            weight: 1.0,
            transaction_count: 12,
            first_seen: new Date(),
            last_seen: new Date(),
          },
          {
            source_entity: 'addr2',
            target_entity: 'addr3',
            edge_type: 'payment',
            weight: 0.5,
            transaction_count: 2,
            first_seen: new Date(),
            last_seen: new Date(),
          },
        ],
      };

      const result = await service.detectMoneyLaundering(graph);

      expect(Array.isArray(result)).toBe(true);
      result.forEach(pattern => {
        expect(pattern).toHaveProperty('type');
        expect(pattern).toHaveProperty('entities');
        expect(pattern).toHaveProperty('riskScore');
        expect(pattern).toHaveProperty('description');
      });
    });

    it('should detect fan-out patterns', async () => {
      const graph = {
        nodes: new Map([
          ['addr1', { id: 'addr1', connections: 6 }],
          ['addr2', { id: 'addr2', connections: 1 }],
          ['addr3', { id: 'addr3', connections: 1 }],
          ['addr4', { id: 'addr4', connections: 1 }],
          ['addr5', { id: 'addr5', connections: 1 }],
          ['addr6', { id: 'addr6', connections: 1 }],
        ]),
        edges: [
          {
            source_entity: 'addr1',
            target_entity: 'addr2',
            edge_type: 'payment',
            weight: 1.0,
            transaction_count: 1,
            first_seen: new Date(),
            last_seen: new Date(),
          },
          {
            source_entity: 'addr1',
            target_entity: 'addr3',
            edge_type: 'payment',
            weight: 1.0,
            transaction_count: 1,
            first_seen: new Date(),
            last_seen: new Date(),
          },
          {
            source_entity: 'addr1',
            target_entity: 'addr4',
            edge_type: 'payment',
            weight: 1.0,
            transaction_count: 1,
            first_seen: new Date(),
            last_seen: new Date(),
          },
          {
            source_entity: 'addr1',
            target_entity: 'addr5',
            edge_type: 'payment',
            weight: 1.0,
            transaction_count: 1,
            first_seen: new Date(),
            last_seen: new Date(),
          },
          {
            source_entity: 'addr1',
            target_entity: 'addr6',
            edge_type: 'payment',
            weight: 1.0,
            transaction_count: 1,
            first_seen: new Date(),
            last_seen: new Date(),
          },
        ],
      };

      const result = await service.detectMoneyLaundering(graph);

      const fanOutPattern = result.find(p => p.type === 'fan_out');
      expect(fanOutPattern).toBeDefined();
      expect(fanOutPattern?.entities).toContain('addr1');
    });
  });
});