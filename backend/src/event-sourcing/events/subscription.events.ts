import { DomainEvent } from '../interfaces/domain-event.interface';

export enum SubscriptionStatus {
  ACTIVE = 'ACTIVE',
  TRIALING = 'TRIALING',
  PAST_DUE = 'PAST_DUE',
  CANCELLED = 'CANCELLED',
  PAUSED = 'PAUSED',
  COMPLETED = 'COMPLETED',
}

export class SubscriptionCreatedEvent implements DomainEvent {
  eventType = 'SubscriptionCreated';
  eventId: string;
  streamId: string;
  streamVersion: number;
  timestamp: Date;
  data: {
    subscriptionId: string;
    merchantId: string;
    customerId: string;
    customerEmail: string;
    planId: string;
    currentAmount: bigint;
    currency: string;
    status: SubscriptionStatus;
    trialStart?: Date;
    trialEnd?: Date;
    currentPeriodStart: Date;
    currentPeriodEnd: Date;
    nextPaymentAt: Date;
    metadata?: Record<string, any>;
  };
  metadata?: Record<string, any>;

  constructor(
    subscriptionId: string,
    merchantId: string,
    customerId: string,
    customerEmail: string,
    planId: string,
    currentAmount: bigint,
    currency: string,
    currentPeriodStart: Date,
    currentPeriodEnd: Date,
    nextPaymentAt: Date,
    trialStart?: Date,
    trialEnd?: Date,
    metadata?: Record<string, any>,
  ) {
    this.eventId = crypto.randomUUID();
    this.streamId = `subscription-${subscriptionId}`;
    this.streamVersion = 1;
    this.timestamp = new Date();
    this.data = {
      subscriptionId,
      merchantId,
      customerId,
      customerEmail,
      planId,
      currentAmount,
      currency,
      status: trialStart ? SubscriptionStatus.TRIALING : SubscriptionStatus.ACTIVE,
      trialStart,
      trialEnd,
      currentPeriodStart,
      currentPeriodEnd,
      nextPaymentAt,
      metadata,
    };
  }
}

export class SubscriptionPlanChangedEvent implements DomainEvent {
  eventType = 'SubscriptionPlanChanged';
  eventId: string;
  streamId: string;
  streamVersion: number;
  timestamp: Date;
  data: {
    subscriptionId: string;
    oldPlanId: string;
    newPlanId: string;
    oldAmount: bigint;
    newAmount: bigint;
    proratedAmount?: bigint;
    changedAt: Date;
  };
  metadata?: Record<string, any>;

  constructor(
    subscriptionId: string,
    oldPlanId: string,
    newPlanId: string,
    oldAmount: bigint,
    newAmount: bigint,
    proratedAmount?: bigint,
  ) {
    this.eventId = crypto.randomUUID();
    this.streamId = `subscription-${subscriptionId}`;
    this.streamVersion = 0;
    this.timestamp = new Date();
    this.data = {
      subscriptionId,
      oldPlanId,
      newPlanId,
      oldAmount,
      newAmount,
      proratedAmount,
      changedAt: new Date(),
    };
  }
}

export class SubscriptionCancelledEvent implements DomainEvent {
  eventType = 'SubscriptionCancelled';
  eventId: string;
  streamId: string;
  streamVersion: number;
  timestamp: Date;
  data: {
    subscriptionId: string;
    cancelAtPeriodEnd: boolean;
    cancelAt?: Date;
    cancelledAt?: Date;
  };
  metadata?: Record<string, any>;

  constructor(
    subscriptionId: string,
    cancelAtPeriodEnd: boolean,
    cancelAt?: Date,
    cancelledAt?: Date,
  ) {
    this.eventId = crypto.randomUUID();
    this.streamId = `subscription-${subscriptionId}`;
    this.streamVersion = 0;
    this.timestamp = new Date();
    this.data = {
      subscriptionId,
      cancelAtPeriodEnd,
      cancelAt,
      cancelledAt,
    };
  }
}

export class SubscriptionPausedEvent implements DomainEvent {
  eventType = 'SubscriptionPaused';
  eventId: string;
  streamId: string;
  streamVersion: number;
  timestamp: Date;
  data: {
    subscriptionId: string;
    pausedAt: Date;
    resumeAt?: Date;
  };
  metadata?: Record<string, any>;

  constructor(subscriptionId: string, resumeAt?: Date) {
    this.eventId = crypto.randomUUID();
    this.streamId = `subscription-${subscriptionId}`;
    this.streamVersion = 0;
    this.timestamp = new Date();
    this.data = {
      subscriptionId,
      pausedAt: new Date(),
      resumeAt,
    };
  }
}

export class SubscriptionResumedEvent implements DomainEvent {
  eventType = 'SubscriptionResumed';
  eventId: string;
  streamId: string;
  streamVersion: number;
  timestamp: Date;
  data: {
    subscriptionId: string;
    resumedAt: Date;
    currentPeriodStart: Date;
    currentPeriodEnd: Date;
    nextPaymentAt: Date;
  };
  metadata?: Record<string, any>;

  constructor(
    subscriptionId: string,
    currentPeriodStart: Date,
    currentPeriodEnd: Date,
    nextPaymentAt: Date,
  ) {
    this.eventId = crypto.randomUUID();
    this.streamId = `subscription-${subscriptionId}`;
    this.streamVersion = 0;
    this.timestamp = new Date();
    this.data = {
      subscriptionId,
      resumedAt: new Date(),
      currentPeriodStart,
      currentPeriodEnd,
      nextPaymentAt,
    };
  }
}

export class SubscriptionPaymentProcessedEvent implements DomainEvent {
  eventType = 'SubscriptionPaymentProcessed';
  eventId: string;
  streamId: string;
  streamVersion: number;
  timestamp: Date;
  data: {
    subscriptionId: string;
    invoiceId: string;
    amount: bigint;
    processedAt: Date;
    billingCycleCount: number;
    currentPeriodStart: Date;
    currentPeriodEnd: Date;
    nextPaymentAt: Date;
  };
  metadata?: Record<string, any>;

  constructor(
    subscriptionId: string,
    invoiceId: string,
    amount: bigint,
    billingCycleCount: number,
    currentPeriodStart: Date,
    currentPeriodEnd: Date,
    nextPaymentAt: Date,
  ) {
    this.eventId = crypto.randomUUID();
    this.streamId = `subscription-${subscriptionId}`;
    this.streamVersion = 0;
    this.timestamp = new Date();
    this.data = {
      subscriptionId,
      invoiceId,
      amount,
      processedAt: new Date(),
      billingCycleCount,
      currentPeriodStart,
      currentPeriodEnd,
      nextPaymentAt,
    };
  }
}

export class SubscriptionPaymentFailedEvent implements DomainEvent {
  eventType = 'SubscriptionPaymentFailed';
  eventId: string;
  streamId: string;
  streamVersion: number;
  timestamp: Date;
  data: {
    subscriptionId: string;
    invoiceId: string;
    errorMessage: string;
    failedAt: Date;
    attemptCount: number;
  };
  metadata?: Record<string, any>;

  constructor(
    subscriptionId: string,
    invoiceId: string,
    errorMessage: string,
    attemptCount: number,
  ) {
    this.eventId = crypto.randomUUID();
    this.streamId = `subscription-${subscriptionId}`;
    this.streamVersion = 0;
    this.timestamp = new Date();
    this.data = {
      subscriptionId,
      invoiceId,
      errorMessage,
      failedAt: new Date(),
      attemptCount,
    };
  }
}

export class SubscriptionTrialEndedEvent implements DomainEvent {
  eventType = 'SubscriptionTrialEnded';
  eventId: string;
  streamId: string;
  streamVersion: number;
  timestamp: Date;
  data: {
    subscriptionId: string;
    trialEndedAt: Date;
    currentPeriodStart: Date;
    currentPeriodEnd: Date;
    nextPaymentAt: Date;
  };
  metadata?: Record<string, any>;

  constructor(
    subscriptionId: string,
    currentPeriodStart: Date,
    currentPeriodEnd: Date,
    nextPaymentAt: Date,
  ) {
    this.eventId = crypto.randomUUID();
    this.streamId = `subscription-${subscriptionId}`;
    this.streamVersion = 0;
    this.timestamp = new Date();
    this.data = {
      subscriptionId,
      trialEndedAt: new Date(),
      currentPeriodStart,
      currentPeriodEnd,
      nextPaymentAt,
    };
  }
}
