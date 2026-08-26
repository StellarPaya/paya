import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { HttpModule } from '@nestjs/axios';
import { CrossChainRelayerService } from './cross-chain-relayer.service';
import { CrossChainRelayerController } from './cross-chain-relayer.controller';
import { PriceOracleService } from './price-oracle.service';
import { PriceOracleController } from './price-oracle.controller';
import { UnifiedSettlementService } from './unified-settlement.service';
import { UnifiedSettlementController } from './unified-settlement.controller';
import { SwapEntity } from './entities/swap.entity';
import { PriceFeedEntity } from './entities/price-feed.entity';

@Module({
  imports: [
    TypeOrmModule.forFeature([
      SwapEntity,
      PriceFeedEntity,
    ]),
    HttpModule,
  ],
  controllers: [
    CrossChainRelayerController,
    PriceOracleController,
    UnifiedSettlementController,
  ],
  providers: [
    CrossChainRelayerService,
    PriceOracleService,
    UnifiedSettlementService,
  ],
  exports: [
    CrossChainRelayerService,
    PriceOracleService,
    UnifiedSettlementService,
  ],
})
export class CrossChainBridgeModule {}