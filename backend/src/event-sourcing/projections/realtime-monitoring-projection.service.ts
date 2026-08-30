import { Injectable, Logger } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { DomainEvent, EventHandler } from '../interfaces/domain-event.interface';
import { PaymentCreatedEvent, PaymentConfirmedEvent, PaymentSettledEvent, PaymentFailedEvent, PaymentCancelledEvent } from '../events/payment.events';

interface ActivePayment {
  paymentId: string;
  merchantId: string;
  status: string;
  amount: bigint;
  currency: string;
  createdAt: Date;
  updatedAt: Date;
}

interface Alert {
  id: string;
  type: string;
  severity: 'low' | 'medium' | 'high' | 'critical';
  message: string;
  paymentId?: string;
  merchantId?: string;
  createdAt: Date;
}

@Injectable()
export class RealtimeMonitoringProjection implements EventHandler {
  private readonly logger = new Logger(RealtimeMonitoringProjection.name);
  private activePayments: Map<string, ActivePayment> = new Map();
  private alerts: Alert[] = [];

  constructor(
    @InjectRepository('realtime_monitoring')
    private monitoringRepository: Repository<any>,
  ) {
    this.loadActivePayments();
  }

  private async loadActivePayments(): Promise<void> {
    const records = await this.monitoringRepository.find();
    for (const record of records) {
      this.activePayments.set(record.payment_id, {
        paymentId: record.payment_id,
        merchantId: record.merchant_id,
        status: record.status,
        amount: BigInt(record.amount || 0),
        currency: record.currency,
        createdAt: record.created_at,
        updatedAt: record.updated_at,
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
    const paymentId = event.data.paymentId;
    const activePayment: ActivePayment = {
      paymentId,
      merchantId: event.data.merchantId,
      status: 'PENDING',
      amount: event.data.amount,
      currency: event.data.currency,
      createdAt: event.timestamp,
      updatedAt: event.timestamp,
    };

    this.activePayments.set(paymentId, activePayment);
    await this.saveActivePayment(activePayment);

    // Check for high-value payment alert
    if (event.data.amount > BigInt(10000000000)) { // > 10,000 in smallest unit
      this.createAlert('HIGH_VALUE_PAYMENT', 'high', `High-value payment created: ${paymentId}`, paymentId, event.data.merchantId);
    }

    this.logger.log(`Added active payment ${paymentId} to monitoring`);
  }

  private async handlePaymentConfirmed(event: PaymentConfirmedEvent): Promise<void> {
    const paymentId = event.data.paymentId;
    const activePayment = this.activePayments.get(paymentId);

    if (activePayment) {
      activePayment.status = 'CONFIRMED';
      activePayment.updatedAt = event.timestamp;
      await this.saveActivePayment(activePayment);
      this.logger.log(`Updated payment ${paymentId} status to CONFIRMED`);
    }
  }

  private async handlePaymentSettled(event: PaymentSettledEvent): Promise<void> {
    const paymentId = event.data.paymentId;
    const activePayment = this.activePayments.get(paymentId);

    if (activePayment) {
      activePayment.status = 'SETTLED';
      activePayment.updatedAt = event.timestamp;
      await this.saveActivePayment(activePayment);

      // Remove from active payments after settlement
      setTimeout(() => {
        this.activePayments.delete(paymentId);
        this.monitoringRepository.delete({ payment_id: paymentId });
      }, 60000); // Keep for 1 minute after settlement

      this.logger.log(`Payment ${paymentId} settled, will be removed from active monitoring`);
    }
  }

  private async handlePaymentFailed(event: PaymentFailedEvent): Promise<void> {
    const paymentId = event.data.paymentId;
    const activePayment = this.activePayments.get(paymentId);

    if (activePayment) {
      activePayment.status = 'FAILED';
      activePayment.updatedAt = event.timestamp;
      await this.saveActivePayment(activePayment);

      // Create alert for failed payment
      this.createAlert('PAYMENT_FAILED', 'medium', `Payment failed: ${event.data.reason}`, paymentId, activePayment.merchantId);

      // Remove from active payments after failure
      setTimeout(() => {
        this.activePayments.delete(paymentId);
        this.monitoringRepository.delete({ payment_id: paymentId });
      }, 60000);

      this.logger.log(`Payment ${paymentId} failed, alert created`);
    }
  }

  private async handlePaymentCancelled(event: PaymentCancelledEvent): Promise<void> {
    const paymentId = event.data.paymentId;
    const activePayment = this.activePayments.get(paymentId);

    if (activePayment) {
      activePayment.status = 'CANCELLED';
      activePayment.updatedAt = event.timestamp;
      await this.saveActivePayment(activePayment);

      // Remove from active payments immediately
      this.activePayments.delete(paymentId);
      await this.monitoringRepository.delete({ payment_id: paymentId });

      this.logger.log(`Payment ${paymentId} cancelled, removed from active monitoring`);
    }
  }

  async getActivePayments(): Promise<ActivePayment[]> {
    await this.loadActivePayments();
    return Array.from(this.activePayments.values());
  }

  async getActivePaymentsByMerchant(merchantId: string): Promise<ActivePayment[]> {
    await this.loadActivePayments();
    return Array.from(this.activePayments.values()).filter(p => p.merchantId === merchantId);
  }

  async getAlerts(severity?: string): Promise<Alert[]> {
    if (severity) {
      return this.alerts.filter(a => a.severity === severity);
    }
    return [...this.alerts];
  }

  async getAlertsByMerchant(merchantId: string): Promise<Alert[]> {
    return this.alerts.filter(a => a.merchantId === merchantId);
  }

  private createAlert(
    type: string,
    severity: 'low' | 'medium' | 'high' | 'critical',
    message: string,
    paymentId?: string,
    merchantId?: string,
  ): void {
    const alert: Alert = {
      id: crypto.randomUUID(),
      type,
      severity,
      message,
      paymentId,
      merchantId,
      createdAt: new Date(),
    };

    this.alerts.push(alert);

    // Keep only last 1000 alerts
    if (this.alerts.length > 1000) {
      this.alerts = this.alerts.slice(-1000);
    }

    this.logger.warn(`Alert created: ${type} - ${message}`);
  }

  private async saveActivePayment(payment: ActivePayment): Promise<void> {
    await this.monitoringRepository.upsert(
      {
        payment_id: payment.paymentId,
        merchant_id: payment.merchantId,
        status: payment.status,
        amount: payment.amount.toString(),
        currency: payment.currency,
        created_at: payment.createdAt,
        updated_at: payment.updatedAt,
      },
      ['payment_id'],
    );
  }

  async rebuildFromEvents(eventStore: any): Promise<void> {
    this.logger.log('Rebuilding realtime monitoring projection from events');
    
    this.activePayments.clear();
    this.alerts = [];
    await this.monitoringRepository.clear();

    const events = await eventStore.readAllEvents();
    for (const event of events) {
      if (event.eventType.startsWith('Payment')) {
        await this.handle(event);
      }
    }

    this.logger.log('Realtime monitoring projection rebuilt successfully');
  }
}
