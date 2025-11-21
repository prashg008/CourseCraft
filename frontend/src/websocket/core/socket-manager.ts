import { io } from 'socket.io-client';
import type { TypedSocket } from '../types/socket';

export interface SocketOptions {
  url: string;
  namespace?: string;
  autoConnect?: boolean;
  reconnectionAttempts?: number;
  reconnectionDelay?: number;
}

/**
 * Creates a Socket.IO client instance with JWT authentication
 */
export function createSocket(options: SocketOptions): TypedSocket {
  const {
    url,
    namespace = '/',
    autoConnect = true,
    reconnectionAttempts = 5,
    reconnectionDelay = 1000,
  } = options;

  // Get JWT token from localStorage
  const getToken = (): string | null => {
    return localStorage.getItem('authToken');
  };

  // Construct full URL with namespace
  const fullUrl = namespace === '/' ? url : `${url}${namespace}`;

  const socket: TypedSocket = io(fullUrl, {
    autoConnect,
    reconnectionAttempts,
    reconnectionDelay,
    reconnectionDelayMax: 5000,
    auth: (cb) => {
      const token = getToken();
      cb({
        token: token || '',
      });
    },
  });

  // Re-authenticate on reconnection
  socket.on('connect', () => {
    const token = getToken();
    if (token && socket.auth) {
      socket.auth = { token };
    }
  });

  return socket;
}
