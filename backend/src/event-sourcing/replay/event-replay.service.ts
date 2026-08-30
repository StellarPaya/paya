import { Injectable, Logger } from '@nestjs/common';
import { EventStoreService } from '../services/event-store.service';
import { DomainEvent, EventHandler } from '../interfaces/domain-event.interface';

export interface ReplayOptions {
  fromPosition?: number;
  toPosition?: number;
  fromVersion?: number;
  toVersion?: number;
  batchSize?: number;
  delayBetweenBatches?: number;
}

export interface ReplayResult {
  totalEvents: number;
  processedEvents: number;
  failedEvents: number;
  duration: number;
  errors: Array<{ event: DomainEvent; error: string }>;
}

@Injectable()
export class EventReplayService {
  private readonly logger = new Logger(EventReplayService.name);

  constructor(private eventStore: EventStoreService) {}

  async replayStream(
    streamId: string,
    handler: EventHandler,
    options: ReplayOptions = {},
  ): Promise<ReplayResult> {
    const startTime = Date.now();
    const errors: Array<{ event: DomainEvent; error: string }> = [];
    let processedEvents = 0;
    let failedEvents = 0;

    this.logger.log(`Starting replay for stream ${streamId}`);

    try {
      const batchSize = options.batchSize || 100;
      const delayBetweenBatches = options.delayBetweenBatches || 0;

      let fromVersion = options.fromVersion;
      let hasMoreEvents = true;

      while (hasMoreEvents) {
        const events = await this.eventStore.readStream(
          streamId,
          fromVersion,
          batchSize,
        );

        if (events.length === 0) {
          hasMoreEvents = false;
          break;
        }

        for (const event of events) {
          if (options.toVersion && event.streamVersion > options.toVersion) {
            hasMoreEvents = false;
            break;
          }

          try {
            await handler.handle(event);
            processedEvents++;
          } catch (error) {
            failedEvents++;
            errors.push({
              event,
              error: error.message,
            });
            this.logger.error(
              `Error processing event ${event.eventId}: ${error.message}`,
            );
          }
        }

        fromVersion = events[events.length - 1].streamVersion + 1;

        if (delayBetweenBatches > 0 && hasMoreEvents) {
          await this.sleep(delayBetweenBatches);
        }
      }

      const duration = Date.now() - startTime;
      this.logger.log(
        `Replay completed for stream ${streamId}. Processed: ${processedEvents}, Failed: ${failedEvents}, Duration: ${duration}ms`,
      );

      return {
        totalEvents: processedEvents + failedEvents,
        processedEvents,
        failedEvents,
        duration,
        errors,
      };
    } catch (error) {
      this.logger.error(`Replay failed for stream ${streamId}: ${error.message}`);
      throw error;
    }
  }

  async replayAll(
    handler: EventHandler,
    options: ReplayOptions = {},
  ): Promise<ReplayResult> {
    const startTime = Date.now();
    const errors: Array<{ event: DomainEvent; error: string }> = [];
    let processedEvents = 0;
    let failedEvents = 0;

    this.logger.log('Starting replay for all streams');

    try {
      const batchSize = options.batchSize || 100;
      const delayBetweenBatches = options.delayBetweenBatches || 0;

      let fromPosition = options.fromPosition || 0;
      let hasMoreEvents = true;

      while (hasMoreEvents) {
        const events = await this.eventStore.readAllEvents(
          fromPosition,
          batchSize,
        );

        if (events.length === 0) {
          hasMoreEvents = false;
          break;
        }

        for (const event of events) {
          if (options.toPosition && event.position > options.toPosition) {
            hasMoreEvents = false;
            break;
          }

          try {
            await handler.handle(event);
            processedEvents++;
          } catch (error) {
            failedEvents++;
            errors.push({
              event,
              error: error.message,
            });
            this.logger.error(
              `Error processing event ${event.eventId}: ${error.message}`,
            );
          }
        }

        fromPosition = events[events.length - 1].position + 1;

        if (delayBetweenBatches > 0 && hasMoreEvents) {
          await this.sleep(delayBetweenBatches);
        }
      }

      const duration = Date.now() - startTime;
      this.logger.log(
        `Replay completed for all streams. Processed: ${processedEvents}, Failed: ${failedEvents}, Duration: ${duration}ms`,
      );

      return {
        totalEvents: processedEvents + failedEvents,
        processedEvents,
        failedEvents,
        duration,
        errors,
      };
    } catch (error) {
      this.logger.error(`Replay failed for all streams: ${error.message}`);
      throw error;
    }
  }

  async replayFromSnapshot(
    streamId: string,
    handler: EventHandler,
    options: ReplayOptions = {},
  ): Promise<ReplayResult> {
    const snapshot = await this.eventStore.getLatestSnapshot(streamId);

    if (!snapshot) {
      this.logger.log(`No snapshot found for stream ${streamId}, replaying from beginning`);
      return this.replayStream(streamId, handler, options);
    }

    this.logger.log(
      `Found snapshot for stream ${streamId} at version ${snapshot.streamVersion}, replaying from there`,
    );

    // Apply snapshot state first
    try {
      await handler.handle({
        eventType: 'Snapshot',
        eventId: crypto.randomUUID(),
        streamId,
        streamVersion: snapshot.streamVersion,
        timestamp: snapshot.createdAt,
        data: snapshot.state,
      });
    } catch (error) {
      this.logger.error(`Failed to apply snapshot: ${error.message}`);
      throw error;
    }

    // Replay events after snapshot
    return this.replayStream(streamId, handler, {
      ...options,
      fromVersion: snapshot.streamVersion + 1,
    });
  }

  async timeTravel(
    streamId: string,
    targetVersion: number,
    handler: EventHandler,
  ): Promise<any> {
    this.logger.log(`Time travel to version ${targetVersion} for stream ${streamId}`);

    const events = await this.eventStore.readStream(streamId, 1, targetVersion);

    let state: any = {};

    for (const event of events) {
      try {
        // Apply event to state
        state = this.applyEventToState(state, event);
      } catch (error) {
        this.logger.error(
          `Error applying event during time travel: ${error.message}`,
        );
        throw error;
      }
    }

    return state;
  }

  async getStreamStateAtVersion(
    streamId: string,
    targetVersion: number,
  ): Promise<any> {
    const events = await this.eventStore.readStream(streamId, 1, targetVersion);

    let state: any = {};

    for (const event of events) {
      state = this.applyEventToState(state, event);
    }

    return state;
  }

  private applyEventToState(state: any, event: DomainEvent): any {
    // This is a simplified state application
    // In a real implementation, you would have specific logic for each event type
    switch (event.eventType) {
      case 'PaymentCreated':
        state = { ...state, ...event.data };
        break;
      case 'PaymentConfirmed':
        state = { ...state, status: 'CONFIRMED', ...event.data };
        break;
      case 'PaymentSettled':
        state = { ...state, status: 'SETTLED', ...event.data };
        break;
      default:
        state = { ...state, ...event.data };
    }

    return state;
  }

  private sleep(ms: number): Promise<void> {
    return new Promise(resolve => setTimeout(resolve, ms));
  }

  async getReplayStatistics(streamId?: string): Promise<{
    totalEvents: number;
    eventTypes: Record<string, number>;
    dateRange: { earliest: Date; latest: Date } | null;
  }> {
    let events;

    if (streamId) {
      events = await this.eventStore.readStream(streamId);
    } else {
      events = await this.eventStore.readAllEvents();
    }

    const eventTypes: Record<string, number> = {};
    let earliest: Date | null = null;
    let latest: Date | null = null;

    for (const event of events) {
      eventTypes[event.eventType] = (eventTypes[event.eventType] || 0) + 1;

      if (!earliest || event.timestamp < earliest) {
        earliest = event.timestamp;
      }

      if (!latest || event.timestamp > latest) {
        latest = event.timestamp;
      }
    }

    return {
      totalEvents: events.length,
      eventTypes,
      dateRange: earliest && latest ? { earliest, latest } : null,
    };
  }
}
