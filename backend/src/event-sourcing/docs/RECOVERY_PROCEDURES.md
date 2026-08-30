# Event Sourcing Recovery Procedures

This document outlines the procedures for recovering from various failure scenarios in the event-sourced Paya backend system.

## Table of Contents

1. [Projection Recovery](#projection-recovery)
2. [Event Store Recovery](#event-store-recovery)
3. [Snapshot Recovery](#snapshot-recovery)
4. [Message Queue Recovery](#message-queue-recovery)
5. [Consistency Validation](#consistency-validation)
6. [Disaster Recovery](#disaster-recovery)

## Projection Recovery

### Scenario: Projection Corrupted or Out of Sync

#### Symptoms

- Projection data inconsistent with event store
- Projection queries returning incorrect results
- Projection lag exceeding threshold
- Projection rebuild errors

#### Recovery Steps

1. **Identify Affected Projection**

```bash
# Check projection health
curl http://localhost:4000/api/event-sourcing/projections/health
```

2. **Stop Projection Updates**

```typescript
// Stop the projection from processing new events
// This prevents further corruption during recovery
```

3. **Backup Current Projection Data**

```bash
# Export projection data for rollback if needed
pg_dump -t payment_analytics -f payment_analytics_backup.sql
```

4. **Rebuild Projection**

```typescript
// Using ProjectionRebuildService
await projectionRebuildService.rebuildProjection({
  projectionType: 'payment',
  fromPosition: 0,
  batchSize: 1000,
});
```

5. **Validate Rebuilt Projection**

```typescript
// Check consistency
const validation = await projectionRebuildService.validateProjectionConsistency();
if (!validation.isConsistent) {
  // Investigate inconsistencies
}
```

6. **Resume Projection Updates**

```typescript
// Resume normal event processing
```

### Scenario: Single Projection Failure

#### Recovery Steps

1. **Isolate Failed Projection**
2. **Rebuild Only Failed Projection**
3. **Validate Against Event Store**
4. **Resume Operation**

## Event Store Recovery

### Scenario: Event Store Corruption

#### Symptoms

- Event append operations failing
- Event read operations returning errors
- Database integrity errors
- Inconsistent event sequences

#### Recovery Steps

1. **Assess Damage**

```bash
# Check event store integrity
SELECT COUNT(*) FROM event_store;
SELECT stream_id, COUNT(*) FROM event_store GROUP BY stream_id HAVING COUNT(*) != MAX(stream_version);
```

2. **Identify Corrupted Streams**

```typescript
// Find streams with version gaps
const streamInfos = await eventStore.getStreamInfo();
for (const info of streamInfos) {
  const events = await eventStore.readStream(info.streamId);
  // Check for version gaps
}
```

3. **Restore from Backup**

```bash
# Restore from most recent backup
pg_restore -d paya event_store_backup.dump
```

4. **Replay Events Since Backup**

```typescript
// Replay events from backup position
await eventReplayService.replayAll(handler, {
  fromPosition: backupPosition,
  batchSize: 1000,
});
```

5. **Validate Event Store**

```typescript
// Verify all streams are consistent
const stats = await eventReplayService.getReplayStatistics();
```

### Scenario: Event Store Unavailable

#### Recovery Steps

1. **Switch to Read-Only Mode**
2. **Use Cached Projections**
3. **Queue Commands for Later Processing**
4. **Restore Event Store Service**
5. **Replay Queued Commands**
6. **Resume Normal Operation**

## Snapshot Recovery

### Scenario: Snapshot Corruption

#### Symptoms

- Snapshot load failures
- Inconsistent snapshot data
- Snapshot replay errors

#### Recovery Steps

1. **Delete Corrupted Snapshot**

```typescript
await eventStore.deleteSnapshot(streamId);
```

2. **Rebuild from Events**

```typescript
// Replay events without snapshot
await eventReplayService.replayStream(streamId, handler);
```

3. **Create New Snapshot**

```typescript
// After successful replay, create new snapshot
const state = await getCurrentState(streamId);
await eventStore.createSnapshot(streamId, version, state);
```

### Scenario: Missing Snapshot

#### Recovery Steps

1. **Replay from Beginning**
2. **Create New Snapshot**
3. **Schedule Regular Snapshots**

## Message Queue Recovery

### Scenario: Message Queue Failure

#### Symptoms

- Event publishing failures
- Event subscription failures
- High message backlog
- Consumer errors

#### Recovery Steps

1. **Identify Failed Messages**

```bash
# Check dead letter queue
# Review error logs
```

2. **Restart Message Queue Service**

```typescript
await eventPublisherService.disconnect();
await eventPublisherService.initializeConnection();
```

3. **Replay Failed Messages**

```typescript
// Republish events from event store
const events = await eventStore.readAllEvents(fromPosition);
for (const event of events) {
  await eventPublisherService.publish(event, topic);
}
```

4. **Resume Normal Processing**

```typescript
await eventSubscriberService.startConsuming(topics);
```

### Scenario: Consumer Lag

#### Recovery Steps

1. **Measure Consumer Lag**
2. **Scale Consumer Instances**
3. **Increase Batch Size**
4. **Optimize Consumer Logic**
5. **Monitor Recovery Progress**

## Consistency Validation

### Regular Validation Procedures

#### Daily Validation

```typescript
// Validate projection consistency
const validation = await projectionRebuildService.validateProjectionConsistency();
if (!validation.isConsistent) {
  // Alert team
  // Initiate recovery
}
```

#### Weekly Validation

```typescript
// Compare event store counts with projection counts
// Verify stream version sequences
// Check snapshot integrity
```

#### Monthly Validation

```typescript
// Full system consistency check
// Time travel validation for key streams
// Performance benchmarking
```

### Validation Scripts

```typescript
// Validate stream consistency
async function validateStreamConsistency(streamId: string): Promise<boolean> {
  const events = await eventStore.readStream(streamId);
  for (let i = 0; i < events.length; i++) {
    if (events[i].streamVersion !== i + 1) {
      return false;
    }
  }
  return true;
}

// Validate projection consistency
async function validateProjectionConsistency(projectionName: string): Promise<boolean> {
  // Compare event store state with projection state
  // Return true if consistent
}
```

## Disaster Recovery

### Scenario: Complete System Failure

#### Recovery Steps

1. **Assess Damage**
   - Identify failed components
   - Determine data loss extent
   - Estimate recovery time

2. **Restore Infrastructure**
   - Restore database from backup
   - Deploy application services
   - Configure message queues

3. **Restore Event Store**
   - Restore event store data
   - Validate event integrity
   - Verify event sequences

4. **Rebuild Projections**
   - Rebuild all projections
   - Validate projection consistency
   - Monitor performance

5. **Resume Operations**
   - Start event processing
   - Enable command execution
   - Monitor system health

### Scenario: Data Center Failure

#### Recovery Steps

1. **Failover to Backup Region**
2. **Restore from Geo-Replicated Backups**
3. **Rebuild Projections in New Region**
4. **Update DNS/Load Balancers**
5. **Validate System Functionality**

### Scenario: Ransomware Attack

#### Recovery Steps

1. **Isolate Affected Systems**
2. **Restore from Clean Backups**
3. **Change All Credentials**
4. **Audit System Logs**
5. **Implement Additional Security Measures**
6. **Monitor for Suspicious Activity**

## Recovery Time Objectives (RTO) and Recovery Point Objectives (RPO)

| Component | RTO | RPO |
|-----------|-----|-----|
| Event Store | 1 hour | 5 minutes |
| Projections | 2 hours | 15 minutes |
| Snapshots | 4 hours | 1 hour |
| Message Queue | 30 minutes | 0 (in-memory) |
| Full System | 4 hours | 15 minutes |

## Backup Strategy

### Event Store Backups

- **Frequency**: Every 5 minutes
- **Retention**: 30 days
- **Type**: Incremental + Daily Full
- **Location**: Multi-region

### Projection Backups

- **Frequency**: Hourly
- **Retention**: 7 days
- **Type**: Full
- **Location**: Local + Remote

### Snapshot Backups

- **Frequency**: Daily
- **Retention**: 90 days
- **Type**: Full
- **Location**: Multi-region

## Monitoring and Alerting

### Key Metrics to Monitor

- Event append rate and latency
- Projection lag and health
- Message queue backlog
- Error rates and types
- System resource usage

### Alert Thresholds

- Event append latency > 100ms
- Projection lag > 5 minutes
- Error rate > 1%
- Message queue backlog > 10,000
- Database connection pool > 80%

### Escalation Procedures

1. **Level 1**: Automated recovery attempts
2. **Level 2**: On-call engineer notification
3. **Level 3**: Team lead notification
4. **Level 4**: Management notification

## Testing Recovery Procedures

### Regular Testing Schedule

- **Weekly**: Automated recovery tests
- **Monthly**: Manual recovery drills
- **Quarterly**: Full disaster recovery test

### Test Scenarios

1. Projection corruption
2. Event store unavailability
3. Message queue failure
4. Network partition
5. Complete system failure

### Test Documentation

- Document all test results
- Update procedures based on findings
- Train team on recovery procedures
- Maintain runbooks for common scenarios

## Contact Information

### Primary Contacts

- **On-Call Engineer**: [Phone/Slack]
- **Team Lead**: [Phone/Slack]
- **Database Administrator**: [Phone/Slack]
- **DevOps Engineer**: [Phone/Slack]

### Escalation Contacts

- **Engineering Manager**: [Phone/Slack]
- **CTO**: [Phone/Slack]
- **VP Engineering**: [Phone/Slack]

## Additional Resources

- [Architecture Documentation](./ARCHITECTURE.md)
- [Event Catalog](./EVENT_CATALOG.md)
- [Runbooks](../runbooks/)
- [Monitoring Dashboard](https://monitoring.paya.io)
- [Alerting System](https://alerts.paya.io)
