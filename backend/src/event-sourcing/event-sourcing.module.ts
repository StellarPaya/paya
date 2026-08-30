import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { EventStoreService } from './services/event-store.service';
import { EventStore } from './entities/event-store.entity';
import { Snapshot as SnapshotEntity } from './entities/snapshot.entity';
import { CqrsModule } from './cqrs/cqrs.module';

@Module({
  imports: [
    TypeOrmModule.forFeature([EventStore, SnapshotEntity]),
    CqrsModule,
  ],
  providers: [
    EventStoreService,
  ],
  exports: [
    EventStoreService,
  ],
})
export class EventSourcingModule {}
