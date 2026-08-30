import { DomainEvent } from '../interfaces/domain-event.interface';

export enum PaymentStatus {
  PENDING = 'PENDING',
  PROCESSING = 'PROCESSING',
  CONFIRMED = 'CONFIRMED',
  SETTLED = 'SETTLED',
  FAILED = 'FAILED',
  CANCELLED = 'CANCELLED',
}

export class PaymentCreatedEvent implements DomainEvent {
  eventType = 'PaymentCreated';
  eventId: string;
  streamId: string;
  streamVersion: number;
  timestamp: Date;
  data: {
    paymentId: string;
    merchantId: string;
    customerId: string;
    amount: bigint;
    currency: string;
    status: PaymentStatus;
    depositAddress: string;
    memo: string;
    expiresAt: Date;
    metadata?: Record<string, any>;
  };
  metadata?: Record<string, any>;

  constructor(
    paymentId: string,
    merchantId: string,
    customerId: string,
    amount: bigint,
    currency: string,
    depositAddress: string,
    memo: string,
    expiresAt: Date,
    metadata?: Record<string, any>,
  ) {
    this.eventId = crypto.randomUUID();
    this.streamId = `payment-${paymentId}`;
    this.streamVersion = 1;
    this.timestamp = new Date();
    this.data = {
      paymentId,
      merchantId,
      customerId,
      amount,
      currency,
      status: PaymentStatus.PENDING,
      depositAddress,
      memo,
      expiresAt,
      metadata,
    };
  }
}

export class PaymentConfirmedEvent implements DomainEvent {
  eventType = 'PaymentConfirmed';
  eventId: string;
  streamId: string;
  streamVersion: number;
  timestamp: Date;
  data: {
    paymentId: string;
    transactionHash: string;
    confirmedAt: Date;
    blockNumber?: number;
    sourceChain?: string;
  };
  metadata?: Record<string, any>;

  constructor(
    paymentId: string,
    transactionHash: string,
    blockNumber?: number,
    sourceChain?: string,
  ) {
    this.eventId = crypto.randomUUID();
    this.streamId = `payment-${paymentId}`;
    this.streamVersion = 0; // Will be set by event store
    this.timestamp = new Date();
    this.data = {
      paymentId,
      transactionHash,
      confirmedAt: new Date(),
      blockNumber,
      sourceChain,
    };
  }
}

export class PaymentSettledEvent implements DomainEvent {
  eventType = 'PaymentSettled';
  eventId: string;
  streamId: string;
  streamVersion: number;
  timestamp: Date;
  data: {
    paymentId: string;
    settlementTxHash: string;
    settledAt: Date;
    convertedAmount?: bigint;
    conversionRate?: number;
  };
  metadata?: Record<string, any>;

  constructor(
    paymentId: string,
    settlementTxHash: string,
    convertedAmount?: bigint,
    conversionRate?: number,
  ) {
    this.eventId = crypto.randomUUID();
    this.streamId = `payment-${paymentId}`;
    this.streamVersion = 0;
    this.timestamp = new Date();
    this.data = {
      paymentId,
      settlementTxHash,
      settledAt: new Date(),
      convertedAmount,
      conversionRate,
    };
  }
}

export class PaymentFailedEvent implements DomainEvent {
  eventType = 'PaymentFailed';
  eventId: string;
  streamId: string;
  streamVersion: number;
  timestamp: Date;
  data: {
    paymentId: string;
    reason: string;
    failedAt: Date;
  };
  metadata?: Record<string, any>;

  constructor(paymentId: string, reason: string) {
    this.eventId = crypto.randomUUID();
    this.streamId = `payment-${paymentId}`;
    this.streamVersion = 0;
    this.timestamp = new Date();
    this.data = {
      paymentId,
      reason,
      failedAt: new Date(),
    };
  }
}

export class PaymentCancelledEvent implements DomainEvent {
  eventType = 'PaymentCancelled';
  eventId: string;
  streamId: string;
  streamVersion: number;
  timestamp: Date;
  data: {
    paymentId: string;
    cancelledAt: Date;
    reason?: string;
  };
  metadata?: Record<string, any>;

  constructor(paymentId: string, reason?: string) {
    this.eventId = crypto.randomUUID();
    this.streamId = `payment-${paymentId}`;
    this.streamVersion = 0;
    this.timestamp = new Date();
    this.data = {
      paymentId,
      cancelledAt: new Date(),
      reason,
    };
  }
}

export class PaymentExpiredEvent implements DomainEvent {
  eventType = 'PaymentExpired';
  eventId: string;
  streamId: string;
  streamVersion: number;
  timestamp: Date;
  data: {
    paymentId: string;
    expiredAt: Date;
  };
  metadata?: Record<string, any>;

  constructor(paymentId: string) {
    this.eventId = crypto.randomUUID();
    this.streamId = `payment-${paymentId}`;
    this.streamVersion = 0;
    this.timestamp = new Date();
    this.data = {
      paymentId,
      expiredAt: new Date(),
    };
  }
}
