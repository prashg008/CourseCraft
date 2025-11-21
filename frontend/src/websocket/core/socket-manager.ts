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
    const token = localStorage.getItem('authToken');
    if (!token) {
      console.warn(
        '[Socket] No authToken found in localStorage when attempting to connect WebSocket.'
      );
    } else {
      // Debug: decode JWT and log payload
      try {
        const payload = JSON.parse(atob(token.split('.')[1]));
        console.log('[Socket] JWT payload:', payload);
      } catch (e) {
        console.warn('[Socket] Could not decode JWT:', e);
      }
    }
    return token;
  };

  // Construct full URL with namespace
  const fullUrl = namespace === '/' ? url : `${url}${namespace}`;

  const socket: TypedSocket = io(fullUrl, {
    autoConnect,
    reconnectionAttempts,
    reconnectionDelay,
    reconnectionDelayMax: 5000,
    auth: cb => {
      const token = getToken();
      console.log('[Socket] Authenticating with token:', token);
      cb({
        token: token || '',
      });
    },
  });

  // Debug connection events
  socket.on('connect', () => {
    const token = getToken();
    console.log('[Socket] Connected! Socket ID:', socket.id);
    if (token && socket.auth) {
      socket.auth = { token };
    }
  });
  socket.on('disconnect', reason => {
    console.warn('[Socket] Disconnected:', reason);
  });
  socket.on('connect_error', err => {
    console.error('[Socket] Connection error:', err);
  });

  return socket;
}
