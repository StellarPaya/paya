import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { HttpService } from '@nestjs/axios';
import { firstValueFrom } from 'rxjs';
import { Chain, TokenType, BridgeType } from '../entities/conversion.entity';

interface BridgeQuote {
  bridge: BridgeType;
  sourceChain: Chain;
  targetChain: Chain;
  amount: number;
  estimatedFee: number;
  estimatedTime: number;
  reliability: number;
}

interface BridgeTransaction {
  bridge: BridgeType;
  sourceChain: Chain;
  targetChain: Chain;
  to: string;
  data: string;
  value: string;
  estimatedFee: number;
  estimatedTime: number;
}

interface BridgeResult {
  txHash: string;
  status: 'PENDING' | 'CONFIRMED' | 'FAILED';
  bridgeTxHash?: string;
  completionTime?: Date;
}

@Injectable()
export class BridgeIntegrationService {
  private readonly logger = new Logger(BridgeIntegrationService.name);

  constructor(
    private configService: ConfigService,
    private httpService: HttpService,
  ) {}

  async getBestBridge(
    sourceChain: Chain,
    targetChain: Chain,
    amount: number,
    preferredBridges?: BridgeType[],
  ): Promise<BridgeQuote> {
    const quotes: BridgeQuote[] = [];

    // Get quotes from all available bridges
    quotes.push(await this.getWormholeQuote(sourceChain, targetChain, amount));
    quotes.push(await this.getAllbridgeQuote(sourceChain, targetChain, amount));
    quotes.push(await this.getStargazeQuote(sourceChain, targetChain, amount));

    // Filter by preferred bridges if specified
    const filteredQuotes = preferredBridges
      ? quotes.filter((q) => preferredBridges.includes(q.bridge))
      : quotes;

    // Sort by reliability and cost
    filteredQuotes.sort((a, b) => {
      const scoreA = a.reliability - a.estimatedFee / amount * 100;
      const scoreB = b.reliability - b.estimatedFee / amount * 100;
      return scoreB - scoreA;
    });

    if (filteredQuotes.length === 0) {
      throw new Error('No available bridges for this route');
    }

    return filteredQuotes[0];
  }

  async executeBridge(quote: BridgeQuote, privateKey: string): Promise<BridgeTransaction> {
    switch (quote.bridge) {
      case BridgeType.WORMHOLE:
        return this.executeWormholeBridge(quote, privateKey);
      case BridgeType.ALLBRIDGE:
        return this.executeAllbridgeBridge(quote, privateKey);
      case BridgeType.STARGAZE:
        return this.executeStargazeBridge(quote, privateKey);
      default:
        throw new Error(`Unsupported bridge: ${quote.bridge}`);
    }
  }

  async monitorBridge(txHash: string, bridge: BridgeType): Promise<BridgeResult> {
    this.logger.log(`Monitoring bridge transaction ${txHash} via ${bridge}`);

    // In production, this would poll the bridge's API for status
    // For now, return a mock result
    return {
      txHash,
      status: 'CONFIRMED',
      bridgeTxHash: '0x' + Math.random().toString(16).substr(2, 64),
      completionTime: new Date(Date.now() + 300000), // 5 minutes from now
    };
  }

  async waitForBridgeCompletion(
    txHash: string,
    bridge: BridgeType,
    timeout: number = 1800000, // 30 minutes
  ): Promise<BridgeResult> {
    const startTime = Date.now();

    while (Date.now() - startTime < timeout) {
      const result = await this.monitorBridge(txHash, bridge);

      if (result.status === 'CONFIRMED' || result.status === 'FAILED') {
        return result;
      }

      // Wait before retrying
      await this.sleep(10000);
    }

    throw new Error(`Bridge transaction ${txHash} completion timeout`);
  }

  private async getWormholeQuote(
    sourceChain: Chain,
    targetChain: Chain,
    amount: number,
  ): Promise<BridgeQuote> {
    try {
      const url = 'https://api.wormhole.com/v1/quote';
      const params = {
        sourceChain: this.getWormholeChainId(sourceChain),
        targetChain: this.getWormholeChainId(targetChain),
        amount: this.amountToWei(amount, TokenType.USDC),
      };

      const response = await firstValueFrom(this.httpService.get(url, { params }));

      return {
        bridge: BridgeType.WORMHOLE,
        sourceChain,
        targetChain,
        amount,
        estimatedFee: this.weiToAmount(response.data.relayerFee, TokenType.USDC),
        estimatedTime: response.data.estimatedTime || 300,
        reliability: 0.95,
      };
    } catch (error) {
      this.logger.error('Wormhole quote fetch error', error);
      // Return fallback quote
      return {
        bridge: BridgeType.WORMHOLE,
        sourceChain,
        targetChain,
        amount,
        estimatedFee: amount * 0.001, // 0.1% fee
        estimatedTime: 300,
        reliability: 0.9,
      };
    }
  }

  private async getAllbridgeQuote(
    sourceChain: Chain,
    targetChain: Chain,
    amount: number,
  ): Promise<BridgeQuote> {
    try {
      const url = 'https://api.allbridge.io/api/v1/quote';
      const params = {
        fromChain: this.getAllbridgeChainId(sourceChain),
        toChain: this.getAllbridgeChainId(targetChain),
        amount: this.amountToWei(amount, TokenType.USDC),
      };

      const response = await firstValueFrom(this.httpService.get(url, { params }));

      return {
        bridge: BridgeType.ALLBRIDGE,
        sourceChain,
        targetChain,
        amount,
        estimatedFee: this.weiToAmount(response.data.fee, TokenType.USDC),
        estimatedTime: response.data.estimatedTime || 600,
        reliability: 0.88,
      };
    } catch (error) {
      this.logger.error('Allbridge quote fetch error', error);
      return {
        bridge: BridgeType.ALLBRIDGE,
        sourceChain,
        targetChain,
        amount,
        estimatedFee: amount * 0.0015, // 0.15% fee
        estimatedTime: 600,
        reliability: 0.85,
      };
    }
  }

  private async getStargazeQuote(
    sourceChain: Chain,
    targetChain: Chain,
    amount: number,
  ): Promise<BridgeQuote> {
    try {
      const url = 'https://api.stargaze.finance/v1/quote';
      const params = {
        sourceChain: this.getStargazeChainId(sourceChain),
        targetChain: this.getStargazeChainId(targetChain),
        amount: this.amountToWei(amount, TokenType.USDC),
      };

      const response = await firstValueFrom(this.httpService.get(url, { params }));

      return {
        bridge: BridgeType.STARGAZE,
        sourceChain,
        targetChain,
        amount,
        estimatedFee: this.weiToAmount(response.data.fee, TokenType.USDC),
        estimatedTime: response.data.estimatedTime || 900,
        reliability: 0.82,
      };
    } catch (error) {
      this.logger.error('Stargaze quote fetch error', error);
      return {
        bridge: BridgeType.STARGAZE,
        sourceChain,
        targetChain,
        amount,
        estimatedFee: amount * 0.002, // 0.2% fee
        estimatedTime: 900,
        reliability: 0.8,
      };
    }
  }

  private async executeWormholeBridge(quote: BridgeQuote, privateKey: string): Promise<BridgeTransaction> {
    this.logger.log('Executing Wormhole bridge', quote);

    // In production, this would use the Wormhole SDK to bridge
    return {
      bridge: BridgeType.WORMHOLE,
      sourceChain: quote.sourceChain,
      targetChain: quote.targetChain,
      to: this.getWormholeContractAddress(quote.targetChain),
      data: '0x',
      value: this.amountToWei(quote.amount - quote.estimatedFee, TokenType.USDC),
      estimatedFee: quote.estimatedFee,
      estimatedTime: quote.estimatedTime,
    };
  }

  private async executeAllbridgeBridge(quote: BridgeQuote, privateKey: string): Promise<BridgeTransaction> {
    this.logger.log('Executing Allbridge bridge', quote);

    return {
      bridge: BridgeType.ALLBRIDGE,
      sourceChain: quote.sourceChain,
      targetChain: quote.targetChain,
      to: this.getAllbridgeContractAddress(quote.targetChain),
      data: '0x',
      value: this.amountToWei(quote.amount - quote.estimatedFee, TokenType.USDC),
      estimatedFee: quote.estimatedFee,
      estimatedTime: quote.estimatedTime,
    };
  }

  private async executeStargazeBridge(quote: BridgeQuote, privateKey: string): Promise<BridgeTransaction> {
    this.logger.log('Executing Stargaze bridge', quote);

    return {
      bridge: BridgeType.STARGAZE,
      sourceChain: quote.sourceChain,
      targetChain: quote.targetChain,
      to: this.getStargazeContractAddress(quote.targetChain),
      data: '0x',
      value: this.amountToWei(quote.amount - quote.estimatedFee, TokenType.USDC),
      estimatedFee: quote.estimatedFee,
      estimatedTime: quote.estimatedTime,
    };
  }

  private getWormholeChainId(chain: Chain): string {
    const chainIds: Record<Chain, string> = {
      [Chain.ETHEREUM]: 'ethereum',
      [Chain.BSC]: 'bsc',
      [Chain.SOLANA]: 'solana',
      [Chain.STELLAR]: 'stellar',
    };
    return chainIds[chain];
  }

  private getAllbridgeChainId(chain: Chain): string {
    const chainIds: Record<Chain, string> = {
      [Chain.ETHEREUM]: 'eth',
      [Chain.BSC]: 'bsc',
      [Chain.SOLANA]: 'sol',
      [Chain.STELLAR]: 'xlm',
    };
    return chainIds[chain];
  }

  private getStargazeChainId(chain: Chain): string {
    const chainIds: Record<Chain, string> = {
      [Chain.ETHEREUM]: 'ethereum',
      [Chain.BSC]: 'bsc',
      [Chain.SOLANA]: 'solana',
      [Chain.STELLAR]: 'stellar',
    };
    return chainIds[chain];
  }

  private getWormholeContractAddress(chain: Chain): string {
    const addresses: Record<Chain, string> = {
      [Chain.ETHEREUM]: '0x98a3c1d5768050f96e25d11af416c8f7e99c1e2f',
      [Chain.BSC]: '0x98a3c1d5768050f96e25d11af416c8f7e99c1e2f',
      [Chain.SOLANA]: 'worm2Zo1FHT4TsQfFtDkGZbUPAVSEgXG1pwxnhfH8vs',
      [Chain.STELLAR]: 'GDUKQ4KBD4EWUIY4AU7SFXTHA5QJZAAJKMCRLEM44PO5ZDNJ4UCONTEAN',
    };
    return addresses[chain];
  }

  private getAllbridgeContractAddress(chain: Chain): string {
    const addresses: Record<Chain, string> = {
      [Chain.ETHEREUM]: '0x1234567890123456789012345678901234567890',
      [Chain.BSC]: '0x1234567890123456789012345678901234567890',
      [Chain.SOLANA]: 'Allbridge123456789012345678901234567890',
      [Chain.STELLAR]: 'GDUKQ4KBD4EWUIY4AU7SFXTHA5QJZAAJKMCRLEM44PO5ZDNJ4UCONTEAN',
    };
    return addresses[chain];
  }

  private getStargazeContractAddress(chain: Chain): string {
    const addresses: Record<Chain, string> = {
      [Chain.ETHEREUM]: '0x1234567890123456789012345678901234567890',
      [Chain.BSC]: '0x1234567890123456789012345678901234567890',
      [Chain.SOLANA]: 'Stargaze123456789012345678901234567890',
      [Chain.STELLAR]: 'GDUKQ4KBD4EWUIY4AU7SFXTHA5QJZAAJKMCRLEM44PO5ZDNJ4UCONTEAN',
    };
    return addresses[chain];
  }

  private amountToWei(amount: number, token: TokenType): string {
    const decimals = token === TokenType.USDC || token === TokenType.USDT ? 6 : 18;
    return (amount * 10 ** decimals).toString();
  }

  private weiToAmount(wei: string, token: TokenType): number {
    const decimals = token === TokenType.USDC || token === TokenType.USDT ? 6 : 18;
    return parseFloat(wei) / 10 ** decimals;
  }

  private sleep(ms: number): Promise<void> {
    return new Promise(resolve => setTimeout(resolve, ms));
  }

  async handleBridgeFailure(
    txHash: string,
    bridge: BridgeType,
    error: string,
    retryCount: number,
    maxRetries: number,
  ): Promise<{ shouldRetry: boolean; newTxHash?: string }> {
    this.logger.error(`Bridge transaction ${txHash} failed: ${error}`);

    if (retryCount >= maxRetries) {
      return { shouldRetry: false };
    }

    const retryableErrors = [
      'insufficient funds',
      'network error',
      'timeout',
      'relay failed',
    ];

    const isRetryable = retryableErrors.some(err => error.toLowerCase().includes(err));

    if (!isRetryable) {
      return { shouldRetry: false };
    }

    const waitTime = Math.min(10000 * 2 ** retryCount, 60000);
    await this.sleep(waitTime);

    return { shouldRetry: true };
  }
}
