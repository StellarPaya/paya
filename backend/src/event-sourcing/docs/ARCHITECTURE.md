# Event Sourcing and CQRS Architecture Documentation

## Overview

This document describes the Event Sourcing and CQRS (Command Query Responsibility Segregation) architecture implemented for the Paya backend system.

## Architecture Components

### 1. Event Store Service

The Event Store is the core component that persists all domain events immutably. It provides:

- **Append-only semantics**: Events are never modified, only appended
- **Optimistic concurrency**: Ensures data consistency during concurrent writes
- **Stream-based organization**: Events are organized by streams (e.g., `payment-{id}`)
- **Global positioning**: Each event has a unique global position for ordering
- **Snapshot support**: Allows creating snapshots for faster replay

#### Key Methods

```typescript
// Append a single event
async appendEvent(streamId: string, event: DomainEvent, expectedVersion?: number): Promise<EventRecord>

// Append multiple events atomically
async appendEvents(streamId: string, events: DomainEvent[], expectedVersion?: number): Promise<EventRecord[]>

// Read events from a specific stream
async readStream(streamId: string, fromVersion?: number, maxCount?: number): Promise<EventRecord[]>

// Read all events globally
async readAllEvents(fromPosition?: number, maxCount?: number): Promise<EventRecord[]>

// Subscribe to stream events
async subscribeToStream(streamId: string, handler: EventHandler, fromPosition?: number): Promise<Subscription>

// Subscribe to all events
async subscribeToAll(handler: EventHandler, fromPosition?: number): Promise<Subscription>

// Create a snapshot
async createSnapshot(streamId: string, version: number, state: any): Promise<Snapshot>

// Get latest snapshot
async getLatestSnapshot(streamId: string): Promise<Snapshot | null>
```

### 2. Command Bus

The Command Bus handles write operations (commands) and routes them to appropriate handlers.

#### Command Structure

```typescript
interface Command {
  commandType: string;
  timestamp: Date;
  metadata?: Record<string, any>;
}
```

#### Usage Example

```typescript
// Register a command handler
commandBus.registerHandler('CreatePayment', createPaymentHandler);

// Execute a command
const result = await commandBus.execute(new CreatePaymentCommand(...));
```

### 3. Query Bus

The Query Bus handles read operations (queries) and routes them to appropriate handlers.

#### Query Structure

```typescript
interface Query {
  queryType: string;
  timestamp: Date;
  metadata?: Record<string, any>;
}
```

#### Usage Example

```typescript
// Register a query handler
queryBus.registerHandler('GetPaymentHistory', getPaymentHistoryHandler);

// Execute a query
const result = await queryBus.execute(new GetPaymentHistoryQuery(...));
```

### 4. Event Projections

Projections are read-optimized views built from event streams. They support:

- **Incremental updates**: Only process new events
- **Rebuild capability**: Can be rebuilt from event history
- **Multiple projections**: Different views for different use cases

#### Available Projections

1. **Payment Analytics Projection**
   - Tracks payment metrics per merchant
   - Provides real-time payment statistics
   - Supports payment history analysis

2. **Subscription Analytics Projection**
   - Tracks subscription metrics
   - Calculates MRR (Monthly Recurring Revenue)
   - Monitors subscription lifecycle

3. **Real-time Monitoring Projection**
   - Tracks active payments
   - Generates alerts for anomalies
   - Provides real-time payment status

### 5. Message Queue Integration

The system includes placeholder implementations for:

- **Event Publisher**: Publishes events to message queues (RabbitMQ/Kafka)
- **Event Subscriber**: Consumes events from message queues
- **Topic-based routing**: Events are routed to specific topics

### 6. Event Replay and Recovery

The replay system provides:

- **Stream replay**: Replay events from a specific stream
- **Global replay**: Replay all events
- **Snapshot-based replay**: Replay from snapshot for faster recovery
- **Time travel**: View system state at any point in time
- **Projection rebuild**: Rebuild projections from event history

## Event Schema Design

### Payment Events

- `PaymentCreated`: Initial payment creation
- `PaymentConfirmed`: Payment confirmed on blockchain
- `PaymentSettled`: Payment settled on Stellar
- `PaymentFailed`: Payment processing failed
- `PaymentCancelled`: Payment cancelled
- `PaymentExpired`: Payment expired

### Subscription Events

- `SubscriptionCreated`: New subscription created
- `SubscriptionPlanChanged`: Subscription plan changed
- `SubscriptionCancelled`: Subscription cancelled
- `SubscriptionPaused`: Subscription paused
- `SubscriptionResumed`: Subscription resumed
- `SubscriptionPaymentProcessed`: Recurring payment processed
- `SubscriptionPaymentFailed`: Recurring payment failed
- `SubscriptionTrialEnded`: Trial period ended

### Split Events

- `SplitCreated`: Payment split created
- `SplitExecuted`: Split execution started
- `SplitDistributionStarted`: Distribution to recipient started
- `SplitDistributionCompleted`: Distribution completed
- `SplitDistributionFailed`: Distribution failed
- `SplitCompleted`: Split fully completed
- `SplitCancelled`: Split cancelled
- `MilestoneTriggered`: Milestone triggered
- `MilestoneCompleted`: Milestone completed

### Refund Events

- `RefundCreated`: Refund request created
- `RefundProcessed`: Refund processing started
- `RefundCompleted`: Refund completed successfully
- `RefundFailed`: Refund processing failed
- `RefundReversed`: Refund reversed

### Conversion Events

- `ConversionCreated`: Conversion request created
- `ConversionPriceDiscovered`: Price discovered
- `ConversionExecuting`: Conversion executing
- `ConversionSwapped`: Token swap completed
- `ConversionBridging`: Bridge transfer started
- `ConversionBridged`: Bridge transfer completed
- `ConversionSettling`: Settlement on Stellar started
- `ConversionCompleted`: Conversion completed
- `ConversionFailed`: Conversion failed
- `ConversionCancelled`: Conversion cancelled

## Database Schema

### Event Store Table

```sql
CREATE TABLE event_store (
  id UUID PRIMARY KEY,
  stream_id VARCHAR(255) NOT NULL,
  stream_version BIGINT NOT NULL,
  event_type VARCHAR(255) NOT NULL,
  event_data JSONB NOT NULL,
  metadata JSONB,
  position BIGINT NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL,
  UNIQUE(stream_id, stream_version)
);

CREATE INDEX idx_event_store_stream_id ON event_store(stream_id);
CREATE INDEX idx_event_store_created_at ON event_store(created_at);
CREATE INDEX idx_event_store_event_type ON event_store(event_type);
CREATE INDEX idx_event_store_position ON event_store(position);
```

### Snapshots Table

```sql
CREATE TABLE snapshots (
  stream_id VARCHAR(255) PRIMARY KEY,
  stream_version BIGINT NOT NULL,
  snapshot_data JSONB NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL
);
```

### Projection Tables

#### Payment Analytics
```sql
CREATE TABLE payment_analytics (
  merchant_id VARCHAR(255) PRIMARY KEY,
  total_payments BIGINT DEFAULT 0,
  total_amount DECIMAL(20, 8) DEFAULT 0,
  successful_payments BIGINT DEFAULT 0,
  failed_payments BIGINT DEFAULT 0,
  pending_payments BIGINT DEFAULT 0,
  last_payment_at TIMESTAMP WITH TIME ZONE,
  updated_at TIMESTAMP WITH TIME ZONE
);
```

#### Daily Payment Metrics
```sql
CREATE TABLE daily_payment_metrics (
  merchant_id VARCHAR(255),
  date DATE,
  payment_count BIGINT DEFAULT 0,
  total_amount DECIMAL(20, 8) DEFAULT 0,
  successful_count BIGINT DEFAULT 0,
  failed_count BIGINT DEFAULT 0,
  avg_amount DECIMAL(20, 8),
  updated_at TIMESTAMP WITH TIME ZONE,
  PRIMARY KEY(merchant_id, date)
);
```

## Performance Requirements

- **Event Append Latency**: < 50ms for single event writes
- **Event Read Throughput**: > 10,000 events/second for bulk reads
- **Projection Update Latency**: < 100ms for single event processing
- **Query Response Time**: < 200ms for analytics queries
- **Event Replay Speed**: > 1,000 events/second for projection rebuilds

## Migration Strategy

### Phase 1: Dual Write (Recommended)

1. Keep existing CRUD operations
2. Add event sourcing alongside
3. Write to both systems
4. Validate consistency
5. Gradually migrate read operations to projections

### Phase 2: Event-Only Write

1. Remove direct database writes
2. Use only event store for writes
3. Maintain projections for reads
4. Monitor performance and consistency

### Phase 3: Full Migration

1. Remove old CRUD tables
2. Use only event sourcing architecture
3. Optimize projections based on usage patterns

## Best Practices

### Event Design

- **Immutable**: Events should never be modified
- **Descriptive**: Use clear, descriptive event names
- **Complete**: Include all necessary data in the event
- **Versioned**: Include version information for schema evolution
- **Timestamped**: Always include creation timestamp

### Command Design

- **Validated**: Validate commands before processing
- **Idempotent**: Commands should be safe to retry
- **Atomic**: Commands should represent single business actions
- **Auditable**: Include who/when/why information

### Projection Design

- **Optimized**: Design for specific query patterns
- **Rebuildable**: Must be rebuildable from events
- **Consistent**: Handle eventual consistency
- **Monitored**: Track projection lag and health

### Error Handling

- **Retry**: Implement retry logic for transient failures
- **Dead Letter Queue**: Route failed events for manual inspection
- **Logging**: Comprehensive logging for debugging
- **Monitoring**: Track event processing metrics

## Security Considerations

- **Event Validation**: Validate event structure and content
- **Access Control**: Implement proper authorization for commands/queries
- **Audit Trail**: Maintain audit trail for all operations
- **Data Encryption**: Encrypt sensitive event data
- **Secure Snapshots**: Protect snapshot data appropriately

## Monitoring and Observability

### Key Metrics

- Event append rate and latency
- Event processing throughput
- Projection lag and health
- Command/query execution times
- Error rates and types

### Logging

- Event append operations
- Command/query execution
- Projection updates
- Replay operations
- Error conditions

### Alerts

- High event processing latency
- Projection lag exceeding threshold
- High error rates
- Event store connectivity issues
- Projection consistency issues
