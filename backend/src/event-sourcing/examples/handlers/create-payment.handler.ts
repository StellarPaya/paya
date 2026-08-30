import { Injectable } from '@nestjs/common';
import { CommandHandler, CommandResult } from '../../cqrs/command.interface';
import { CreatePaymentCommand } from '../commands/create-payment.command';
import { EventStoreService } from '../../services/event-store.service';
import { PaymentCreatedEvent } from '../../events/payment.events';

@Injectable()
export class CreatePaymentHandler implements CommandHandler<CreatePaymentCommand> {
  constructor(private eventStore: EventStoreService) {}

  async handle(command: CreatePaymentCommand): Promise<CommandResult> {
    const paymentId = `PAY_${crypto.randomUUID()}`;

    // Create the payment event
    const event = new PaymentCreatedEvent(
      paymentId,
      command.merchantId,
      command.customerId,
      command.amount,
      command.currency,
      command.depositAddress,
      command.memo,
      command.expiresAt,
      command.metadata,
    );

    // Append to event store
    const eventRecord = await this.eventStore.appendEvent(
      event.streamId,
      event,
    );

    return {
      success: true,
      data: {
        paymentId,
        eventId: eventRecord.eventId,
        streamId: eventRecord.streamId,
        streamVersion: eventRecord.streamVersion,
      },
    };
  }
}
