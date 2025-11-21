import { createContext } from 'react';
import type { TypedSocket, SocketState } from '../types/socket';

export interface SocketContextValue {
  socket: TypedSocket | null;
  state: SocketState;
  // Subscription registry control (used by hooks to register active subscriptions)
  registerSubscription: (event: string, id: string) => Promise<void> | void;
  unregisterSubscription: (event: string, id: string) => Promise<void> | void;
}

export const SocketContext = createContext<SocketContextValue | null>(null);
