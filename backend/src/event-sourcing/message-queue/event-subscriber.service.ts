import { Injectable, Logger, OnModuleInit, OnModuleDestroy } from '@nestjs/common';
import { DomainEvent, EventHandler } from '../interfaces/domain-event.interface';
import { ConfigService } from '@nestjs/config';

@Injectable()
export class EventSubscriberService implements OnModuleInit, OnModuleDestroy {
  private readonly logger = new Logger(EventSubscriberService.name);
  private isConnected: boolean = false;
  private handlers: Map<string, EventHandler[]> = new Map();

  constructor(private configService: ConfigService) {}

  async onModuleInit(): Promise<void> {
    await this.initializeConnection();
  }

  async onModuleDestroy(): Promise<void> {
    await this.disconnect();
  }

  private async initializeConnection(): Promise<void> {
    // Initialize RabbitMQ/Kafka connection
    // This is a placeholder implementation
    // In production, you would use amqplib for RabbitMQ or kafkajs for Kafka
    this.isConnected = true;
    this.logger.log('Event subscriber initialized');
  }

  subscribe(topic: string, handler: EventHandler): void {
    if (!this.handlers.has(topic)) {
      this.handlers.set(topic, []);
    }
    this.handlers.get(topic)!.push(handler);
    this.logger.log(`Subscribed handler to topic ${topic}`);
  }

  unsubscribe(topic: string, handler: EventHandler): void {
    const handlers = this.handlers.get(topic);
    if (handlers) {
      const index = handlers.indexOf(handler);
      if (index > -1) {
        handlers.splice(index, 1);
      }
    }
    this.logger.log(`Unsubscribed handler from topic ${topic}`);
  }

  async startConsuming(topics: string[]): Promise<void> {
    if (!this.isConnected) {
      this.logger.warn('Event subscriber not connected, cannot start consuming');
      return;
    }

    this.logger.log(`Starting to consume from topics: ${topics.join(', ')}`);

    // In production, start consuming from RabbitMQ/Kafka
    // This is a placeholder implementation
    for (const topic of topics) {
      this.simulateMessageConsumption(topic);
    }
  }

  async stopConsuming(): Promise<void> {
    this.logger.log('Stopping message consumption');
    // In production, stop consuming from RabbitMQ/Kafka
  }

  private async simulateMessageConsumption(topic: string): Promise<void> {
    // Placeholder for actual message consumption
    // In production, this would be called by the RabbitMQ/Kafka consumer callback
  }

  private async handleMessage(topic: string, message: any): Promise<void> {
    const handlers = this.handlers.get(topic);
    if (!handlers || handlers.length === 0) {
      this.logger.warn(`No handlers registered for topic ${topic}`);
      return;
    }

    try {
      const event: DomainEvent = JSON.parse(message);
      
      for (const handler of handlers) {
        try {
          await handler.handle(event);
        } catch (error) {
          this.logger.error(
            `Error in handler for topic ${topic}: ${error.message}`,
            error.stack,
          );
        }
      }
    } catch (error) {
      this.logger.error(`Failed to parse message from topic ${topic}: ${error.message}`, error.stack);
    }
  }

  isConnectedToQueue(): boolean {
    return this.isConnected;
  }

  private async disconnect(): Promise<void> {
    await this.stopConsuming();
    this.isConnected = false;
    this.logger.log('Event subscriber disconnected');
  }
}
