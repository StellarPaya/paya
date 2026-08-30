import { Injectable, Logger } from '@nestjs/common';
import { DomainEvent } from '../interfaces/domain-event.interface';
import { ConfigService } from '@nestjs/config';

@Injectable()
export class EventPublisherService {
  private readonly logger = new Logger(EventPublisherService.name);
  private isConnected: boolean = false;

  constructor(private configService: ConfigService) {
    this.initializeConnection();
  }

  private async initializeConnection(): Promise<void> {
    // Initialize RabbitMQ/Kafka connection
    // This is a placeholder implementation
    // In production, you would use amqplib for RabbitMQ or kafkajs for Kafka
    this.isConnected = true;
    this.logger.log('Event publisher initialized');
  }

  async publish(event: DomainEvent, topic: string): Promise<void> {
    if (!this.isConnected) {
      this.logger.warn('Event publisher not connected, skipping publish');
      return;
    }

    try {
      const message = JSON.stringify({
        eventId: event.eventId,
        eventType: event.eventType,
        streamId: event.streamId,
        streamVersion: event.streamVersion,
        timestamp: event.timestamp,
        data: event.data,
        metadata: event.metadata,
      });

      // In production, publish to RabbitMQ/Kafka
      // await this.channel.publish(topic, '', Buffer.from(message));
      
      this.logger.log(`Published event ${event.eventType} to topic ${topic}`);
    } catch (error) {
      this.logger.error(`Failed to publish event ${event.eventType}: ${error.message}`, error.stack);
      throw error;
    }
  }

  async publishBatch(events: DomainEvent[], topic: string): Promise<void> {
    if (!this.isConnected) {
      this.logger.warn('Event publisher not connected, skipping batch publish');
      return;
    }

    try {
      for (const event of events) {
        await this.publish(event, topic);
      }
      this.logger.log(`Published ${events.length} events to topic ${topic}`);
    } catch (error) {
      this.logger.error(`Failed to publish batch events: ${error.message}`, error.stack);
      throw error;
    }
  }

  isConnectedToQueue(): boolean {
    return this.isConnected;
  }

  async disconnect(): Promise<void> {
    this.isConnected = false;
    this.logger.log('Event publisher disconnected');
  }
}
