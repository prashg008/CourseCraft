import { Module } from '@nestjs/common';
import { DomainEventBus } from './domain-event-bus';

@Module({
  providers: [DomainEventBus],
  exports: [DomainEventBus],
})
export class EventsModule {}
