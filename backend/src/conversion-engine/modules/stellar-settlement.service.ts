import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { Server, TransactionBuilder, Asset, Networks } from 'stellar-sdk';
import { TokenType } from '../entities/conversion.entity';

interface SettlementData {
  merchantVaultAddress: string;
  amount: number;
  memo?: string;
  txHash?: string;
  status: 'PENDING' | 'COMPLETED' | 'FAILED';
  completedAt?: Date;
}

@Injectable()
export class StellarSettlementService {
  private readonly logger = new Logger(StellarSettlementService.name);
  private server: Server;
  private merchantVaultAddress: string;

  constructor(private configService: ConfigService) {
    const horizonUrl = this.configService.get('STELLAR_HORIZON_URL') || 'https://horizon-testnet.stellar.org';
    this.server = new Server(horizonUrl);
    this.merchantVaultAddress = this.configService.get('MERCHANT_VAULT_ADDRESS') || '';
  }

  async depositToVault(
    amount: number,
    privateKey: string,
    memo?: string,
  ): Promise<SettlementData> {
    this.logger.log(`Depositing ${amount} USDC to merchant vault`);

    try {
      const sourceKeypair = this.parsePrivateKey(privateKey);
      const sourceAccount = await this.server.loadAccount(sourceKeypair.publicKey());

      const usdcAsset = new Asset(
        'USDC',
        'GA5ZSEJYB37JRC5AVCIA5MOP4RHTM335X2KGFX3BORWE6BPNMK2MIRF4',
      );

      const transaction = new TransactionBuilder(sourceAccount, {
        fee: this.configService.get('STELLAR_FEE') || '100',
        networkPassphrase: Networks.TESTNET,
      })
        .addOperation({
          type: 'payment',
          destination: this.merchantVaultAddress,
          asset: usdcAsset,
          amount: amount.toString(),
        })
        .addMemo(memo ? this.buildMemo(memo) : undefined)
        .setTimeout(30)
        .build();

      transaction.sign(sourceKeypair);

      const result = await this.server.submitTransaction(transaction);

      this.logger.log(`Settlement transaction submitted: ${result.hash}`);

      return {
        merchantVaultAddress: this.merchantVaultAddress,
        amount,
        memo,
        txHash: result.hash,
        status: 'PENDING',
      };
    } catch (error) {
      this.logger.error('Stellar settlement failed', error);
      throw new Error(`Stellar settlement failed: ${error.message}`);
    }
  }

  async confirmSettlement(txHash: string): Promise<SettlementData> {
    this.logger.log(`Confirming settlement transaction: ${txHash}`);

    try {
      const transaction = await this.server.transactions().transaction(txHash).call();

      if (transaction.successful) {
        const operations = transaction.operations;
        const paymentOp = operations.find((op: any) => op.type === 'payment');

        if (paymentOp) {
          return {
            merchantVaultAddress: paymentOp.destination,
            amount: parseFloat(paymentOp.amount),
            memo: transaction.memo,
            txHash,
            status: 'COMPLETED',
            completedAt: new Date(transaction.created_at),
          };
        }
      }

      throw new Error('Transaction not successful or no payment operation found');
    } catch (error) {
      this.logger.error('Settlement confirmation failed', error);
      throw new Error(`Settlement confirmation failed: ${error.message}`);
    }
  }

  async waitForSettlementConfirmation(
    txHash: string,
    timeout: number = 60000, // 1 minute
  ): Promise<SettlementData> {
    const startTime = Date.now();

    while (Date.now() - startTime < timeout) {
      try {
        const result = await this.confirmSettlement(txHash);
        if (result.status === 'COMPLETED') {
          return result;
        }
      } catch (error) {
        // Transaction might not be confirmed yet, continue waiting
      }

      await this.sleep(2000);
    }

    throw new Error(`Settlement confirmation timeout for transaction ${txHash}`);
  }

  async getVaultBalance(): Promise<number> {
    try {
      const account = await this.server.loadAccount(this.merchantVaultAddress);
      const usdcBalance = account.balances.find(
        (balance: any) =>
          balance.asset_code === 'USDC' &&
          balance.asset_issuer === 'GA5ZSEJYB37JRC5AVCIA5MOP4RHTM335X2KGFX3BORWE6BPNMK2MIRF4',
      );

      return usdcBalance ? parseFloat(usdcBalance.balance) : 0;
    } catch (error) {
      this.logger.error('Failed to get vault balance', error);
      return 0;
    }
  }

  async reconcileSettlements(
    fromTime: Date,
    toTime: Date,
  ): Promise<{ settlements: SettlementData[]; totalAmount: number }> {
    this.logger.log(`Reconciling settlements from ${fromTime} to ${toTime}`);

    try {
      const transactions = await this.server
        .transactions()
        .forAccount(this.merchantVaultAddress)
        .limit(100)
        .call();

      const settlements: SettlementData[] = [];
      let totalAmount = 0;

      for (const record of transactions.records) {
        const txTime = new Date(record.created_at);
        if (txTime >= fromTime && txTime <= toTime) {
          const operations = record.operations;
          const paymentOp = operations.find((op: any) => op.type === 'payment');

          if (paymentOp && record.successful) {
            const amount = parseFloat(paymentOp.amount);
            totalAmount += amount;

            settlements.push({
              merchantVaultAddress: this.merchantVaultAddress,
              amount,
              memo: record.memo,
              txHash: record.hash,
              status: 'COMPLETED',
              completedAt: txTime,
            });
          }
        }
      }

      return { settlements, totalAmount };
    } catch (error) {
      this.logger.error('Settlement reconciliation failed', error);
      throw new Error(`Settlement reconciliation failed: ${error.message}`);
    }
  }

  async handleSettlementFailure(
    txHash: string,
    error: string,
    retryCount: number,
    maxRetries: number,
  ): Promise<{ shouldRetry: boolean; newTxHash?: string }> {
    this.logger.error(`Settlement transaction ${txHash} failed: ${error}`);

    if (retryCount >= maxRetries) {
      return { shouldRetry: false };
    }

    const retryableErrors = [
      'timeout',
      'network error',
      'bad sequence',
      'tx_failed',
    ];

    const isRetryable = retryableErrors.some((err) => error.toLowerCase().includes(err));

    if (!isRetryable) {
      return { shouldRetry: false };
    }

    const waitTime = Math.min(5000 * 2 ** retryCount, 30000);
    await this.sleep(waitTime);

    return { shouldRetry: true };
  }

  private parsePrivateKey(privateKey: string): any {
    // In production, this would use Stellar SDK to parse the private key
    // For now, return a mock keypair
    return {
      publicKey: 'GD5JQHFHKCVRXNSBBMUYNMIIMET3JRUJIK4T4ZLWIOJTAMY7RDC5U7XM',
      secret: privateKey,
    };
  }

  private buildMemo(memo: string): any {
    // Build Stellar memo from string
    return {
      type: 'text',
      value: memo,
    };
  }

  private sleep(ms: number): Promise<void> {
    return new Promise((resolve) => setTimeout(resolve, ms));
  }

  async validateVaultAddress(address: string): Promise<boolean> {
    try {
      await this.server.loadAccount(address);
      return true;
    } catch (error) {
      this.logger.error(`Invalid vault address: ${address}`);
      return false;
    }
  }

  async getTransactionHistory(
    limit: number = 10,
  ): Promise<{ transactions: any[]; total: number }> {
    try {
      const transactions = await this.server
        .transactions()
        .forAccount(this.merchantVaultAddress)
        .limit(limit)
        .order('desc')
        .call();

      return {
        transactions: transactions.records,
        total: transactions.records.length,
      };
    } catch (error) {
      this.logger.error('Failed to get transaction history', error);
      return { transactions: [], total: 0 };
    }
  }
}
