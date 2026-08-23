import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { HttpService } from '@nestjs/axios';
import { firstValueFrom } from 'rxjs';
import { TokenType, Chain, DexType } from '../entities/conversion.entity';

interface TradeRoute {
  dex: DexType;
  path: string[];
  expectedAmount: number;
  gasEstimate: number;
  priceImpact: number;
  hops: number;
}

interface SwapTransaction {
  to: string;
  data: string;
  value: string;
  gasLimit: string;
  gasPrice: string;
}

@Injectable()
export class DexIntegrationService {
  private readonly logger = new Logger(DexIntegrationService.name);

  constructor(
    private configService: ConfigService,
    private httpService: HttpService,
  ) {}

  async getBestRoute(
    sourceToken: TokenType,
    sourceChain: Chain,
    targetToken: TokenType,
    targetChain: Chain,
    amount: number,
    preferredDexes?: DexType[],
  ): Promise<TradeRoute> {
    const routes: TradeRoute[] = [];

    // Get routes from all available DEXs
    if (sourceChain === Chain.ETHEREUM) {
      routes.push(await this.getUniswapRoute(sourceToken, targetToken, amount));
    }

    if (sourceChain === Chain.BSC) {
      routes.push(await this.getPancakeSwapRoute(sourceToken, targetToken, amount));
    }

    if (sourceChain === Chain.SOLANA) {
      routes.push(await this.getRaydiumRoute(sourceToken, targetToken, amount));
      routes.push(await this.getJupiterRoute(sourceToken, targetToken, amount));
    }

    // Filter by preferred DEXes if specified
    const filteredRoutes = preferredDexes
      ? routes.filter((r) => preferredDexes.includes(r.dex))
      : routes;

    // Sort by expected amount (descending) and gas cost (ascending)
    filteredRoutes.sort((a, b) => {
      const scoreA = a.expectedAmount - a.gasEstimate * 0.001;
      const scoreB = b.expectedAmount - b.gasEstimate * 0.001;
      return scoreB - scoreA;
    });

    if (filteredRoutes.length === 0) {
      throw new Error('No available routes for this trade');
    }

    return filteredRoutes[0];
  }

  async executeSwap(route: TradeRoute, privateKey: string): Promise<SwapTransaction> {
    switch (route.dex) {
      case DexType.UNISWAP:
        return this.executeUniswapSwap(route, privateKey);
      case DexType.PANCAKESWAP:
        return this.executePancakeSwap(route, privateKey);
      case DexType.RAYDIUM:
        return this.executeRaydiumSwap(route, privateKey);
      case DexType.JUPITER:
        return this.executeJupiterSwap(route, privateKey);
      default:
        throw new Error(`Unsupported DEX: ${route.dex}`);
    }
  }

  private async getUniswapRoute(
    sourceToken: TokenType,
    targetToken: TokenType,
    amount: number,
  ): Promise<TradeRoute> {
    const chainId = 1; // Ethereum
    const tokenIn = this.getTokenAddress(sourceToken, Chain.ETHEREUM);
    const tokenOut = this.getTokenAddress(targetToken, Chain.ETHEREUM);
    const amountIn = this.amountToWei(amount, sourceToken);

    try {
      const url = `https://api.uniswap.org/v1/quote`;
      const params = {
        tokenIn,
        tokenOut,
        amountIn,
      };

      const response = await firstValueFrom(this.httpService.get(url, { params }));

      return {
        dex: DexType.UNISWAP,
        path: response.data.route || [tokenIn, tokenOut],
        expectedAmount: this.weiToAmount(response.data.amountOut, targetToken),
        gasEstimate: parseInt(response.data.gasPrice || '20000000000') * parseInt(response.data.gasLimit || '200000'),
        priceImpact: parseFloat(response.data.priceImpact || '0'),
        hops: response.data.route?.length || 2,
      };
    } catch (error) {
      this.logger.error('Uniswap route fetch error', error);
      throw error;
    }
  }

  private async getPancakeSwapRoute(
    sourceToken: TokenType,
    targetToken: TokenType,
    amount: number,
  ): Promise<TradeRoute> {
    const chainId = 56; // BSC
    const tokenIn = this.getTokenAddress(sourceToken, Chain.BSC);
    const tokenOut = this.getTokenAddress(targetToken, Chain.BSC);
    const amountIn = this.amountToWei(amount, sourceToken);

    try {
      const url = `https://api.pancakeswap.info/api/v2/quote`;
      const params = {
        tokenIn,
        tokenOut,
        amountIn,
      };

      const response = await firstValueFrom(this.httpService.get(url, { params }));

      return {
        dex: DexType.PANCAKESWAP,
        path: response.data.route || [tokenIn, tokenOut],
        expectedAmount: this.weiToAmount(response.data.amountOut, targetToken),
        gasEstimate: parseInt(response.data.gasPrice || '5000000000') * parseInt(response.data.gasLimit || '300000'),
        priceImpact: parseFloat(response.data.priceImpact || '0'),
        hops: response.data.route?.length || 2,
      };
    } catch (error) {
      this.logger.error('PancakeSwap route fetch error', error);
      throw error;
    }
  }

  private async getRaydiumRoute(
    sourceToken: TokenType,
    targetToken: TokenType,
    amount: number,
  ): Promise<TradeRoute> {
    const tokenIn = this.getTokenAddress(sourceToken, Chain.SOLANA);
    const tokenOut = this.getTokenAddress(targetToken, Chain.SOLANA);
    const amountIn = this.amountToWei(amount, sourceToken);

    try {
      const url = `https://api.raydium.io/swap/v1/quote`;
      const params = {
        inputMint: tokenIn,
        outputMint: tokenOut,
        amount: amountIn,
      };

      const response = await firstValueFrom(this.httpService.get(url, { params }));

      return {
        dex: DexType.RAYDIUM,
        path: response.data.route || [tokenIn, tokenOut],
        expectedAmount: this.weiToAmount(response.data.outAmount, targetToken),
        gasEstimate: 5000, // Solana uses different gas model
        priceImpact: parseFloat(response.data.priceImpact || '0'),
        hops: response.data.route?.length || 2,
      };
    } catch (error) {
      this.logger.error('Raydium route fetch error', error);
      throw error;
    }
  }

  private async getJupiterRoute(
    sourceToken: TokenType,
    targetToken: TokenType,
    amount: number,
  ): Promise<TradeRoute> {
    const tokenIn = this.getTokenAddress(sourceToken, Chain.SOLANA);
    const tokenOut = this.getTokenAddress(targetToken, Chain.SOLANA);
    const amountIn = this.amountToWei(amount, sourceToken);

    try {
      const url = 'https://quote-api.jup.ag/v6/quote';
      const params = {
        inputMint: tokenIn,
        outputMint: tokenOut,
        amount: amountIn,
      };

      const response = await firstValueFrom(this.httpService.get(url, { params }));

      return {
        dex: DexType.JUPITER,
        path: response.data.route.map((r: any) => r.mint),
        expectedAmount: this.weiToAmount(response.data.outAmount, targetToken),
        gasEstimate: 5000,
        priceImpact: parseFloat(response.data.priceImpactPct || '0'),
        hops: response.data.route?.length || 2,
      };
    } catch (error) {
      this.logger.error('Jupiter route fetch error', error);
      throw error;
    }
  }

  private async executeUniswapSwap(route: TradeRoute, privateKey: string): Promise<SwapTransaction> {
    // In production, this would use ethers.js to build and sign the transaction
    // For now, return a placeholder
    this.logger.log('Executing Uniswap swap', route);
    return {
      to: '0x3bFA47697909C4a78bA8F5d8455c96F9e6c8B4F0', // Uniswap Router
      data: '0x',
      value: '0',
      gasLimit: '200000',
      gasPrice: '20000000000',
    };
  }

  private async executePancakeSwap(route: TradeRoute, privateKey: string): Promise<SwapTransaction> {
    this.logger.log('Executing PancakeSwap swap', route);
    return {
      to: '0x10ED43C718714eb63d5aA57B78B54704E256024E', // PancakeSwap Router
      data: '0x',
      value: '0',
      gasLimit: '300000',
      gasPrice: '5000000000',
    };
  }

  private async executeRaydiumSwap(route: TradeRoute, privateKey: string): Promise<SwapTransaction> {
    this.logger.log('Executing Raydium swap', route);
    return {
      to: '0x',
      data: '0x',
      value: '0',
      gasLimit: '0',
      gasPrice: '0',
    };
  }

  private async executeJupiterSwap(route: TradeRoute, privateKey: string): Promise<SwapTransaction> {
    this.logger.log('Executing Jupiter swap', route);
    return {
      to: '0x',
      data: '0x',
      value: '0',
      gasLimit: '0',
      gasPrice: '0',
    };
  }

  private getTokenAddress(token: TokenType, chain: Chain): string {
    const addresses: Record<string, Record<TokenType, string>> = {
      [Chain.ETHEREUM]: {
        [TokenType.BTC]: '0x2260fac5e5542a773aa44fbcfedf7c193bc2c599',
        [TokenType.ETH]: '0xc02aaa39b223fe8d0a0e5c4f27ead9083c756cc2',
        [TokenType.USDC]: '0xa0b86991c6218b36c1d19d4a2e9eb0ce3606eb48',
        [TokenType.USDT]: '0xdac17f958d2ee523a2206206994597c13d831ec7',
      },
      [Chain.BSC]: {
        [TokenType.BTC]: '0x7130d2A12B9BCbFAe4f2634d864A1Ee1Ce3Ead9c',
        [TokenType.ETH]: '0x2170Ed0880ac9D75be0eCc1B9937C5dD8679fAe9',
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
    const decimals = token === TokenType.USDC || token === TokenType.USDT ? 6 : 18;
    return (amount * 10 ** decimals).toString();
  }

  private weiToAmount(wei: string, token: TokenType): number {
    const decimals = token === TokenType.USDC || token === TokenType.USDT ? 6 : 18;
    return parseFloat(wei) / 10 ** decimals;
  }
}
