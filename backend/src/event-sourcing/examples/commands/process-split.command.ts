import { Command } from '../../cqrs/command.interface';

export class ProcessSplitCommand implements Command {
  commandType = 'ProcessSplit';
  timestamp: Date;
  metadata?: Record<string, any>;

  constructor(
    public paymentId: string,
    public splitConfig: {
      splitType: 'PERCENTAGE' | 'FIXED_AMOUNT' | 'MILESTONE';
      recipients: Array<{
        address: string;
        percentage?: number;
        fixedAmount?: bigint;
      }>;
    },
    metadata?: Record<string, any>,
  ) {
    this.timestamp = new Date();
    this.metadata = metadata;
  }
}
