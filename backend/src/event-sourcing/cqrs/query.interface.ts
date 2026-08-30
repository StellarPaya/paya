export interface Query {
  queryType: string;
  timestamp: Date;
  metadata?: Record<string, any>;
}

export interface QueryHandler<T extends Query, R = any> {
  handle(query: T): Promise<R>;
}

export interface QueryResult<T = any> {
  success: boolean;
  data?: T;
  error?: string;
}
