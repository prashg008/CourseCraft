import React, { useEffect, useState, useRef } from 'react';
import type { ReactNode } from 'react';
import { SocketContext } from './SocketContext';
import { createSocket } from './socket-manager';
import type { SocketOptions } from './socket-manager';
import type { TypedSocket, SocketState } from '../types/socket';
import useGenerationStore from '../store/generationStore';

interface SocketProviderProps {
  children: ReactNode;
  url: string;
  namespace?: string;
  autoConnect?: boolean;
  autoRedirectOnUnauthorized?: boolean;
  isAuthenticated: boolean;
  isLoading: boolean;
}

export const SocketProvider: React.FC<SocketProviderProps> = ({
  children,
  url,
  namespace = '/',
  autoConnect = true,
  autoRedirectOnUnauthorized = true,
  isAuthenticated,
  isLoading,
}) => {
  const [state, setState] = useState<SocketState>({
    connected: false,
    error: null,
  });

  const socketRef = useRef<TypedSocket | null>(null);
  const [socketInstance, setSocketInstance] = useState<TypedSocket | null>(null);
  // Active subscriptions registry: key => { event, id }
  const subscriptionsRef = useRef<Map<string, { event: string; id: string }>>(new Map());

  useEffect(() => {
    // Only connect socket if authenticated and not loading
    if (isLoading || !isAuthenticated) {
      return;
    }
    // Create socket instance
    const options: SocketOptions = {
      url,
      namespace,
      autoConnect,
    };

    const socket = createSocket(options);
    socketRef.current = socket;

    // Connection event handlers
    socket.on('connect', () => {
      console.log('Socket connected:', socket.id);
      setState({
        connected: true,
        error: null,
      });
      setSocketInstance(socket);

      // Replay active subscriptions after reconnect
      try {
        subscriptionsRef.current.forEach(({ event, id }) => {
          socket.emit('subscribe', { event, id }, (response: unknown) => {
            const maybeRes = response as Record<string, unknown> | null;
            const ok = !!(maybeRes && maybeRes['success'] === true);
            if (!ok) {
              console.warn('Auto-resubscribe failed for', event, id, response);
            }
          });
        });
      } catch (err) {
        console.warn('Error replaying subscriptions on connect', err);
      }

      // Ensure socket updates write to the Zustand store
      try {
        const setChannel = useGenerationStore.getState().setChannel;
        // Attach a generic handler for any composite event (e.g. 'module:generation:123')
        // Attach a generic handler for any composite event (e.g. 'module:generation:123')
        const anyEmitter = socket as unknown as {
          onAny: (fn: (eventName: string, ...args: unknown[]) => void) => void;
        };
        anyEmitter.onAny((eventName: string, envelope: unknown) => {
          if (typeof eventName !== 'string') return;
          // store the payload under the composite event key
          const channelKey = eventName;
          let payload: unknown = envelope;
          if (envelope && typeof envelope === 'object') {
            const envObj = envelope as Record<string, unknown>;
            if ('payload' in envObj) {
              payload = envObj['payload'];
            }
          }
          try {
            setChannel(channelKey, payload);
          } catch (e) {
            // non-fatal: log and continue
            console.warn('Failed to write socket event to store', channelKey, e);
          }
        });
      } catch (e) {
        console.warn('Failed to attach onAny handler', e);
      }
    });

    socket.on('disconnect', reason => {
      console.log('Socket disconnected:', reason);
      setState({
        connected: false,
        error: null,
      });
      setSocketInstance(null);
    });

    socket.on('connect_error', error => {
      console.error('Socket connection error:', error);
      setState({
        connected: false,
        error,
      });
      console.log('Socket instance set to null due to connection error');
      console.log(error);
    });

    // Cleanup on unmount
    return () => {
      if (socketRef.current) {
        socketRef.current.disconnect();
        socketRef.current = null;
        setSocketInstance(null);
      }
    };
  }, [url, namespace, autoConnect, autoRedirectOnUnauthorized, isAuthenticated, isLoading]);

  // Subscription control methods exposed to hooks (async to allow snapshot hydration)

  // Enhanced registration: when a subscription is registered, attempt to hydrate
  // the store from the server snapshot endpoint if the channel is not present.
  const registerSubscriptionAsync = async (event: string, id: string) => {
    const key = `${event}:${id}`;
    subscriptionsRef.current.set(key, { event, id });

    try {
      const store = useGenerationStore.getState();
      if (!store.channels[key]) {
        const url = `/ws/snapshot?event=${encodeURIComponent(event)}&id=${encodeURIComponent(id)}`;
        const res = await fetch(url, { credentials: 'include' });
        if (res.ok) {
          const json = await res.json();
          if (json?.success && json.snapshot) {
            store.setChannel(key, json.snapshot);
          }
        }
      }
    } catch (e) {
      // non-fatal
      console.warn('Failed to fetch snapshot for', key, e);
    }
  };

  const unregisterSubscriptionAsync = async (event: string, id: string) => {
    const key = `${event}:${id}`;
    subscriptionsRef.current.delete(key);
    // no-op for now; could call server to clear ephemeral resources
  };

  return (
    <SocketContext.Provider
      value={{
        socket: socketInstance,
        state,
        registerSubscription: registerSubscriptionAsync,
        unregisterSubscription: unregisterSubscriptionAsync,
      }}
    >
      {children}
    </SocketContext.Provider>
  );
};
