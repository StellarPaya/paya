import { Module } from '@nestjs/common';
import { EventReplayService } from './event-replay.service';
import { ProjectionRebuildService } from './projection-rebuild.service';
import { EventSourcingModule } from '../event-sourcing.module';
import { PaymentAnalyticsProjection } from '../projections/payment-analytics-projection.service';
import { SubscriptionAnalyticsProjection } from '../projections/subscription-analytics-projection.service';
import { RealtimeMonitoringProjection } from '../projections/realtime-monitoring-projection.service';

@Module({
  imports: [EventSourcingModule],
  providers: [
    EventReplayService,
    ProjectionRebuildService,
    PaymentAnalyticsProjection,
    SubscriptionAnalyticsProjection,
    RealtimeMonitoringProjection,
  ],
  exports: [
    EventReplayService,
    ProjectionRebuildService,
    PaymentAnalyticsProjection,
    SubscriptionAnalyticsProjection,
    RealtimeMonitoringProjection,
  ],
})
export class ReplayModule {}
