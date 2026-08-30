import { Injectable } from '@nestjs/common';
import { CommandHandler, CommandResult } from '../../cqrs/command.interface';
import { ProcessSplitCommand } from '../commands/process-split.command';
import { EventStoreService } from '../../services/event-store.service';
import { SplitCreatedEvent, SplitExecutedEvent } from '../../events/split.events';

@Injectable()
export class ProcessSplitHandler implements CommandHandler<ProcessSplitCommand> {
  constructor(private eventStore: EventStoreService) {}

  async handle(command: ProcessSplitCommand): Promise<CommandResult> {
    const splitId = `SPLIT_${crypto.randomUUID()}`;

    // Create the split created event
    const splitCreatedEvent = new SplitCreatedEvent(
      splitId,
      command.paymentId,
      'merchant_address_placeholder', // Would be fetched from payment
      BigInt(0), // Would be fetched from payment
      'USDC',
      command.splitConfig.splitType,
      command.splitConfig.recipients.map(r => ({
        address: r.address,
        percentage: r.percentage,
        fixedAmount: r.fixedAmount,
        splitType: command.splitConfig.splitType,
      })),
      command.metadata,
    );

    // Append split created event
    await this.eventStore.appendEvent(
      splitCreatedEvent.streamId,
      splitCreatedEvent,
    );

    // Execute the split
    const splitExecutedEvent = new SplitExecutedEvent(
      splitId,
      'merchant_address_placeholder',
    );

    const executedRecord = await this.eventStore.appendEvent(
      splitExecutedEvent.streamId,
      splitExecutedEvent,
    );

    return {
      success: true,
      data: {
        splitId,
        eventId: executedRecord.eventId,
        streamId: executedRecord.streamId,
        streamVersion: executedRecord.streamVersion,
      },
    };
  }
}
