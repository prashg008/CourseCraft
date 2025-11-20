import { createContext } from 'react';
import type { TypedSocket, SocketState } from '../types/socket';

export interface SocketContextValue {
  socket: TypedSocket | null;
  state: SocketState;
}

export const SocketContext = createContext<SocketContextValue | null>(null);
