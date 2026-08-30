import { Injectable, Logger } from '@nestjs/common';
import { Query, QueryHandler, QueryResult } from './query.interface';

@Injectable()
export class QueryBus {
  private readonly logger = new Logger(QueryBus.name);
  private handlers: Map<string, QueryHandler<any, any>> = new Map();

  registerHandler<T extends Query, R = any>(
    queryType: string,
    handler: QueryHandler<T, R>,
  ): void {
    if (this.handlers.has(queryType)) {
      this.logger.warn(`Handler for query type ${queryType} already registered. Overwriting.`);
    }
    this.handlers.set(queryType, handler);
    this.logger.log(`Registered handler for query type: ${queryType}`);
  }

  async execute<T = any>(query: Query): Promise<QueryResult<T>> {
    const handler = this.handlers.get(query.queryType);

    if (!handler) {
      this.logger.error(`No handler registered for query type: ${query.queryType}`);
      return {
        success: false,
        error: `No handler registered for query type: ${query.queryType}`,
      };
    }

    try {
      this.logger.log(`Executing query: ${query.queryType}`);
      const result = await handler.handle(query);
      
      return {
        success: true,
        data: result,
      };
    } catch (error) {
      this.logger.error(`Error executing query ${query.queryType}: ${error.message}`, error.stack);
      
      return {
        success: false,
        error: error.message,
      };
    }
  }

  hasHandler(queryType: string): boolean {
    return this.handlers.has(queryType);
  }

  getRegisteredQueries(): string[] {
    return Array.from(this.handlers.keys());
  }
}
