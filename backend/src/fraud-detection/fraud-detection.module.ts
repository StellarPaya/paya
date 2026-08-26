import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { RiskScoringService } from './risk-scoring.service';
import { RiskScoringController } from './risk-scoring.controller';
import { BehavioralAnalysisService } from './behavioral-analysis.service';
import { BehavioralAnalysisController } from './behavioral-analysis.controller';
import { NetworkAnalysisService } from './network-analysis.service';
import { NetworkAnalysisController } from './network-analysis.controller';
import { RiskScoreEntity } from './entities/risk-score.entity';
import { FraudIncidentEntity } from './entities/fraud-incident.entity';
import { BehavioralProfileEntity } from './entities/behavioral-profile.entity';
import { TransactionGraphEdgeEntity } from './entities/transaction-graph-edge.entity';
import { MLModelVersionEntity } from './entities/ml-model-version.entity';

@Module({
  imports: [
    TypeOrmModule.forFeature([
      RiskScoreEntity,
      FraudIncidentEntity,
      BehavioralProfileEntity,
      TransactionGraphEdgeEntity,
      MLModelVersionEntity,
    ]),
  ],
  controllers: [
    RiskScoringController,
    BehavioralAnalysisController,
    NetworkAnalysisController,
  ],
  providers: [
    RiskScoringService,
    BehavioralAnalysisService,
    NetworkAnalysisService,
  ],
  exports: [
    RiskScoringService,
    BehavioralAnalysisService,
    NetworkAnalysisService,
  ],
})
export class FraudDetectionModule {}