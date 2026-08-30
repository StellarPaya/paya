import { Injectable, Logger, ConflictException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { DomainEvent, EventRecord, Snapshot, EventHandler, Subscription } from '../interfaces/domain-event.interface';
import { EventStore } from '../entities/event-store.entity';
import { Snapshot as SnapshotEntity } from '../entities/snapshot.entity';

@Injectable()
export class EventStoreService {
  private readonly logger = new Logger(EventStoreService.name);
  private subscriptions: Map<string, Subscription[]> = new Map();
  private globalPosition: number = 0;

  constructor(
    @InjectRepository(EventStore)
    private eventRepository: Repository<EventStore>,
    @InjectRepository(SnapshotEntity)
    private snapshotRepository: Repository<SnapshotEntity>,
  ) {
    this.initializeGlobalPosition();
  }

  private async initializeGlobalPosition(): Promise<void> {
    const latestEvent = await this.eventRepository
      .createQueryBuilder('event')
      .orderBy('event.position', 'DESC')
      .limit(1)
      .getOne();
    
    this.globalPosition = latestEvent?.position || 0;
  }

  async appendEvent(
    streamId: string,
    event: DomainEvent,
    expectedVersion?: number,
  ): Promise<EventRecord> {
    // Get current stream version
    const currentVersion = await this.getCurrentStreamVersion(streamId);

    // Optimistic concurrency check
    if (expectedVersion !== undefined && currentVersion !== expectedVersion) {
      throw new ConflictException(
        `Stream version mismatch. Expected ${expectedVersion}, but current is ${currentVersion}`,
      );
    }

    // Set stream version
    event.streamId = streamId;
    event.streamVersion = currentVersion + 1;

    // Increment global position
    this.globalPosition += 1;

    // Create event record
    const eventRecord = this.eventRepository.create({
      streamId: event.streamId,
      streamVersion: event.streamVersion,
      eventType: event.eventType,
      eventData: event.data,
      metadata: event.metadata,
      position: this.globalPosition,
    });

    try {
      const savedEvent = await this.eventRepository.save(eventRecord);

      // Create event record object
      const record: EventRecord = {
        id: savedEvent.id,
        eventId: event.eventId,
        eventType: event.eventType,
        streamId: event.streamId,
        streamVersion: event.streamVersion,
        timestamp: savedEvent.createdAt,
        data: event.data,
        metadata: event.metadata,
        position: savedEvent.position,
      };

      // Notify subscribers
      await this.notifySubscribers(streamId, record);
      await this.notifyGlobalSubscribers(record);

      this.logger.log(
        `Appended event ${event.eventType} to stream ${streamId} at version ${event.streamVersion}`,
      );

      return record;
    } catch (error) {
      if (error.code === '23505') { // Unique violation
        this.globalPosition -= 1; // Rollback position increment
        throw new ConflictException(
          `Concurrent modification detected for stream ${streamId}`,
        );
      }
      throw error;
    }
  }

  async appendEvents(
    streamId: string,
    events: DomainEvent[],
    expectedVersion?: number,
  ): Promise<EventRecord[]> {
    const records: EventRecord[] = [];
    let currentVersion = expectedVersion ?? await this.getCurrentStreamVersion(streamId);

    for (const event of events) {
      event.streamId = streamId;
      event.streamVersion = currentVersion + 1;
      currentVersion += 1;
    }

    // Bulk insert with transaction
    await this.eventRepository.manager.transaction(async (transactionalEntityManager) => {
      for (const event of events) {
        this.globalPosition += 1;
        
        const eventRecord = transactionalEntityManager.create(EventStore, {
          streamId: event.streamId,
          streamVersion: event.streamVersion,
          eventType: event.eventType,
          eventData: event.data,
          metadata: event.metadata,
          position: this.globalPosition,
        });

        const savedEvent = await transactionalEntityManager.save(eventRecord);

        records.push({
          id: savedEvent.id,
          eventId: event.eventId,
          eventType: event.eventType,
          streamId: event.streamId,
          streamVersion: event.streamVersion,
          timestamp: savedEvent.createdAt,
          data: event.data,
          metadata: event.metadata,
          position: savedEvent.position,
        });
      }
    });

    // Notify subscribers for all events
    for (const record of records) {
      await this.notifySubscribers(streamId, record);
      await this.notifyGlobalSubscribers(record);
    }

    this.logger.log(
      `Appended ${events.length} events to stream ${streamId}`,
    );

    return records;
  }

  async readStream(
    streamId: string,
    fromVersion?: number,
    maxCount?: number,
  ): Promise<EventRecord[]> {
    const queryBuilder = this.eventRepository
      .createQueryBuilder('event')
      .where('event.streamId = :streamId', { streamId })
      .orderBy('event.streamVersion', 'ASC');

    if (fromVersion !== undefined) {
      queryBuilder.andWhere('event.streamVersion >= :fromVersion', { fromVersion });
    }

    if (maxCount !== undefined) {
      queryBuilder.limit(maxCount);
    }

    const events = await queryBuilder.getMany();

    return events.map(event => ({
      id: event.id,
      eventId: event.eventData.eventId || event.id,
      eventType: event.eventType,
      streamId: event.streamId,
      streamVersion: event.streamVersion,
      timestamp: event.createdAt,
      data: event.eventData,
      metadata: event.metadata,
      position: event.position,
    }));
  }

  async readAllEvents(
    fromPosition?: number,
    maxCount?: number,
  ): Promise<EventRecord[]> {
    const queryBuilder = this.eventRepository
      .createQueryBuilder('event')
      .orderBy('event.position', 'ASC');

    if (fromPosition !== undefined) {
      queryBuilder.andWhere('event.position >= :fromPosition', { fromPosition });
    }

    if (maxCount !== undefined) {
      queryBuilder.limit(maxCount);
    }

    const events = await queryBuilder.getMany();

    return events.map(event => ({
      id: event.id,
      eventId: event.eventData.eventId || event.id,
      eventType: event.eventType,
      streamId: event.streamId,
      streamVersion: event.streamVersion,
      timestamp: event.createdAt,
      data: event.eventData,
      metadata: event.metadata,
      position: event.position,
    }));
  }

  async subscribeToStream(
    streamId: string,
    handler: EventHandler,
    fromPosition?: number,
  ): Promise<Subscription> {
    const subscription: Subscription = {
      streamId,
      handler,
      fromPosition,
      unsubscribe: () => {
        const subs = this.subscriptions.get(streamId) || [];
        const index = subs.indexOf(subscription);
        if (index > -1) {
          subs.splice(index, 1);
        }
      },
    };

    if (!this.subscriptions.has(streamId)) {
      this.subscriptions.set(streamId, []);
    }

    this.subscriptions.get(streamId)!.push(subscription);

    // Replay existing events if fromPosition is specified
    if (fromPosition !== undefined) {
      const events = await this.readStream(streamId, fromPosition);
      for (const event of events) {
        await handler.handle(event);
      }
    }

    this.logger.log(`Subscribed to stream ${streamId}`);
    return subscription;
  }

  async subscribeToAll(
    handler: EventHandler,
    fromPosition?: number,
  ): Promise<Subscription> {
    const streamId = '$all';
    const subscription: Subscription = {
      streamId,
      handler,
      fromPosition,
      unsubscribe: () => {
        const subs = this.subscriptions.get(streamId) || [];
        const index = subs.indexOf(subscription);
        if (index > -1) {
          subs.splice(index, 1);
        }
      },
    };

    if (!this.subscriptions.has(streamId)) {
      this.subscriptions.set(streamId, []);
    }

    this.subscriptions.get(streamId)!.push(subscription);

    // Replay existing events if fromPosition is specified
    if (fromPosition !== undefined) {
      const events = await this.readAllEvents(fromPosition);
      for (const event of events) {
        await handler.handle(event);
      }
    }

    this.logger.log(`Subscribed to all streams from position ${fromPosition}`);
    return subscription;
  }

  async createSnapshot(
    streamId: string,
    version: number,
    state: any,
  ): Promise<Snapshot> {
    const snapshot = this.snapshotRepository.create({
      streamId,
      streamVersion: version,
      snapshotData: state,
    });

    await this.snapshotRepository.save(snapshot);

    this.logger.log(
      `Created snapshot for stream ${streamId} at version ${version}`,
    );

    return {
      streamId,
      streamVersion: version,
      state,
      createdAt: snapshot.createdAt,
    };
  }

  async getLatestSnapshot(streamId: string): Promise<Snapshot | null> {
    const snapshot = await this.snapshotRepository.findOne({
      where: { streamId },
    });

    if (!snapshot) {
      return null;
    }

    return {
      streamId: snapshot.streamId,
      streamVersion: snapshot.streamVersion,
      state: snapshot.snapshotData,
      createdAt: snapshot.createdAt,
    };
  }

  async deleteSnapshot(streamId: string): Promise<void> {
    await this.snapshotRepository.delete({ streamId });
    this.logger.log(`Deleted snapshot for stream ${streamId}`);
  }

  async getCurrentStreamVersion(streamId: string): Promise<number> {
    const latestEvent = await this.eventRepository
      .createQueryBuilder('event')
      .where('event.streamId = :streamId', { streamId })
      .orderBy('event.streamVersion', 'DESC')
      .limit(1)
      .getOne();

    return latestEvent?.streamVersion || 0;
  }

  async getStreamInfo(streamId: string): Promise<{
    streamId: string;
    currentVersion: number;
    eventCount: number;
    lastEventAt: Date | null;
  }> {
    const [latestEvent, eventCount] = await Promise.all([
      this.eventRepository
        .createQueryBuilder('event')
        .where('event.streamId = :streamId', { streamId })
        .orderBy('event.streamVersion', 'DESC')
        .limit(1)
        .getOne(),
      this.eventRepository
        .createQueryBuilder('event')
        .where('event.streamId = :streamId', { streamId })
        .getCount(),
    ]);

    return {
      streamId,
      currentVersion: latestEvent?.streamVersion || 0,
      eventCount,
      lastEventAt: latestEvent?.createdAt || null,
    };
  }

  private async notifySubscribers(streamId: string, event: EventRecord): Promise<void> {
    const subscribers = this.subscriptions.get(streamId) || [];
    
    for (const subscription of subscribers) {
      try {
        await subscription.handler.handle(event);
      } catch (error) {
        this.logger.error(
          `Error in subscription handler for stream ${streamId}: ${error.message}`,
          error.stack,
        );
      }
    }
  }

  private async notifyGlobalSubscribers(event: EventRecord): Promise<void> {
    const subscribers = this.subscriptions.get('$all') || [];
    
    for (const subscription of subscribers) {
      try {
        await subscription.handler.handle(event);
      } catch (error) {
        this.logger.error(
          `Error in global subscription handler: ${error.message}`,
          error.stack,
        );
      }
    }
  }
}
