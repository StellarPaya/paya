import { Module, Global } from '@nestjs/common';
import { CommandBus } from './command-bus.service';
import { QueryBus } from './query-bus.service';

@Global()
@Module({
  providers: [
    CommandBus,
    QueryBus,
  ],
  exports: [
    CommandBus,
    QueryBus,
  ],
})
export class CqrsModule {}
