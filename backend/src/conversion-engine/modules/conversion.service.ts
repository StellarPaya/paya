import { Injectable, Logger } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Conversion, ConversionStatus, Chain, TokenType } from '../entities/conversion.entity';
import { CreateConversionDto } from '../dto/create-conversion.dto';
import { ConversionResponseDto } from '../dto/conversion-response.dto';
import { PriceDiscoveryService } from './price-discovery.service';
import { SlippageProtectionService } from './slippage-protection.service';
import { DexIntegrationService } from './dex-integration.service';
import { TransactionManagementService } from './transaction-management.service';
import { BridgeIntegrationService } from './bridge-integration.service';
import { StellarSettlementService } from './stellar-settlement.service';
import { RiskManagementService } from './risk-management.service';

@Injectable()
export class ConversionService {
  private readonly logger = new Logger(ConversionService.name);

  constructor(
    @InjectRepository(Conversion)
    private conversionRepository: Repository<Conversion>,
    private priceDiscoveryService: PriceDiscoveryService,
    private slippageProtectionService: SlippageProtectionService,
    private dexIntegrationService: DexIntegrationService,
    private transactionManagementService: TransactionManagementService,
    private bridgeIntegrationService: BridgeIntegrationService,
    private stellarSettlementService: StellarSettlementService,
    private riskManagementService: RiskManagementService,
  ) {}

  async createConversion(dto: CreateConversionDto): Promise<ConversionResponseDto> {
    this.logger.log(`Creating conversion for merchant ${dto.merchantId}`);

    // Risk assessment
    const riskAssessment = await this.riskManagementService.assessRisk(
      dto.merchantId,
      dto.sourceToken,
      dto.targetToken,
      dto.sourceAmount,
    );

    if (!riskAssessment.approved) {
      throw new Error(`Risk assessment failed: ${riskAssessment.reasons.join(', ')}`);
    }

    // Price discovery
    const priceData = await this.priceDiscoveryService.getBestPrice(
      dto.sourceToken,
      dto.sourceChain,
      dto.targetToken,
      dto.targetChain,
      dto.sourceAmount,
    );

    // Slippage calculation
    const slippageData = await this.slippageProtectionService.calculateSlippage(
      dto.sourceToken,
      dto.sourceChain,
      dto.targetToken,
      dto.targetChain,
      dto.sourceAmount,
      priceData.price,
      dto.slippageTolerance,
    );

    // Calculate expected amount
    const expectedAmount = dto.sourceAmount * priceData.price * (1 - slippageData.expectedSlippage / 100);

    // Create conversion record
    const conversion = this.conversionRepository.create({
      merchantId: dto.merchantId,
      sourceToken: dto.sourceToken,
      sourceChain: dto.sourceChain,
      sourceAmount: dto.sourceAmount,
      targetToken: dto.targetToken,
      targetChain: dto.targetChain,
      targetAmount: 0,
      expectedAmount,
      slippageTolerance: slippageData.slippageTolerance,
      actualSlippage: 0,
      status: ConversionStatus.PENDING,
      priceData: priceData,
      retryCount: 0,
      maxRetries: 3,
    });

    const savedConversion = await this.conversionRepository.save(conversion);

    return this.mapToResponseDto(savedConversion);
  }

  async executeConversion(conversionId: string): Promise<ConversionResponseDto> {
    this.logger.log(`Executing conversion ${conversionId}`);

    const conversion = await this.conversionRepository.findOne({ where: { id: conversionId } });
    if (!conversion) {
      throw new Error('Conversion not found');
    }

    try {
      // Update status
      conversion.status = ConversionStatus.PRICE_DISCOVERY;
      await this.conversionRepository.save(conversion);

      // Get best DEX route
      const route = await this.dexIntegrationService.getBestRoute(
        conversion.sourceToken,
        conversion.sourceChain,
        conversion.targetToken,
        conversion.targetChain,
        conversion.sourceAmount,
      );

      conversion.dexType = route.dex;
      conversion.routeData = route;
      conversion.status = ConversionStatus.EXECUTING;
      await this.conversionRepository.save(conversion);

      // Execute swap
      const privateKey = this.getPrivateKeyForChain(conversion.sourceChain);
      const swapTx = await this.dexIntegrationService.executeSwap(route, privateKey);

      // Build and submit transaction
      const txData = await this.transactionManagementService.buildTransaction(
        conversion.sourceChain,
        swapTx.to,
        swapTx.data,
        swapTx.value,
        privateKey,
      );

      const signedTx = await this.transactionManagementService.signTransaction(txData, privateKey);
      const submitResult = await this.transactionManagementService.submitTransaction(
        conversion.sourceChain,
        signedTx,
      );

      conversion.sourceTxHash = submitResult.txHash;
      conversion.transactionData = swapTx;
      await this.conversionRepository.save(conversion);

      // Wait for confirmation
      const txResult = await this.transactionManagementService.waitForConfirmation(
        submitResult.txHash,
        conversion.sourceChain,
      );

      if (txResult.status !== 'CONFIRMED') {
        throw new Error('Swap transaction failed');
      }

      // Calculate actual slippage
      const actualAmount = conversion.sourceAmount * parseFloat(route.expectedAmount.toString()) / conversion.sourceAmount;
      conversion.actualSlippage = Math.abs((actualAmount - conversion.expectedAmount) / conversion.expectedAmount) * 100;

      // Check if bridging is needed
      if (conversion.targetChain !== Chain.STELLAR) {
        conversion.status = ConversionStatus.BRIDGING;
        await this.conversionRepository.save(conversion);

        // Get best bridge
        const bridgeQuote = await this.bridgeIntegrationService.getBestBridge(
          conversion.sourceChain,
          conversion.targetChain,
          actualAmount,
        );

        conversion.bridgeType = bridgeQuote.bridge;
        conversion.bridgeData = bridgeQuote;
        await this.conversionRepository.save(conversion);

        // Execute bridge
        const bridgeTx = await this.bridgeIntegrationService.executeBridge(bridgeQuote, privateKey);
        const bridgeResult = await this.bridgeIntegrationService.waitForBridgeCompletion(
          bridgeTx.to,
          bridgeQuote.bridge,
        );

        conversion.bridgeTxHash = bridgeResult.txHash;
        await this.conversionRepository.save(conversion);
      }

      // Final settlement on Stellar
      conversion.status = ConversionStatus.SETTLING;
      await this.conversionRepository.save(conversion);

      const stellarPrivateKey = this.getPrivateKeyForChain(Chain.STELLAR);
      const settlementResult = await this.stellarSettlementService.depositToVault(
        actualAmount,
        stellarPrivateKey,
        conversionId,
      );

      const confirmedSettlement = await this.stellarSettlementService.waitForSettlementConfirmation(
        settlementResult.txHash,
      );

      conversion.status = ConversionStatus.COMPLETED;
      conversion.targetAmount = actualAmount;
      conversion.settlementTxHash = confirmedSettlement.txHash;
      conversion.completedAt = new Date();
      await this.conversionRepository.save(conversion);

      // Update risk management
      await this.riskManagementService.executeTrade(
        conversion.merchantId,
        conversion.sourceToken,
        conversion.targetToken,
        conversion.sourceAmount,
      );

      return this.mapToResponseDto(conversion);
    } catch (error) {
      this.logger.error(`Conversion ${conversionId} failed`, error);

      conversion.status = ConversionStatus.FAILED;
      conversion.errorDetails = {
        message: error.message,
        timestamp: new Date(),
      };
      conversion.retryCount += 1;

      if (conversion.retryCount < conversion.maxRetries) {
        await this.conversionRepository.save(conversion);
        // Retry logic would go here
      } else {
        await this.conversionRepository.save(conversion);
      }

      throw error;
    }
  }

  async getConversion(conversionId: string): Promise<ConversionResponseDto> {
    const conversion = await this.conversionRepository.findOne({ where: { id: conversionId } });
    if (!conversion) {
      throw new Error('Conversion not found');
    }
    return this.mapToResponseDto(conversion);
  }

  async getConversionsByMerchant(merchantId: string): Promise<ConversionResponseDto[]> {
    const conversions = await this.conversionRepository.find({
      where: { merchantId },
      order: { createdAt: 'DESC' },
    });
    return conversions.map((c) => this.mapToResponseDto(c));
  }

  async cancelConversion(conversionId: string): Promise<ConversionResponseDto> {
    const conversion = await this.conversionRepository.findOne({ where: { id: conversionId } });
    if (!conversion) {
      throw new Error('Conversion not found');
    }

    if (conversion.status !== ConversionStatus.PENDING && conversion.status !== ConversionStatus.PRICE_DISCOVERY) {
      throw new Error('Conversion cannot be cancelled in current state');
    }

    conversion.status = ConversionStatus.CANCELLED;
    await this.conversionRepository.save(conversion);

    return this.mapToResponseDto(conversion);
  }

  async retryConversion(conversionId: string): Promise<ConversionResponseDto> {
    const conversion = await this.conversionRepository.findOne({ where: { id: conversionId } });
    if (!conversion) {
      throw new Error('Conversion not found');
    }

    if (conversion.status !== ConversionStatus.FAILED) {
      throw new Error('Only failed conversions can be retried');
    }

    if (conversion.retryCount >= conversion.maxRetries) {
      throw new Error('Maximum retry attempts exceeded');
    }

    return this.executeConversion(conversionId);
  }

  private mapToResponseDto(conversion: Conversion): ConversionResponseDto {
    return {
      id: conversion.id,
      merchantId: conversion.merchantId,
      sourceToken: conversion.sourceToken,
      sourceChain: conversion.sourceChain,
      sourceAmount: conversion.sourceAmount,
      targetToken: conversion.targetToken,
      targetChain: conversion.targetChain,
      targetAmount: conversion.targetAmount,
      expectedAmount: conversion.expectedAmount,
      slippageTolerance: conversion.slippageTolerance,
      actualSlippage: conversion.actualSlippage,
      status: conversion.status,
      dexType: conversion.dexType,
      bridgeType: conversion.bridgeType,
      priceData: conversion.priceData,
      routeData: conversion.routeData,
      transactionData: conversion.transactionData,
      bridgeData: conversion.bridgeData,
      sourceTxHash: conversion.sourceTxHash,
      bridgeTxHash: conversion.bridgeTxHash,
      settlementTxHash: conversion.settlementTxHash,
      feeAmount: conversion.feeAmount,
      gasAmount: conversion.gasAmount,
      createdAt: conversion.createdAt,
      updatedAt: conversion.updatedAt,
      completedAt: conversion.completedAt,
    };
  }

  private getPrivateKeyForChain(chain: Chain): string {
    // In production, this would fetch from secure key management system
    // For now, return a placeholder
    return '0x' + 'a'.repeat(64);
  }
}
