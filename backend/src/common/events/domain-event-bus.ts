import { Injectable } from '@nestjs/common';
import { EventEmitter } from 'events';

/**
 * Lightweight in-memory Domain Event Bus.
 * This is intentionally minimal — swap out with Redis/NATS adapter later.
 */
@Injectable()
export class DomainEventBus {
  private emitter = new EventEmitter();

  publish(event: string, payload: unknown) {
    // emit asynchronously
    setImmediate(() => this.emitter.emit(event, payload));
  }

  subscribe(event: string, handler: (payload: unknown) => void) {
    this.emitter.on(event, handler as (...args: unknown[]) => void);
    return () => this.emitter.off(event, handler as (...args: unknown[]) => void);
  }

  // For diagnostic / testing
  listenerCount(event: string) {
    return this.emitter.listenerCount(event);
  }
}
