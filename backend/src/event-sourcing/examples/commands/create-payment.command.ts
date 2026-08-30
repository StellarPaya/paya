import { Command } from '../../cqrs/command.interface';

export class CreatePaymentCommand implements Command {
  commandType = 'CreatePayment';
  timestamp: Date;
  metadata?: Record<string, any>;

  constructor(
    public merchantId: string,
    public customerId: string,
    public amount: bigint,
    public currency: string,
    public depositAddress: string,
    public memo: string,
    public expiresAt: Date,
    metadata?: Record<string, any>,
  ) {
    this.timestamp = new Date();
    this.metadata = metadata;
  }
}
