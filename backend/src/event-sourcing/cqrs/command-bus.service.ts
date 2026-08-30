import { Injectable, Logger, NotFoundException } from '@nestjs/common';
import { Command, CommandHandler, CommandResult } from './command.interface';

@Injectable()
export class CommandBus {
  private readonly logger = new Logger(CommandBus.name);
  private handlers: Map<string, CommandHandler<any>> = new Map();

  registerHandler<T extends Command>(
    commandType: string,
    handler: CommandHandler<T>,
  ): void {
    if (this.handlers.has(commandType)) {
      this.logger.warn(`Handler for command type ${commandType} already registered. Overwriting.`);
    }
    this.handlers.set(commandType, handler);
    this.logger.log(`Registered handler for command type: ${commandType}`);
  }

  async execute<T = any>(command: Command): Promise<CommandResult<T>> {
    const handler = this.handlers.get(command.commandType);

    if (!handler) {
      this.logger.error(`No handler registered for command type: ${command.commandType}`);
      return {
        success: false,
        error: `No handler registered for command type: ${command.commandType}`,
      };
    }

    try {
      this.logger.log(`Executing command: ${command.commandType}`);
      const result = await handler.handle(command);
      
      return {
        success: true,
        data: result,
      };
    } catch (error) {
      this.logger.error(`Error executing command ${command.commandType}: ${error.message}`, error.stack);
      
      return {
        success: false,
        error: error.message,
      };
    }
  }

  hasHandler(commandType: string): boolean {
    return this.handlers.has(commandType);
  }

  getRegisteredCommands(): string[] {
    return Array.from(this.handlers.keys());
  }
}
