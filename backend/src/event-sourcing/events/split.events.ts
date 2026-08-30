import { DomainEvent } from '../interfaces/domain-event.interface';

export enum SplitStatus {
  PENDING = 'PENDING',
  EXECUTING = 'EXECUTING',
  COMPLETED = 'COMPLETED',
  PARTIALLY_COMPLETED = 'PARTIALLY_COMPLETED',
  FAILED = 'FAILED',
  CANCELLED = 'CANCELLED',
}

export enum SplitType {
  PERCENTAGE = 'PERCENTAGE',
  FIXED_AMOUNT = 'FIXED_AMOUNT',
  MILESTONE = 'MILESTONE',
}

export class SplitCreatedEvent implements DomainEvent {
  eventType = 'SplitCreated';
  eventId: string;
  streamId: string;
  streamVersion: number;
  timestamp: Date;
  data: {
    splitId: string;
    paymentId: string;
    merchantAddress: string;
    totalAmount: bigint;
    currency: string;
    splitType: SplitType;
    recipients: Array<{
      address: string;
      percentage?: number;
      fixedAmount?: bigint;
      splitType: SplitType;
    }>;
    metadata?: Record<string, any>;
  };
  metadata?: Record<string, any>;

  constructor(
    splitId: string,
    paymentId: string,
    merchantAddress: string,
    totalAmount: bigint,
    currency: string,
    splitType: SplitType,
    recipients: Array<{
      address: string;
      percentage?: number;
      fixedAmount?: bigint;
      splitType: SplitType;
    }>,
    metadata?: Record<string, any>,
  ) {
    this.eventId = crypto.randomUUID();
    this.streamId = `split-${splitId}`;
    this.streamVersion = 1;
    this.timestamp = new Date();
    this.data = {
      splitId,
      paymentId,
      merchantAddress,
      totalAmount,
      currency,
      splitType,
      recipients,
      metadata,
    };
  }
}

export class SplitExecutedEvent implements DomainEvent {
  eventType = 'SplitExecuted';
  eventId: string;
  streamId: string;
  streamVersion: number;
  timestamp: Date;
  data: {
    splitId: string;
    executedAt: Date;
    executor: string;
  };
  metadata?: Record<string, any>;

  constructor(splitId: string, executor: string) {
    this.eventId = crypto.randomUUID();
    this.streamId = `split-${splitId}`;
    this.streamVersion = 0;
    this.timestamp = new Date();
    this.data = {
      splitId,
      executedAt: new Date(),
      executor,
    };
  }
}

export class SplitDistributionStartedEvent implements DomainEvent {
  eventType = 'SplitDistributionStarted';
  eventId: string;
  streamId: string;
  streamVersion: number;
  timestamp: Date;
  data: {
    splitId: string;
    distributionId: string;
    recipientAddress: string;
    amount: bigint;
    startedAt: Date;
  };
  metadata?: Record<string, any>;

  constructor(
    splitId: string,
    distributionId: string,
    recipientAddress: string,
    amount: bigint,
  ) {
    this.eventId = crypto.randomUUID();
    this.streamId = `split-${splitId}`;
    this.streamVersion = 0;
    this.timestamp = new Date();
    this.data = {
      splitId,
      distributionId,
      recipientAddress,
      amount,
      startedAt: new Date(),
    };
  }
}

export class SplitDistributionCompletedEvent implements DomainEvent {
  eventType = 'SplitDistributionCompleted';
  eventId: string;
  streamId: string;
  streamVersion: number;
  timestamp: Date;
  data: {
    splitId: string;
    distributionId: string;
    recipientAddress: string;
    amount: bigint;
    transactionHash: string;
    completedAt: Date;
  };
  metadata?: Record<string, any>;

  constructor(
    splitId: string,
    distributionId: string,
    recipientAddress: string,
    amount: bigint,
    transactionHash: string,
  ) {
    this.eventId = crypto.randomUUID();
    this.streamId = `split-${splitId}`;
    this.streamVersion = 0;
    this.timestamp = new Date();
    this.data = {
      splitId,
      distributionId,
      recipientAddress,
      amount,
      transactionHash,
      completedAt: new Date(),
    };
  }
}

export class SplitDistributionFailedEvent implements DomainEvent {
  eventType = 'SplitDistributionFailed';
  eventId: string;
  streamId: string;
  streamVersion: number;
  timestamp: Date;
  data: {
    splitId: string;
    distributionId: string;
    recipientAddress: string;
    amount: bigint;
    errorMessage: string;
    failedAt: Date;
    retryCount: number;
  };
  metadata?: Record<string, any>;

  constructor(
    splitId: string,
    distributionId: string,
    recipientAddress: string,
    amount: bigint,
    errorMessage: string,
    retryCount: number,
  ) {
    this.eventId = crypto.randomUUID();
    this.streamId = `split-${splitId}`;
    this.streamVersion = 0;
    this.timestamp = new Date();
    this.data = {
      splitId,
      distributionId,
      recipientAddress,
      amount,
      errorMessage,
      failedAt: new Date(),
      retryCount,
    };
  }
}

export class SplitCompletedEvent implements DomainEvent {
  eventType = 'SplitCompleted';
  eventId: string;
  streamId: string;
  streamVersion: number;
  timestamp: Date;
  data: {
    splitId: string;
    completedAt: Date;
  };
  metadata?: Record<string, any>;

  constructor(splitId: string) {
    this.eventId = crypto.randomUUID();
    this.streamId = `split-${splitId}`;
    this.streamVersion = 0;
    this.timestamp = new Date();
    this.data = {
      splitId,
      completedAt: new Date(),
    };
  }
}

export class SplitCancelledEvent implements DomainEvent {
  eventType = 'SplitCancelled';
  eventId: string;
  streamId: string;
  streamVersion: number;
  timestamp: Date;
  data: {
    splitId: string;
    cancelledAt: Date;
    canceller: string;
  };
  metadata?: Record<string, any>;

  constructor(splitId: string, canceller: string) {
    this.eventId = crypto.randomUUID();
    this.streamId = `split-${splitId}`;
    this.streamVersion = 0;
    this.timestamp = new Date();
    this.data = {
      splitId,
      cancelledAt: new Date(),
      canceller,
    };
  }
}

export class MilestoneTriggeredEvent implements DomainEvent {
  eventType = 'MilestoneTriggered';
  eventId: string;
  streamId: string;
  streamVersion: number;
  timestamp: Date;
  data: {
    splitId: string;
    milestoneId: string;
    description: string;
    triggeredAt: Date;
    triggeredBy: string;
  };
  metadata?: Record<string, any>;

  constructor(
    splitId: string,
    milestoneId: string,
    description: string,
    triggeredBy: string,
  ) {
    this.eventId = crypto.randomUUID();
    this.streamId = `split-${splitId}`;
    this.streamVersion = 0;
    this.timestamp = new Date();
    this.data = {
      splitId,
      milestoneId,
      description,
      triggeredAt: new Date(),
      triggeredBy,
    };
  }
}

export class MilestoneCompletedEvent implements DomainEvent {
  eventType = 'MilestoneCompleted';
  eventId: string;
  streamId: string;
  streamVersion: number;
  timestamp: Date;
  data: {
    splitId: string;
    milestoneId: string;
    description: string;
    completedAt: Date;
    completedBy: string;
  };
  metadata?: Record<string, any>;

  constructor(
    splitId: string,
    milestoneId: string,
    description: string,
    completedBy: string,
  ) {
    this.eventId = crypto.randomUUID();
    this.streamId = `split-${splitId}`;
    this.streamVersion = 0;
    this.timestamp = new Date();
    this.data = {
      splitId,
      milestoneId,
      description,
      completedAt: new Date(),
      completedBy,
    };
  }
}
