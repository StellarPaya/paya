export interface DomainEvent {
  eventId: string;
  eventType: string;
  streamId: string;
  streamVersion: number;
  timestamp: Date;
  data: any;
  metadata?: Record<string, any>;
}

export interface EventRecord extends DomainEvent {
  id: string;
  position: number;
}

export interface Snapshot {
  streamId: string;
  streamVersion: number;
  state: any;
  createdAt: Date;
}

export interface EventHandler {
  handle(event: DomainEvent): Promise<void> | void;
}

export interface Subscription {
  streamId: string;
  handler: EventHandler;
  fromPosition?: number;
  unsubscribe: () => void;
}
