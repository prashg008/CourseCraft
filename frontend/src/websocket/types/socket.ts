import type { Socket } from 'socket.io-client';
import type { SubscriptionData, SubscriptionResponse } from './events';
import type { EventEnvelope } from '../contracts/events';

// Define the event map for type safety
export interface ServerToClientEvents {
  // Dynamic composite event keys like 'course:generation:{id}', 'module:generation:{id}', etc.
  [event: string]: (data: EventEnvelope<unknown>) => void;
}

export interface ClientToServerEvents {
  subscribe: (data: SubscriptionData, callback: (response: SubscriptionResponse) => void) => void;
  unsubscribe: (data: SubscriptionData, callback: (response: SubscriptionResponse) => void) => void;
}

// Typed Socket.IO client
export type TypedSocket = Socket<ServerToClientEvents, ClientToServerEvents>;

// Socket connection state
export interface SocketState {
  connected: boolean;
  error: Error | null;
}
