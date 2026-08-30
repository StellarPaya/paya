# Event Catalog

This document provides a comprehensive catalog of all events in the Paya event-sourced system.

## Payment Events

### PaymentCreated

**Description**: Emitted when a new payment is created in the system.

**Event Type**: `PaymentCreated`

**Stream**: `payment-{paymentId}`

**Data Schema**:
```typescript
{
  paymentId: string;
  merchantId: string;
  customerId: string;
  amount: bigint;
  currency: string;
  status: 'PENDING';
  depositAddress: string;
  memo: string;
  expiresAt: Date;
  metadata?: Record<string, any>;
}
```

**Use Cases**:
- Customer initiates a payment
- Payment checkout is created
- Payment link is generated

**Projections Affected**:
- Payment Analytics Projection
- Real-time Monitoring Projection

---

### PaymentConfirmed

**Description**: Emitted when a payment is confirmed on the blockchain.

**Event Type**: `PaymentConfirmed`

**Stream**: `payment-{paymentId}`

**Data Schema**:
```typescript
{
  paymentId: string;
  transactionHash: string;
  confirmedAt: Date;
  blockNumber?: number;
  sourceChain?: string;
}
```

**Use Cases**:
- Blockchain listener detects transaction
- Payment is confirmed on source chain
- Transaction is included in a block

**Projections Affected**:
- Payment Analytics Projection
- Real-time Monitoring Projection

---

### PaymentSettled

**Description**: Emitted when a payment is settled on the Stellar network.

**Event Type**: `PaymentSettled`

**Stream**: `payment-{paymentId}`

**Data Schema**:
```typescript
{
  paymentId: string;
  settlementTxHash: string;
  settledAt: Date;
  convertedAmount?: bigint;
  conversionRate?: number;
}
```

**Use Cases**:
- Payment is converted and settled on Stellar
- Funds are deposited to merchant vault
- Settlement transaction is confirmed

**Projections Affected**:
- Payment Analytics Projection
- Real-time Monitoring Projection

---

### PaymentFailed

**Description**: Emitted when a payment processing fails.

**Event Type**: `PaymentFailed`

**Stream**: `payment-{paymentId}`

**Data Schema**:
```typescript
{
  paymentId: string;
  reason: string;
  failedAt: Date;
}
```

**Use Cases**:
- Payment timeout
- Transaction failure
- Insufficient funds
- Network issues

**Projections Affected**:
- Payment Analytics Projection
- Real-time Monitoring Projection

---

### PaymentCancelled

**Description**: Emitted when a payment is cancelled by the merchant or customer.

**Event Type**: `PaymentCancelled`

**Stream**: `payment-{paymentId}`

**Data Schema**:
```typescript
{
  paymentId: string;
  cancelledAt: Date;
  reason?: string;
}
```

**Use Cases**:
- Merchant cancels payment
- Customer cancels payment
- System-initiated cancellation

**Projections Affected**:
- Payment Analytics Projection
- Real-time Monitoring Projection

---

### PaymentExpired

**Description**: Emitted when a payment expires without being completed.

**Event Type**: `PaymentExpired`

**Stream**: `payment-{paymentId}`

**Data Schema**:
```typescript
{
  paymentId: string;
  expiredAt: Date;
}
```

**Use Cases**:
- Payment time limit exceeded
- Payment not confirmed within expiry window

**Projections Affected**:
- Payment Analytics Projection
- Real-time Monitoring Projection

---

## Subscription Events

### SubscriptionCreated

**Description**: Emitted when a new subscription is created.

**Event Type**: `SubscriptionCreated`

**Stream**: `subscription-{subscriptionId}`

**Data Schema**:
```typescript
{
  subscriptionId: string;
  merchantId: string;
  customerId: string;
  customerEmail: string;
  planId: string;
  currentAmount: bigint;
  currency: string;
  status: 'ACTIVE' | 'TRIALING';
  trialStart?: Date;
  trialEnd?: Date;
  currentPeriodStart: Date;
  currentPeriodEnd: Date;
  nextPaymentAt: Date;
  metadata?: Record<string, any>;
}
```

**Use Cases**:
- Customer subscribes to a plan
- Trial subscription started
- Recurring billing setup

**Projections Affected**:
- Subscription Analytics Projection

---

### SubscriptionPlanChanged

**Description**: Emitted when a subscription's plan is changed.

**Event Type**: `SubscriptionPlanChanged`

**Stream**: `subscription-{subscriptionId}`

**Data Schema**:
```typescript
{
  subscriptionId: string;
  oldPlanId: string;
  newPlanId: string;
  oldAmount: bigint;
  newAmount: bigint;
  proratedAmount?: bigint;
  changedAt: Date;
}
```

**Use Cases**:
- Customer upgrades plan
- Customer downgrades plan
- Plan modification

**Projections Affected**:
- Subscription Analytics Projection

---

### SubscriptionCancelled

**Description**: Emitted when a subscription is cancelled.

**Event Type**: `SubscriptionCancelled`

**Stream**: `subscription-{subscriptionId}`

**Data Schema**:
```typescript
{
  subscriptionId: string;
  cancelAtPeriodEnd: boolean;
  cancelAt?: Date;
  cancelledAt?: Date;
}
```

**Use Cases**:
- Customer cancels subscription
- Merchant cancels subscription
- End of billing period cancellation

**Projections Affected**:
- Subscription Analytics Projection

---

### SubscriptionPaused

**Description**: Emitted when a subscription is paused.

**Event Type**: `SubscriptionPaused`

**Stream**: `subscription-{subscriptionId}`

**Data Schema**:
```typescript
{
  subscriptionId: string;
  pausedAt: Date;
  resumeAt?: Date;
}
```

**Use Cases**:
- Customer pauses subscription
- Temporary suspension
- Scheduled pause

**Projections Affected**:
- Subscription Analytics Projection

---

### SubscriptionResumed

**Description**: Emitted when a paused subscription is resumed.

**Event Type**: `SubscriptionResumed`

**Stream**: `subscription-{subscriptionId}`

**Data Schema**:
```typescript
{
  subscriptionId: string;
  resumedAt: Date;
  currentPeriodStart: Date;
  currentPeriodEnd: Date;
  nextPaymentAt: Date;
}
```

**Use Cases**:
- Customer resumes subscription
- Scheduled resume
- Manual resume

**Projections Affected**:
- Subscription Analytics Projection

---

### SubscriptionPaymentProcessed

**Description**: Emitted when a recurring subscription payment is processed.

**Event Type**: `SubscriptionPaymentProcessed`

**Stream**: `subscription-{subscriptionId}`

**Data Schema**:
```typescript
{
  subscriptionId: string;
  invoiceId: string;
  amount: bigint;
  processedAt: Date;
  billingCycleCount: number;
  currentPeriodStart: Date;
  currentPeriodEnd: Date;
  nextPaymentAt: Date;
}
```

**Use Cases**:
- Recurring payment successful
- Invoice generated
- Billing cycle advanced

**Projections Affected**:
- Subscription Analytics Projection

---

### SubscriptionPaymentFailed

**Description**: Emitted when a recurring subscription payment fails.

**Event Type**: `SubscriptionPaymentFailed`

**Stream**: `subscription-{subscriptionId}`

**Data Schema**:
```typescript
{
  subscriptionId: string;
  invoiceId: string;
  errorMessage: string;
  failedAt: Date;
  attemptCount: number;
}
```

**Use Cases**:
- Payment method declined
- Insufficient funds
- Network issues

**Projections Affected**:
- Subscription Analytics Projection

---

### SubscriptionTrialEnded

**Description**: Emitted when a subscription's trial period ends.

**Event Type**: `SubscriptionTrialEnded`

**Stream**: `subscription-{subscriptionId}`

**Data Schema**:
```typescript
{
  subscriptionId: string;
  trialEndedAt: Date;
  currentPeriodStart: Date;
  currentPeriodEnd: Date;
  nextPaymentAt: Date;
}
```

**Use Cases**:
- Trial period expires
- Transition to paid subscription
- First billing cycle starts

**Projections Affected**:
- Subscription Analytics Projection

---

## Split Events

### SplitCreated

**Description**: Emitted when a payment split is created.

**Event Type**: `SplitCreated`

**Stream**: `split-{splitId}`

**Data Schema**:
```typescript
{
  splitId: string;
  paymentId: string;
  merchantAddress: string;
  totalAmount: bigint;
  currency: string;
  splitType: 'PERCENTAGE' | 'FIXED_AMOUNT' | 'MILESTONE';
  recipients: Array<{
    address: string;
    percentage?: number;
    fixedAmount?: bigint;
    splitType: SplitType;
  }>;
  metadata?: Record<string, any>;
}
```

**Use Cases**:
- Payment split configuration
- Multi-party payment setup
- Revenue sharing arrangement

**Projections Affected**:
- Split Analytics Projection

---

### SplitExecuted

**Description**: Emitted when a split execution begins.

**Event Type**: `SplitExecuted`

**Stream**: `split-{splitId}`

**Data Schema**:
```typescript
{
  splitId: string;
  executedAt: Date;
  executor: string;
}
```

**Use Cases**:
- Split execution initiated
- Distribution process started

**Projections Affected**:
- Split Analytics Projection

---

### SplitDistributionStarted

**Description**: Emitted when distribution to a recipient begins.

**Event Type**: `SplitDistributionStarted`

**Stream**: `split-{splitId}`

**Data Schema**:
```typescript
{
  splitId: string;
  distributionId: string;
  recipientAddress: string;
  amount: bigint;
  startedAt: Date;
}
```

**Use Cases**:
- Individual distribution started
- Recipient payment initiated

**Projections Affected**:
- Split Analytics Projection

---

### SplitDistributionCompleted

**Description**: Emitted when distribution to a recipient completes.

**Event Type**: `SplitDistributionCompleted`

**Stream**: `split-{splitId}`

**Data Schema**:
```typescript
{
  splitId: string;
  distributionId: string;
  recipientAddress: string;
  amount: bigint;
  transactionHash: string;
  completedAt: Date;
}
```

**Use Cases**:
- Recipient payment successful
- Distribution confirmed on blockchain

**Projections Affected**:
- Split Analytics Projection

---

### SplitDistributionFailed

**Description**: Emitted when distribution to a recipient fails.

**Event Type**: `SplitDistributionFailed`

**Stream**: `split-{splitId}`

**Data Schema**:
```typescript
{
  splitId: string;
  distributionId: string;
  recipientAddress: string;
  amount: bigint;
  errorMessage: string;
  failedAt: Date;
  retryCount: number;
}
```

**Use Cases**:
- Distribution transaction failed
- Recipient address invalid
- Network issues

**Projections Affected**:
- Split Analytics Projection

---

### SplitCompleted

**Description**: Emitted when a split is fully completed.

**Event Type**: `SplitCompleted`

**Stream**: `split-{splitId}`

**Data Schema**:
```typescript
{
  splitId: string;
  completedAt: Date;
}
```

**Use Cases**:
- All distributions completed
- Split process finished

**Projections Affected**:
- Split Analytics Projection

---

### SplitCancelled

**Description**: Emitted when a split is cancelled.

**Event Type**: `SplitCancelled`

**Stream**: `split-{splitId}`

**Data Schema**:
```typescript
{
  splitId: string;
  cancelledAt: Date;
  canceller: string;
}
```

**Use Cases**:
- Merchant cancels split
- System-initiated cancellation

**Projections Affected**:
- Split Analytics Projection

---

### MilestoneTriggered

**Description**: Emitted when a milestone is triggered.

**Event Type**: `MilestoneTriggered`

**Stream**: `split-{splitId}`

**Data Schema**:
```typescript
{
  splitId: string;
  milestoneId: string;
  description: string;
  triggeredAt: Date;
  triggeredBy: string;
}
```

**Use Cases**:
- Milestone condition met
- Manual milestone trigger

**Projections Affected**:
- Split Analytics Projection

---

### MilestoneCompleted

**Description**: Emitted when a milestone is completed.

**Event Type**: `MilestoneCompleted`

**Stream**: `split-{splitId}`

**Data Schema**:
```typescript
{
  splitId: string;
  milestoneId: string;
  description: string;
  completedAt: Date;
  completedBy: string;
}
```

**Use Cases**:
- Milestone requirements met
- Milestone approved

**Projections Affected**:
- Split Analytics Projection

---

## Refund Events

### RefundCreated

**Description**: Emitted when a refund request is created.

**Event Type**: `RefundCreated`

**Stream**: `refund-{refundId}`

**Data Schema**:
```typescript
{
  refundId: string;
  paymentId: string;
  merchantId: string;
  customerId: string;
  originalAmount: bigint;
  refundAmount: bigint;
  refundType: 'FULL' | 'PARTIAL';
  reason: RefundReason;
  reasonDescription?: string;
  feeAmount: bigint;
  netAmount: bigint;
  metadata?: Record<string, any>;
}
```

**Use Cases**:
- Customer requests refund
- Merchant initiates refund
- System-initiated refund

**Projections Affected**:
- Refund Analytics Projection

---

### RefundProcessed

**Description**: Emitted when refund processing begins.

**Event Type**: `RefundProcessed`

**Stream**: `refund-{refundId}`

**Data Schema**:
```typescript
{
  refundId: string;
  transactionHash: string;
  processedAt: Date;
}
```

**Use Cases**:
- Refund transaction submitted
- Processing started

**Projections Affected**:
- Refund Analytics Projection

---

### RefundCompleted

**Description**: Emitted when a refund is completed successfully.

**Event Type**: `RefundCompleted`

**Stream**: `refund-{refundId}`

**Data Schema**:
```typescript
{
  refundId: string;
  transactionHash: string;
  completedAt: Date;
}
```

**Use Cases**:
- Refund transaction confirmed
- Funds returned to customer

**Projections Affected**:
- Refund Analytics Projection

---

### RefundFailed

**Description**: Emitted when a refund fails.

**Event Type**: `RefundFailed`

**Stream**: `refund-{refundId}`

**Data Schema**:
```typescript
{
  refundId: string;
  failureReason: string;
  failedAt: Date;
}
```

**Use Cases**:
- Refund transaction failed
- Insufficient funds
- Network issues

**Projections Affected**:
- Refund Analytics Projection

---

### RefundReversed

**Description**: Emitted when a refund is reversed.

**Event Type**: `RefundReversed`

**Stream**: `refund-{refundId}`

**Data Schema**:
```typescript
{
  refundId: string;
  reversedAt: Date;
}
```

**Use Cases**:
- Chargeback reversal
- Dispute resolution
- Administrative reversal

**Projections Affected**:
- Refund Analytics Projection

---

## Conversion Events

### ConversionCreated

**Description**: Emitted when a conversion request is created.

**Event Type**: `ConversionCreated`

**Stream**: `conversion-{conversionId}`

**Data Schema**:
```typescript
{
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
}
```

**Use Cases**:
- Customer initiates conversion
- Auto-conversion triggered
- Cross-chain transfer requested

**Projections Affected**:
- Conversion Analytics Projection (if implemented)

---

### ConversionPriceDiscovered

**Description**: Emitted when conversion price is discovered.

**Event Type**: `ConversionPriceDiscovered`

**Stream**: `conversion-{conversionId}`

**Data Schema**:
```typescript
{
  conversionId: string;
  dexType: string;
  routeData: any;
  discoveredAt: Date;
}
```

**Use Cases**:
- Best price found
- Route determined
- DEX selected

**Projections Affected**:
- Conversion Analytics Projection (if implemented)

---

### ConversionExecuting

**Description**: Emitted when conversion execution begins.

**Event Type**: `ConversionExecuting`

**Stream**: `conversion-{conversionId}`

**Data Schema**:
```typescript
{
  conversionId: string;
  executingAt: Date;
}
```

**Use Cases**:
- Swap transaction initiated
- Execution started

**Projections Affected**:
- Conversion Analytics Projection (if implemented)

---

### ConversionSwapped

**Description**: Emitted when token swap is completed.

**Event Type**: `ConversionSwapped`

**Stream**: `conversion-{conversionId}`

**Data Schema**:
```typescript
{
  conversionId: string;
  sourceTxHash: string;
  transactionData: any;
  actualAmount: bigint;
  actualSlippage: bigint;
  swappedAt: Date;
}
```

**Use Cases**:
- DEX swap completed
- Tokens exchanged
- Actual amount determined

**Projections Affected**:
- Conversion Analytics Projection (if implemented)

---

### ConversionBridging

**Description**: Emitted when bridge transfer begins.

**Event Type**: `ConversionBridging`

**Stream**: `conversion-{conversionId}`

**Data Schema**:
```typescript
{
  conversionId: string;
  bridgeType: string;
  bridgeData: any;
  bridgingAt: Date;
}
```

**Use Cases**:
- Cross-chain bridge initiated
- Bridge transfer started

**Projections Affected**:
- Conversion Analytics Projection (if implemented)

---

### ConversionBridged

**Description**: Emitted when bridge transfer is completed.

**Event Type**: `ConversionBridged`

**Stream**: `conversion-{conversionId}`

**Data Schema**:
```typescript
{
  conversionId: string;
  bridgeTxHash: string;
  bridgedAt: Date;
}
```

**Use Cases**:
- Bridge transfer completed
- Tokens arrived on target chain

**Projections Affected**:
- Conversion Analytics Projection (if implemented)

---

### ConversionSettling

**Description**: Emitted when Stellar settlement begins.

**Event Type**: `ConversionSettling`

**Stream**: `conversion-{conversionId}`

**Data Schema**:
```typescript
{
  conversionId: string;
  settlingAt: Date;
}
```

**Use Cases**:
- Stellar deposit initiated
- Settlement started

**Projections Affected**:
- Conversion Analytics Projection (if implemented)

---

### ConversionCompleted

**Description**: Emitted when conversion is fully completed.

**Event Type**: `ConversionCompleted`

**Stream**: `conversion-{conversionId}`

**Data Schema**:
```typescript
{
  conversionId: string;
  targetAmount: bigint;
  settlementTxHash: string;
  feeAmount: bigint;
  gasAmount: bigint;
  completedAt: Date;
}
```

**Use Cases**:
- Full conversion completed
- Funds deposited to vault
- All steps successful

**Projections Affected**:
- Conversion Analytics Projection (if implemented)

---

### ConversionFailed

**Description**: Emitted when conversion fails.

**Event Type**: `ConversionFailed`

**Stream**: `conversion-{conversionId}`

**Data Schema**:
```typescript
{
  conversionId: string;
  errorMessage: string;
  errorDetails: any;
  failedAt: Date;
  retryCount: number;
}
```

**Use Cases**:
- Swap transaction failed
- Bridge transfer failed
- Settlement failed
- Insufficient liquidity

**Projections Affected**:
- Conversion Analytics Projection (if implemented)

---

### ConversionCancelled

**Description**: Emitted when conversion is cancelled.

**Event Type**: `ConversionCancelled`

**Stream**: `conversion-{conversionId}`

**Data Schema**:
```typescript
{
  conversionId: string;
  cancelledAt: Date;
}
```

**Use Cases**:
- Customer cancels conversion
- System-initiated cancellation
- Timeout cancellation

**Projections Affected**:
- Conversion Analytics Projection (if implemented)

---

## Event Versioning

### Versioning Strategy

Events are versioned using the following strategy:

1. **Event Type Versioning**: When event structure changes, create a new event type
   - Example: `PaymentCreatedV2`

2. **Backward Compatibility**: Maintain compatibility with old event versions
   - Use schema validation
   - Provide migration logic

3. **Deprecation**: Mark old event versions as deprecated
   - Document deprecation timeline
   - Provide migration path

### Schema Evolution

When evolving event schemas:

1. Add new fields (non-breaking)
2. Mark deprecated fields (non-breaking)
3. Create new event type for breaking changes
4. Maintain event catalog documentation

## Event Naming Conventions

- Use PascalCase for event types
- Use descriptive, action-oriented names
- Include domain entity name
- Use past tense for completed actions
- Use present participle for ongoing actions

Examples:
- ✅ `PaymentCreated`
- ✅ `PaymentProcessing`
- ✅ `SubscriptionPaymentFailed`
- ❌ `payment_created`
- ❌ `CreatePayment`
- ❌ `PaymentError`

## Event Metadata

All events support optional metadata for:

- Correlation IDs
- Causation IDs
- User context
- System information
- Debug information

Example:
```typescript
{
  correlationId: string;
  causationId: string;
  userId: string;
  requestId: string;
  system: string;
  version: string;
}
```
