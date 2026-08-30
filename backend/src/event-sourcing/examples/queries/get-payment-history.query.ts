import { Query } from '../../cqrs/query.interface';

export class GetPaymentHistoryQuery implements Query {
  queryType = 'GetPaymentHistory';
  timestamp: Date;
  metadata?: Record<string, any>;

  constructor(
    public paymentId: string,
    public fromDate?: Date,
    public toDate?: Date,
    metadata?: Record<string, any>,
  ) {
    this.timestamp = new Date();
    this.metadata = metadata;
  }
}
