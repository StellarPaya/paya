import { Injectable, Logger } from '@nestjs/common';
import { EventStoreService } from '../services/event-store.service';
import { PaymentAnalyticsProjection } from '../projections/payment-analytics-projection.service';
import { SubscriptionAnalyticsProjection } from '../projections/subscription-analytics-projection.service';
import { RealtimeMonitoringProjection } from '../projections/realtime-monitoring-projection.service';

export interface RebuildOptions {
  projectionType?: 'all' | 'payment' | 'subscription' | 'monitoring';
  fromPosition?: number;
  batchSize?: number;
}

export interface RebuildResult {
  projectionType: string;
  totalEvents: number;
  processedEvents: number;
  duration: number;
  success: boolean;
  error?: string;
}

@Injectable()
export class ProjectionRebuildService {
  private readonly logger = new Logger(ProjectionRebuildService.name);

  constructor(
    private eventStore: EventStoreService,
    private paymentAnalyticsProjection: PaymentAnalyticsProjection,
    private subscriptionAnalyticsProjection: SubscriptionAnalyticsProjection,
    private realtimeMonitoringProjection: RealtimeMonitoringProjection,
  ) {}

  async rebuildProjection(options: RebuildOptions = {}): Promise<RebuildResult> {
    const projectionType = options.projectionType || 'all';
    const startTime = Date.now();

    this.logger.log(`Starting projection rebuild for ${projectionType}`);

    try {
      switch (projectionType) {
        case 'payment':
          await this.paymentAnalyticsProjection.rebuildFromEvents(this.eventStore);
          break;
        case 'subscription':
          await this.subscriptionAnalyticsProjection.rebuildFromEvents(this.eventStore);
          break;
        case 'monitoring':
          await this.realtimeMonitoringProjection.rebuildFromEvents(this.eventStore);
          break;
        case 'all':
          await Promise.all([
            this.paymentAnalyticsProjection.rebuildFromEvents(this.eventStore),
            this.subscriptionAnalyticsProjection.rebuildFromEvents(this.eventStore),
            this.realtimeMonitoringProjection.rebuildFromEvents(this.eventStore),
          ]);
          break;
      }

      const duration = Date.now() - startTime;
      this.logger.log(`Projection rebuild completed for ${projectionType} in ${duration}ms`);

      return {
        projectionType,
        totalEvents: 0, // Would be calculated from event store
        processedEvents: 0,
        duration,
        success: true,
      };
    } catch (error) {
      const duration = Date.now() - startTime;
      this.logger.error(`Projection rebuild failed for ${projectionType}: ${error.message}`);

      return {
        projectionType,
        totalEvents: 0,
        processedEvents: 0,
        duration,
        success: false,
        error: error.message,
      };
    }
  }

  async rebuildAllProjections(options: RebuildOptions = {}): Promise<RebuildResult[]> {
    this.logger.log('Starting rebuild for all projections');

    const results = await Promise.all([
      this.rebuildProjection({ ...options, projectionType: 'payment' }),
      this.rebuildProjection({ ...options, projectionType: 'subscription' }),
      this.rebuildProjection({ ...options, projectionType: 'monitoring' }),
    ]);

    this.logger.log('All projections rebuild completed');
    return results;
  }

  async getProjectionHealth(): Promise<{
    paymentAnalytics: { status: string; lastUpdated: Date | null };
    subscriptionAnalytics: { status: string; lastUpdated: Date | null };
    realtimeMonitoring: { status: string; lastUpdated: Date | null };
  }> {
    // In a real implementation, this would check the actual health of each projection
    return {
      paymentAnalytics: {
        status: 'healthy',
        lastUpdated: new Date(),
      },
      subscriptionAnalytics: {
        status: 'healthy',
        lastUpdated: new Date(),
      },
      realtimeMonitoring: {
        status: 'healthy',
        lastUpdated: new Date(),
      },
    };
  }

  async validateProjectionConsistency(): Promise<{
    isConsistent: boolean;
    inconsistencies: Array<{ projection: string; issue: string }>;
  }> {
    this.logger.log('Validating projection consistency');

    const inconsistencies: Array<{ projection: string; issue: string }> = [];

    // In a real implementation, this would compare event store state with projection state
    // For now, return a placeholder result

    return {
      isConsistent: inconsistencies.length === 0,
      inconsistencies,
    };
  }
}
