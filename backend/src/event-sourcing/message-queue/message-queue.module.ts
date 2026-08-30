import { Module } from '@nestjs/common';
import { EventPublisherService } from './event-publisher.service';
import { EventSubscriberService } from './event-subscriber.service';

@Module({
  providers: [
    EventPublisherService,
    EventSubscriberService,
  ],
  exports: [
    EventPublisherService,
    EventSubscriberService,
  ],
})
export class MessageQueueModule {}
