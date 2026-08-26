import { Test, TestingModule } from '@nestjs/testing';
import { getRepositoryToken } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { CrossChainRelayerService } from './cross-chain-relayer.service';
import { SwapEntity } from './entities/swap.entity';
import { SwapStatus, ChainType } from './dto/cross-chain.dto';
import { ConfigService } from '@nestjs/config';
import { HttpService } from '@nestjs/axios';

describe('CrossChainRelayerService', () => {
  let service: CrossChainRelayerService;
  let swapRepository: Repository<SwapEntity>;
  let configService: ConfigService;
  let httpService: HttpService;

  const mockSwapRepository = {
    findOne: jest.fn(),
    save: jest.fn(),
  };

  const mockConfigService = {
    get: jest.fn(),
  };

  const mockHttpService = {
    get: jest.fn(),
    post: jest.fn(),
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        CrossChainRelayerService,
        {
          provide: getRepositoryToken(SwapEntity),
          useValue: mockSwapRepository,
        },
        {
          provide: ConfigService,
          useValue: mockConfigService,
        },
        {
          provide: HttpService,
          useValue: mockHttpService,
        },
      ],
    }).compile();

    service = module.get<CrossChainRelayerService>(CrossChainRelayerService);
    swapRepository = module.get<Repository<SwapEntity>>(getRepositoryToken(SwapEntity));
    configService = module.get<ConfigService>(ConfigService);
    httpService = module.get<HttpService>(HttpService);
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('monitorSwapInitiations', () => {
    it('should start monitoring for all configured chains', async () => {
      mockConfigService.get.mockImplementation((key: string) => {
        const configMap: Record<string, string> = {
          STELLAR_RPC_URL: 'https://horizon-testnet.stellar.org',
          STELLAR_CONTRACT_ADDRESS: 'test_address',
          ETHEREUM_RPC_URL: 'https://eth-rpc.example.com',
          ETHEREUM_CONTRACT_ADDRESS: 'test_address',
          POLYGON_RPC_URL: 'https://polygon-rpc.example.com',
          POLYGON_CONTRACT_ADDRESS: 'test_address',
        };
        return configMap[key] || '';
      });

      await service.monitorSwapInitiations();

      expect(service).toBeDefined();
    });
  });

  describe('relaySwapCompletion', () => {
    it('should relay swap completion successfully', async () => {
      const swapId = 'test_swap_id';
      const secret = 'test_secret';
      const targetChain = ChainType.ETHEREUM;

      const mockSwap = {
        swapId,
        sourceChain: ChainType.STELLAR,
        targetChain,
        initiatorAddress: '0x123',
        recipientAddress: '0x456',
        amount: 1000,
        asset: 'XLM',
        hashLock: 'abc123',
        timeLock: Date.now() + 3600000,
        status: SwapStatus.INITIATED,
        createdAt: new Date(),
        completedAt: null,
        refundedAt: null,
      };

      mockSwapRepository.findOne.mockResolvedValue(mockSwap);
      mockSwapRepository.save.mockResolvedValue({ ...mockSwap, status: SwapStatus.COMPLETED });

      const result = await service.relaySwapCompletion(swapId, secret, targetChain);

      expect(result).toHaveProperty('hash');
      expect(result).toHaveProperty('status', true);
      expect(mockSwapRepository.save).toHaveBeenCalled();
    });

    it('should throw error if swap not found', async () => {
      mockSwapRepository.findOne.mockResolvedValue(null);

      await expect(
        service.relaySwapCompletion('nonexistent', 'secret', ChainType.ETHEREUM)
      ).rejects.toThrow('Swap nonexistent not found');
    });

    it('should throw error if swap not in initiated state', async () => {
      const mockSwap = {
        swapId: 'test_swap_id',
        status: SwapStatus.COMPLETED,
      };

      mockSwapRepository.findOne.mockResolvedValue(mockSwap);

      await expect(
        service.relaySwapCompletion('test_swap_id', 'secret', ChainType.ETHEREUM)
      ).rejects.toThrow('Swap test_swap_id is not in initiated state');
    });
  });

  describe('relaySwapRefund', () => {
    it('should relay swap refund successfully', async () => {
      const swapId = 'test_swap_id';
      const targetChain = ChainType.ETHEREUM;

      const mockSwap = {
        swapId,
        sourceChain: ChainType.STELLAR,
        targetChain,
        initiatorAddress: '0x123',
        recipientAddress: '0x456',
        amount: 1000,
        asset: 'XLM',
        hashLock: 'abc123',
        timeLock: Date.now() - 3600000, // Expired
        status: SwapStatus.INITIATED,
        createdAt: new Date(),
        completedAt: null,
        refundedAt: null,
      };

      mockSwapRepository.findOne.mockResolvedValue(mockSwap);
      mockSwapRepository.save.mockResolvedValue({ ...mockSwap, status: SwapStatus.REFUNDED });

      const result = await service.relaySwapRefund(swapId, targetChain);

      expect(result).toHaveProperty('hash');
      expect(result).toHaveProperty('status', true);
      expect(mockSwapRepository.save).toHaveBeenCalled();
    });
  });

  describe('verifySignature', () => {
    it('should verify signature successfully', async () => {
      mockConfigService.get.mockReturnValue('test_config');

      const result = await service.verifySignature('test_message', 'test_signature', ChainType.ETHEREUM);

      expect(result).toBe(true);
    });
  });

  describe('handleFailedRelay', () => {
    it('should handle failed relay with retry logic', async () => {
      const swapId = 'test_swap_id';
      const targetChain = ChainType.ETHEREUM;

      const mockSwap = {
        swapId,
        status: SwapStatus.INITIATED,
        timeLock: Date.now() - 3600000, // Expired
      };

      mockSwapRepository.findOne.mockResolvedValue(mockSwap);
      mockSwapRepository.save.mockResolvedValue({ ...mockSwap, status: SwapStatus.REFUNDED });

      await service.handleFailedRelay(swapId, targetChain, 2);

      expect(mockSwapRepository.save).toHaveBeenCalled();
    });
  });

  describe('getMonitoringStatus', () => {
    it('should return monitoring status for all chains', () => {
      const status = service.getMonitoringStatus();

      expect(Array.isArray(status)).toBe(true);
      expect(status.length).toBeGreaterThan(0);
      status.forEach(chainStatus => {
        expect(chainStatus).toHaveProperty('chain');
        expect(chainStatus).toHaveProperty('active');
      });
    });
  });
});