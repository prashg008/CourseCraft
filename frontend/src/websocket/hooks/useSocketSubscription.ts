import { useEffect, useState, useCallback } from 'react';
import type { TypedSocket } from '../types/socket';
import { useSocket } from './useSocket';

export interface SubscriptionOptions {
  autoSubscribe?: boolean;
}

export interface SubscriptionState<T> {
  data: T | null;
  loading: boolean;
  error: Error | null;
}

/**
 * Generic hook for subscribing to Socket.IO events
 * @param event - The event name (e.g., 'course:generation')
 * @param identifier - Optional identifier used when subscribing/unsubscribing (e.g., courseId)
 * @param options - Subscription options
 */
export function useSocketSubscription<T = unknown>(
  event: string,
  identifier?: string,
  options: SubscriptionOptions = {}
) {
  const { autoSubscribe = true } = options;
  const { socket, state: socketState } = useSocket();

  const [state, setState] = useState<SubscriptionState<T>>({
    data: null,
    loading: false,
    error: null,
  });

  const [isSubscribed, setIsSubscribed] = useState(false);

  const subscribe = useCallback(() => {
    if (!socket || !socketState.connected) {
      setState(prev => ({
        ...prev,
        loading: false,
        error: new Error('Socket not connected'),
      }));
      return;
    }

    // Require an identifier (room id) to subscribe
    if (!identifier) {
      setState(prev => ({
        ...prev,
        loading: false,
        error: new Error('Identifier is required to subscribe'),
      }));
      return;
    }

    setState(prev => ({ ...prev, loading: true, error: null }));

    // Send subscribe message to server
    socket.emit('subscribe', { event, id: identifier }, response => {
      if (response.success) {
        setIsSubscribed(true);
        setState(prev => ({ ...prev, loading: false }));
      } else {
        setState(prev => ({
          ...prev,
          loading: false,
          error: new Error(response.message || 'Subscription failed'),
        }));
      }
    });
  }, [socket, socketState.connected, event, identifier]);

  const unsubscribe = useCallback(() => {
    if (!socket) return;

    socket.emit('unsubscribe', { event, id: identifier }, response => {
      if (response.success) {
        setIsSubscribed(false);
        setState({ data: null, loading: false, error: null });
      }
    });
  }, [socket, event, identifier]);

  // Listen for events
  useEffect(() => {
    if (!socket || !isSubscribed) return;

    type SocketEvent = Parameters<TypedSocket['on']>[0];
    type SocketHandler = Parameters<TypedSocket['on']>[1];
    const socketEvent = event as SocketEvent;

    const handleEvent = (data: T) => {
      setState(prev => ({
        ...prev,
        data,
        loading: false,
        error: null,
      }));
    };
    const socketHandler = handleEvent as SocketHandler;

    // Listen on the full event key
    socket.on(socketEvent, socketHandler);

    return () => {
      socket.off(socketEvent, socketHandler);
    };
  }, [socket, event, isSubscribed]);

  // Auto-subscribe if enabled
  useEffect(() => {
    if (!(autoSubscribe && socketState.connected && !isSubscribed && identifier)) {
      return;
    }

    const timer = setTimeout(() => {
      subscribe();
    }, 0);

    return () => {
      clearTimeout(timer);
    };
  }, [autoSubscribe, socketState.connected, isSubscribed, subscribe, identifier]);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      if (isSubscribed) {
        unsubscribe();
      }
    };
  }, [isSubscribed, unsubscribe]);

  return {
    ...state,
    subscribe,
    unsubscribe,
    isSubscribed,
  };
}
