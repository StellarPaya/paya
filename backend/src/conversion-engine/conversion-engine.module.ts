import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { HttpModule } from '@nestjs/axios';
import { ConfigModule } from '@nestjs/config';
import { Conversion } from './entities/conversion.entity';
import { ConversionEngineController } from './conversion-engine.controller';
import { ConversionService } from './modules/conversion.service';
import { PriceDiscoveryService } from './modules/price-discovery.service';
import { SlippageProtectionService } from './modules/slippage-protection.service';
import { DexIntegrationService } from './modules/dex-integration.service';
import { TransactionManagementService } from './modules/transaction-management.service';
import { BridgeIntegrationService } from './modules/bridge-integration.service';
import { StellarSettlementService } from './modules/stellar-settlement.service';
import { RiskManagementService } from './modules/risk-management.service';
import { MonitoringService } from './modules/monitoring.service';

@Module({
  imports: [
    TypeOrmModule.forFeature([Conversion]),
    HttpModule,
    ConfigModule,
  ],
  controllers: [ConversionEngineController],
  providers: [
    ConversionService,
    PriceDiscoveryService,
    SlippageProtectionService,
    DexIntegrationService,
    TransactionManagementService,
    BridgeIntegrationService,
    StellarSettlementService,
    RiskManagementService,
    MonitoringService,
  ],
  exports: [
    ConversionService,
    PriceDiscoveryService,
    SlippageProtectionService,
    DexIntegrationService,
    TransactionManagementService,
    BridgeIntegrationService,
    StellarSettlementService,
    RiskManagementService,
    MonitoringService,
  ],
})
export class ConversionEngineModule {}
