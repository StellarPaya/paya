import { Injectable } from '@nestjs/common';
import { QueryHandler, QueryResult } from '../../cqrs/query.interface';
import { GetPaymentHistoryQuery } from '../queries/get-payment-history.query';
import { EventStoreService } from '../../services/event-store.service';

@Injectable()
export class GetPaymentHistoryHandler implements QueryHandler<GetPaymentHistoryQuery> {
  constructor(private eventStore: EventStoreService) {}

  async handle(query: GetPaymentHistoryQuery): Promise<QueryResult> {
    const streamId = `payment-${query.paymentId}`;
    
    // Read all events for the payment stream
    const events = await this.eventStore.readStream(streamId);

    // Filter by date range if provided
    let filteredEvents = events;
    if (query.fromDate || query.toDate) {
      filteredEvents = events.filter(event => {
        if (query.fromDate && event.timestamp < query.fromDate) {
          return false;
        }
        if (query.toDate && event.timestamp > query.toDate) {
          return false;
        }
        return true;
      });
    }

    return {
      success: true,
      data: {
        paymentId: query.paymentId,
        events: filteredEvents.map(event => ({
          eventId: event.eventId,
          eventType: event.eventType,
          streamVersion: event.streamVersion,
          timestamp: event.timestamp,
          data: event.data,
          metadata: event.metadata,
        })),
        totalEvents: filteredEvents.length,
      },
    };
  }
}
