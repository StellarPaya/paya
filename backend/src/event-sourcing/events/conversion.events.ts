import { DomainEvent } from '../interfaces/domain-event.interface';

export enum ConversionStatus {
  PENDING = 'PENDING',
  PRICE_DISCOVERY = 'PRICE_DISCOVERY',
  EXECUTING = 'EXECUTING',
  BRIDGING = 'BRIDGING',
  SETTLING = 'SETTLING',
  COMPLETED = 'COMPLETED',
  FAILED = 'FAILED',
  CANCELLED = 'CANCELLED',
}

export enum Chain {
  ETHEREUM = 'ETHEREUM',
  BSC = 'BSC',
  SOLANA = 'SOLANA',
  STELLAR = 'STELLAR',
}

export enum TokenType {
  BTC = 'BTC',
  ETH = 'ETH',
  USDC = 'USDC',
  USDT = 'USDT',
}

export class ConversionCreatedEvent implements DomainEvent {
  eventType = 'ConversionCreated';
  eventId: string;
  streamId: string;
  streamVersion: number;
  timestamp: Date;
  data: {
    conversionId: string;
    merchantId: string;
    sourceToken: TokenType;
    sourceChain: Chain;
    sourceAmount: bigint;
    targetToken: TokenType;
    targetChain: Chain;
    expectedAmount: bigint;
    slippageTolerance: bigint;
    priceData: any;
    metadata?: Record<string, any>;
  };
  metadata?: Record<string, any>;

  constructor(
    conversionId: string,
    merchantId: string,
    sourceToken: TokenType,
    sourceChain: Chain,
    sourceAmount: bigint,
    targetToken: TokenType,
    targetChain: Chain,
    expectedAmount: bigint,
    slippageTolerance: bigint,
    priceData: any,
    metadata?: Record<string, any>,
  ) {
    this.eventId = crypto.randomUUID();
    this.streamId = `conversion-${conversionId}`;
    this.streamVersion = 1;
    this.timestamp = new Date();
    this.data = {
      conversionId,
      merchantId,
      sourceToken,
      sourceChain,
      sourceAmount,
      targetToken,
      targetChain,
      expectedAmount,
      slippageTolerance,
      priceData,
      metadata,
    };
  }
}

export class ConversionPriceDiscoveredEvent implements DomainEvent {
  eventType = 'ConversionPriceDiscovered';
  eventId: string;
  streamId: string;
  streamVersion: number;
  timestamp: Date;
  data: {
    conversionId: string;
    dexType: string;
    routeData: any;
    discoveredAt: Date;
  };
  metadata?: Record<string, any>;

  constructor(
    conversionId: string,
    dexType: string,
    routeData: any,
  ) {
    this.eventId = crypto.randomUUID();
    this.streamId = `conversion-${conversionId}`;
    this.streamVersion = 0;
    this.timestamp = new Date();
    this.data = {
      conversionId,
      dexType,
      routeData,
      discoveredAt: new Date(),
    };
  }
}

export class ConversionExecutingEvent implements DomainEvent {
  eventType = 'ConversionExecuting';
  eventId: string;
  streamId: string;
  streamVersion: number;
  timestamp: Date;
  data: {
    conversionId: string;
    executingAt: Date;
  };
  metadata?: Record<string, any>;

  constructor(conversionId: string) {
    this.eventId = crypto.randomUUID();
    this.streamId = `conversion-${conversionId}`;
    this.streamVersion = 0;
    this.timestamp = new Date();
    this.data = {
      conversionId,
      executingAt: new Date(),
    };
  }
}

export class ConversionSwappedEvent implements DomainEvent {
  eventType = 'ConversionSwapped';
  eventId: string;
  streamId: string;
  streamVersion: number;
  timestamp: Date;
  data: {
    conversionId: string;
    sourceTxHash: string;
    transactionData: any;
    actualAmount: bigint;
    actualSlippage: bigint;
    swappedAt: Date;
  };
  metadata?: Record<string, any>;

  constructor(
    conversionId: string,
    sourceTxHash: string,
    transactionData: any,
    actualAmount: bigint,
    actualSlippage: bigint,
  ) {
    this.eventId = crypto.randomUUID();
    this.streamId = `conversion-${conversionId}`;
    this.streamVersion = 0;
    this.timestamp = new Date();
    this.data = {
      conversionId,
      sourceTxHash,
      transactionData,
      actualAmount,
      actualSlippage,
      swappedAt: new Date(),
    };
  }
}

export class ConversionBridgingEvent implements DomainEvent {
  eventType = 'ConversionBridging';
  eventId: string;
  streamId: string;
  streamVersion: number;
  timestamp: Date;
  data: {
    conversionId: string;
    bridgeType: string;
    bridgeData: any;
    bridgingAt: Date;
  };
  metadata?: Record<string, any>;

  constructor(
    conversionId: string,
    bridgeType: string,
    bridgeData: any,
  ) {
    this.eventId = crypto.randomUUID();
    this.streamId = `conversion-${conversionId}`;
    this.streamVersion = 0;
    this.timestamp = new Date();
    this.data = {
      conversionId,
      bridgeType,
      bridgeData,
      bridgingAt: new Date(),
    };
  }
}

export class ConversionBridgedEvent implements DomainEvent {
  eventType = 'ConversionBridged';
  eventId: string;
  streamId: string;
  streamVersion: number;
  timestamp: Date;
  data: {
    conversionId: string;
    bridgeTxHash: string;
    bridgedAt: Date;
  };
  metadata?: Record<string, any>;

  constructor(conversionId: string, bridgeTxHash: string) {
    this.eventId = crypto.randomUUID();
    this.streamId = `conversion-${conversionId}`;
    this.streamVersion = 0;
    this.timestamp = new Date();
    this.data = {
      conversionId,
      bridgeTxHash,
      bridgedAt: new Date(),
    };
  }
}

export class ConversionSettlingEvent implements DomainEvent {
  eventType = 'ConversionSettling';
  eventId: string;
  streamId: string;
  streamVersion: number;
  timestamp: Date;
  data: {
    conversionId: string;
    settlingAt: Date;
  };
  metadata?: Record<string, any>;

  constructor(conversionId: string) {
    this.eventId = crypto.randomUUID();
    this.streamId = `conversion-${conversionId}`;
    this.streamVersion = 0;
    this.timestamp = new Date();
    this.data = {
      conversionId,
      settlingAt: new Date(),
    };
  }
}

export class ConversionCompletedEvent implements DomainEvent {
  eventType = 'ConversionCompleted';
  eventId: string;
  streamId: string;
  streamVersion: number;
  timestamp: Date;
  data: {
    conversionId: string;
    targetAmount: bigint;
    settlementTxHash: string;
    feeAmount: bigint;
    gasAmount: bigint;
    completedAt: Date;
  };
  metadata?: Record<string, any>;

  constructor(
    conversionId: string,
    targetAmount: bigint,
    settlementTxHash: string,
    feeAmount: bigint,
    gasAmount: bigint,
  ) {
    this.eventId = crypto.randomUUID();
    this.streamId = `conversion-${conversionId}`;
    this.streamVersion = 0;
    this.timestamp = new Date();
    this.data = {
      conversionId,
      targetAmount,
      settlementTxHash,
      feeAmount,
      gasAmount,
      completedAt: new Date(),
    };
  }
}

export class ConversionFailedEvent implements DomainEvent {
  eventType = 'ConversionFailed';
  eventId: string;
  streamId: string;
  streamVersion: number;
  timestamp: Date;
  data: {
    conversionId: string;
    errorMessage: string;
    errorDetails: any;
    failedAt: Date;
    retryCount: number;
  };
  metadata?: Record<string, any>;

  constructor(
    conversionId: string,
    errorMessage: string,
    errorDetails: any,
    retryCount: number,
  ) {
    this.eventId = crypto.randomUUID();
    this.streamId = `conversion-${conversionId}`;
    this.streamVersion = 0;
    this.timestamp = new Date();
    this.data = {
      conversionId,
      errorMessage,
      errorDetails,
      failedAt: new Date(),
      retryCount,
    };
  }
}

export class ConversionCancelledEvent implements DomainEvent {
  eventType = 'ConversionCancelled';
  eventId: string;
  streamId: string;
  streamVersion: number;
  timestamp: Date;
  data: {
    conversionId: string;
    cancelledAt: Date;
  };
  metadata?: Record<string, any>;

  constructor(conversionId: string) {
    this.eventId = crypto.randomUUID();
    this.streamId = `conversion-${conversionId}`;
    this.streamVersion = 0;
    this.timestamp = new Date();
    this.data = {
      conversionId,
      cancelledAt: new Date(),
    };
  }
}
