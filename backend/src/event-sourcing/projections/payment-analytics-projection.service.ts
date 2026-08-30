import { Injectable, Logger } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { DomainEvent, EventHandler } from '../interfaces/domain-event.interface';
import { PaymentCreatedEvent, PaymentConfirmedEvent, PaymentSettledEvent, PaymentFailedEvent, PaymentCancelledEvent } from '../events/payment.events';

interface PaymentAnalytics {
  merchantId: string;
  totalPayments: number;
  totalAmount: bigint;
  successfulPayments: number;
  failedPayments: number;
  pendingPayments: number;
  lastPaymentAt: Date | null;
}

@Injectable()
export class PaymentAnalyticsProjection implements EventHandler {
  private readonly logger = new Logger(PaymentAnalyticsProjection.name);
  private analytics: Map<string, PaymentAnalytics> = new Map();

  constructor(
    @InjectRepository('payment_analytics')
    private analyticsRepository: Repository<any>,
  ) {
    this.loadAnalytics();
  }

  private async loadAnalytics(): Promise<void> {
    const records = await this.analyticsRepository.find();
    for (const record of records) {
      this.analytics.set(record.merchantId, {
        merchantId: record.merchantId,
        totalPayments: Number(record.total_payments),
        totalAmount: BigInt(record.total_amount || 0),
        successfulPayments: Number(record.successful_payments),
        failedPayments: Number(record.failed_payments),
        pendingPayments: Number(record.pending_payments),
        lastPaymentAt: record.last_payment_at,
      });
    }
  }

  async handle(event: DomainEvent): Promise<void> {
    switch (event.eventType) {
      case 'PaymentCreated':
        await this.handlePaymentCreated(event as PaymentCreatedEvent);
        break;
      case 'PaymentConfirmed':
        await this.handlePaymentConfirmed(event as PaymentConfirmedEvent);
        break;
      case 'PaymentSettled':
        await this.handlePaymentSettled(event as PaymentSettledEvent);
        break;
      case 'PaymentFailed':
        await this.handlePaymentFailed(event as PaymentFailedEvent);
        break;
      case 'PaymentCancelled':
        await this.handlePaymentCancelled(event as PaymentCancelledEvent);
        break;
    }
  }

  private async handlePaymentCreated(event: PaymentCreatedEvent): Promise<void> {
    const merchantId = event.data.merchantId;
    let analytics = this.analytics.get(merchantId);

    if (!analytics) {
      analytics = {
        merchantId,
        totalPayments: 0,
        totalAmount: BigInt(0),
        successfulPayments: 0,
        failedPayments: 0,
        pendingPayments: 0,
        lastPaymentAt: null,
      };
      this.analytics.set(merchantId, analytics);
    }

    analytics.totalPayments += 1;
    analytics.totalAmount += event.data.amount;
    analytics.pendingPayments += 1;
    analytics.lastPaymentAt = event.timestamp;

    await this.saveAnalytics(analytics);
    this.logger.log(`Updated payment analytics for merchant ${merchantId}`);
  }

  private async handlePaymentConfirmed(event: PaymentConfirmedEvent): Promise<void> {
    const merchantId = this.getMerchantIdFromPaymentId(event.data.paymentId);
    if (!merchantId) return;

    const analytics = this.analytics.get(merchantId);
    if (!analytics) return;

    analytics.pendingPayments -= 1;
    analytics.successfulPayments += 1;

    await this.saveAnalytics(analytics);
    this.logger.log(`Payment confirmed for merchant ${merchantId}`);
  }

  private async handlePaymentSettled(event: PaymentSettledEvent): Promise<void> {
    const merchantId = this.getMerchantIdFromPaymentId(event.data.paymentId);
    if (!merchantId) return;

    const analytics = this.analytics.get(merchantId);
    if (!analytics) return;

    await this.saveAnalytics(analytics);
    this.logger.log(`Payment settled for merchant ${merchantId}`);
  }

  private async handlePaymentFailed(event: PaymentFailedEvent): Promise<void> {
    const merchantId = this.getMerchantIdFromPaymentId(event.data.paymentId);
    if (!merchantId) return;

    const analytics = this.analytics.get(merchantId);
    if (!analytics) return;

    analytics.pendingPayments -= 1;
    analytics.failedPayments += 1;

    await this.saveAnalytics(analytics);
    this.logger.log(`Payment failed for merchant ${merchantId}`);
  }

  private async handlePaymentCancelled(event: PaymentCancelledEvent): Promise<void> {
    const merchantId = this.getMerchantIdFromPaymentId(event.data.paymentId);
    if (!merchantId) return;

    const analytics = this.analytics.get(merchantId);
    if (!analytics) return;

    analytics.pendingPayments -= 1;

    await this.saveAnalytics(analytics);
    this.logger.log(`Payment cancelled for merchant ${merchantId}`);
  }

  async getMetrics(merchantId: string): Promise<PaymentAnalytics | null> {
    await this.loadAnalytics();
    return this.analytics.get(merchantId) || null;
  }

  async getAllMetrics(): Promise<PaymentAnalytics[]> {
    await this.loadAnalytics();
    return Array.from(this.analytics.values());
  }

  private async saveAnalytics(analytics: PaymentAnalytics): Promise<void> {
    await this.analyticsRepository.upsert(
      {
        merchant_id: analytics.merchantId,
        total_payments: analytics.totalPayments,
        total_amount: analytics.totalAmount.toString(),
        successful_payments: analytics.successfulPayments,
        failed_payments: analytics.failedPayments,
        pending_payments: analytics.pendingPayments,
        last_payment_at: analytics.lastPaymentAt,
        updated_at: new Date(),
      },
      ['merchant_id'],
    );
  }

  private getMerchantIdFromPaymentId(paymentId: string): string | null {
    // In a real implementation, this would query the event store or a cache
    // For now, we'll return null as this is a placeholder
    return null;
  }

  async rebuildFromEvents(eventStore: any): Promise<void> {
    this.logger.log('Rebuilding payment analytics projection from events');
    
    // Clear current analytics
    this.analytics.clear();
    await this.analyticsRepository.clear();

    // Replay all payment events
    const events = await eventStore.readAllEvents();
    for (const event of events) {
      if (event.eventType.startsWith('Payment')) {
        await this.handle(event);
      }
    }

    this.logger.log('Payment analytics projection rebuilt successfully');
  }
}
