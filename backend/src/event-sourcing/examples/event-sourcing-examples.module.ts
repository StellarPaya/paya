import { Module } from '@nestjs/common';
import { CqrsModule } from '../../cqrs/cqrs.module';
import { EventSourcingModule } from '../event-sourcing.module';
import { CreatePaymentHandler } from './handlers/create-payment.handler';
import { GetPaymentHistoryHandler } from './handlers/get-payment-history.handler';
import { ProcessSplitHandler } from './handlers/process-split.handler';

@Module({
  imports: [
    CqrsModule,
    EventSourcingModule,
  ],
  providers: [
    CreatePaymentHandler,
    GetPaymentHistoryHandler,
    ProcessSplitHandler,
  ],
  exports: [
    CreatePaymentHandler,
    GetPaymentHistoryHandler,
    ProcessSplitHandler,
  ],
})
export class EventSourcingExamplesModule {}
