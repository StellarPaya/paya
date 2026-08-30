import { Injectable, Logger } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { DomainEvent, EventHandler } from '../interfaces/domain-event.interface';
import {
  SubscriptionCreatedEvent,
  SubscriptionCancelledEvent,
  SubscriptionPaymentProcessedEvent,
  SubscriptionTrialEndedEvent,
} from '../events/subscription.events';

interface SubscriptionAnalytics {
  merchantId: string;
  totalSubscriptions: number;
  activeSubscriptions: number;
  trialingSubscriptions: number;
  pastDueSubscriptions: number;
  cancelledSubscriptions: number;
  monthlyRecurringRevenue: bigint;
}

@Injectable()
export class SubscriptionAnalyticsProjection implements EventHandler {
  private readonly logger = new Logger(SubscriptionAnalyticsProjection.name);
  private analytics: Map<string, SubscriptionAnalytics> = new Map();

  constructor(
    @InjectRepository('subscription_analytics')
    private analyticsRepository: Repository<any>,
  ) {
    this.loadAnalytics();
  }

  private async loadAnalytics(): Promise<void> {
    const records = await this.analyticsRepository.find();
    for (const record of records) {
      this.analytics.set(record.merchant_id, {
        merchantId: record.merchant_id,
        totalSubscriptions: Number(record.total_subscriptions),
        activeSubscriptions: Number(record.active_subscriptions),
        trialingSubscriptions: Number(record.trialing_subscriptions),
        pastDueSubscriptions: Number(record.past_due_subscriptions),
        cancelledSubscriptions: Number(record.cancelled_subscriptions),
        monthlyRecurringRevenue: BigInt(record.monthly_recurring_revenue || 0),
      });
    }
  }

  async handle(event: DomainEvent): Promise<void> {
    switch (event.eventType) {
      case 'SubscriptionCreated':
        await this.handleSubscriptionCreated(event as SubscriptionCreatedEvent);
        break;
      case 'SubscriptionCancelled':
        await this.handleSubscriptionCancelled(event as SubscriptionCancelledEvent);
        break;
      case 'SubscriptionPaymentProcessed':
        await this.handleSubscriptionPaymentProcessed(event as SubscriptionPaymentProcessedEvent);
        break;
      case 'SubscriptionTrialEnded':
        await this.handleSubscriptionTrialEnded(event as SubscriptionTrialEndedEvent);
        break;
    }
  }

  private async handleSubscriptionCreated(event: SubscriptionCreatedEvent): Promise<void> {
    const merchantId = event.data.merchantId;
    let analytics = this.analytics.get(merchantId);

    if (!analytics) {
      analytics = {
        merchantId,
        totalSubscriptions: 0,
        activeSubscriptions: 0,
        trialingSubscriptions: 0,
        pastDueSubscriptions: 0,
        cancelledSubscriptions: 0,
        monthlyRecurringRevenue: BigInt(0),
      };
      this.analytics.set(merchantId, analytics);
    }

    analytics.totalSubscriptions += 1;
    analytics.monthlyRecurringRevenue += event.data.currentAmount;

    if (event.data.status === 'TRIALING') {
      analytics.trialingSubscriptions += 1;
    } else {
      analytics.activeSubscriptions += 1;
    }

    await this.saveAnalytics(analytics);
    this.logger.log(`Updated subscription analytics for merchant ${merchantId}`);
  }

  private async handleSubscriptionCancelled(event: SubscriptionCancelledEvent): Promise<void> {
    const merchantId = this.getMerchantIdFromSubscriptionId(event.data.subscriptionId);
    if (!merchantId) return;

    const analytics = this.analytics.get(merchantId);
    if (!analytics) return;

    analytics.cancelledSubscriptions += 1;
    analytics.activeSubscriptions -= 1;

    await this.saveAnalytics(analytics);
    this.logger.log(`Subscription cancelled for merchant ${merchantId}`);
  }

  private async handleSubscriptionPaymentProcessed(event: SubscriptionPaymentProcessedEvent): Promise<void> {
    const merchantId = this.getMerchantIdFromSubscriptionId(event.data.subscriptionId);
    if (!merchantId) return;

    const analytics = this.analytics.get(merchantId);
    if (!analytics) return;

    await this.saveAnalytics(analytics);
    this.logger.log(`Subscription payment processed for merchant ${merchantId}`);
  }

  private async handleSubscriptionTrialEnded(event: SubscriptionTrialEndedEvent): Promise<void> {
    const merchantId = this.getMerchantIdFromSubscriptionId(event.data.subscriptionId);
    if (!merchantId) return;

    const analytics = this.analytics.get(merchantId);
    if (!analytics) return;

    analytics.trialingSubscriptions -= 1;
    analytics.activeSubscriptions += 1;

    await this.saveAnalytics(analytics);
    this.logger.log(`Subscription trial ended for merchant ${merchantId}`);
  }

  async getMetrics(merchantId: string): Promise<SubscriptionAnalytics | null> {
    await this.loadAnalytics();
    return this.analytics.get(merchantId) || null;
  }

  async getAllMetrics(): Promise<SubscriptionAnalytics[]> {
    await this.loadAnalytics();
    return Array.from(this.analytics.values());
  }

  private async saveAnalytics(analytics: SubscriptionAnalytics): Promise<void> {
    await this.analyticsRepository.upsert(
      {
        merchant_id: analytics.merchantId,
        total_subscriptions: analytics.totalSubscriptions,
        active_subscriptions: analytics.activeSubscriptions,
        trialing_subscriptions: analytics.trialingSubscriptions,
        past_due_subscriptions: analytics.pastDueSubscriptions,
        cancelled_subscriptions: analytics.cancelledSubscriptions,
        monthly_recurring_revenue: analytics.monthlyRecurringRevenue.toString(),
        updated_at: new Date(),
      },
      ['merchant_id'],
    );
  }

  private getMerchantIdFromSubscriptionId(subscriptionId: string): string | null {
    // In a real implementation, this would query the event store or a cache
    return null;
  }

  async rebuildFromEvents(eventStore: any): Promise<void> {
    this.logger.log('Rebuilding subscription analytics projection from events');
    
    this.analytics.clear();
    await this.analyticsRepository.clear();

    const events = await eventStore.readAllEvents();
    for (const event of events) {
      if (event.eventType.startsWith('Subscription')) {
        await this.handle(event);
      }
    }

    this.logger.log('Subscription analytics projection rebuilt successfully');
  }
}
