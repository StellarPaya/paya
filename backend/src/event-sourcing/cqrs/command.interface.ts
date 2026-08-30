export interface Command {
  commandType: string;
  timestamp: Date;
  metadata?: Record<string, any>;
}

export interface CommandHandler<T extends Command> {
  handle(command: T): Promise<any>;
}

export interface CommandResult<T = any> {
  success: boolean;
  data?: T;
  error?: string;
  events?: any[];
}
