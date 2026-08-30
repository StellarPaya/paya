import { DomainEvent } from '../interfaces/domain-event.interface';

export enum RefundStatus {
  PENDING = 'PENDING',
  PROCESSING = 'PROCESSING',
  COMPLETED = 'COMPLETED',
  FAILED = 'FAILED',
  REVERSED = 'REVERSED',
}

export enum RefundReason {
  CUSTOMER_REQUEST = 'CUSTOMER_REQUEST',
  PRODUCT_NOT_RECEIVED = 'PRODUCT_NOT_RECEIVED',
  PRODUCT_DEFECTIVE = 'PRODUCT_DEFECTIVE',
  WRONG_ITEM = 'WRONG_ITEM',
  DUPLICATE_PAYMENT = 'DUPLICATE_PAYMENT',
  FRAUDULENT = 'FRAUDULENT',
  OTHER = 'OTHER',
}

export enum RefundType {
  FULL = 'FULL',
  PARTIAL = 'PARTIAL',
}

export class RefundCreatedEvent implements DomainEvent {
  eventType = 'RefundCreated';
  eventId: string;
  streamId: string;
  streamVersion: number;
  timestamp: Date;
  data: {
    refundId: string;
    paymentId: string;
    merchantId: string;
    customerId: string;
    originalAmount: bigint;
    refundAmount: bigint;
    refundType: RefundType;
    reason: RefundReason;
    reasonDescription?: string;
    feeAmount: bigint;
    netAmount: bigint;
    metadata?: Record<string, any>;
  };
  metadata?: Record<string, any>;

  constructor(
    refundId: string,
    paymentId: string,
    merchantId: string,
    customerId: string,
    originalAmount: bigint,
    refundAmount: bigint,
    refundType: RefundType,
    reason: RefundReason,
    reasonDescription: string | undefined,
    feeAmount: bigint,
    netAmount: bigint,
    metadata?: Record<string, any>,
  ) {
    this.eventId = crypto.randomUUID();
    this.streamId = `refund-${refundId}`;
    this.streamVersion = 1;
    this.timestamp = new Date();
    this.data = {
      refundId,
      paymentId,
      merchantId,
      customerId,
      originalAmount,
      refundAmount,
      refundType,
      reason,
      reasonDescription,
      feeAmount,
      netAmount,
      metadata,
    };
  }
}

export class RefundProcessedEvent implements DomainEvent {
  eventType = 'RefundProcessed';
  eventId: string;
  streamId: string;
  streamVersion: number;
  timestamp: Date;
  data: {
    refundId: string;
    transactionHash: string;
    processedAt: Date;
  };
  metadata?: Record<string, any>;

  constructor(refundId: string, transactionHash: string) {
    this.eventId = crypto.randomUUID();
    this.streamId = `refund-${refundId}`;
    this.streamVersion = 0;
    this.timestamp = new Date();
    this.data = {
      refundId,
      transactionHash,
      processedAt: new Date(),
    };
  }
}

export class RefundCompletedEvent implements DomainEvent {
  eventType = 'RefundCompleted';
  eventId: string;
  streamId: string;
  streamVersion: number;
  timestamp: Date;
  data: {
    refundId: string;
    transactionHash: string;
    completedAt: Date;
  };
  metadata?: Record<string, any>;

  constructor(refundId: string, transactionHash: string) {
    this.eventId = crypto.randomUUID();
    this.streamId = `refund-${refundId}`;
    this.streamVersion = 0;
    this.timestamp = new Date();
    this.data = {
      refundId,
      transactionHash,
      completedAt: new Date(),
    };
  }
}

export class RefundFailedEvent implements DomainEvent {
  eventType = 'RefundFailed';
  eventId: string;
  streamId: string;
  streamVersion: number;
  timestamp: Date;
  data: {
    refundId: string;
    failureReason: string;
    failedAt: Date;
  };
  metadata?: Record<string, any>;

  constructor(refundId: string, failureReason: string) {
    this.eventId = crypto.randomUUID();
    this.streamId = `refund-${refundId}`;
    this.streamVersion = 0;
    this.timestamp = new Date();
    this.data = {
      refundId,
      failureReason,
      failedAt: new Date(),
    };
  }
}

export class RefundReversedEvent implements DomainEvent {
  eventType = 'RefundReversed';
  eventId: string;
  streamId: string;
  streamVersion: number;
  timestamp: Date;
  data: {
    refundId: string;
    reversedAt: Date;
  };
  metadata?: Record<string, any>;

  constructor(refundId: string) {
    this.eventId = crypto.randomUUID();
    this.streamId = `refund-${refundId}`;
    this.streamVersion = 0;
    this.timestamp = new Date();
    this.data = {
      refundId,
      reversedAt: new Date(),
    };
  }
}
