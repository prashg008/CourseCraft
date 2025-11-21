import { useEffect, useState, useCallback } from 'react';
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
  const { socket, state: socketState, registerSubscription, unregisterSubscription } = useSocket();

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
      console.warn('[SocketSubscription] Socket not connected');
      return;
    }

    // Require an identifier (room id) to subscribe
    if (!identifier) {
      setState(prev => ({
        ...prev,
        loading: false,
        error: new Error('Identifier is required to subscribe'),
      }));
      console.warn('[SocketSubscription] Identifier is required to subscribe');
      return;
    }

    setState(prev => ({ ...prev, loading: true, error: null }));
    console.log('[SocketSubscription] Subscribing to event:', event, 'id:', identifier);

    // Send subscribe message to server
    socket.emit('subscribe', { event, id: identifier }, response => {
      console.log('[SocketSubscription] Subscribe response:', response);
      if (response.success) {
        setIsSubscribed(true);
        setState(prev => ({ ...prev, loading: false }));
        // Register successful subscription for auto-resubscribe
        if (registerSubscription) {
          try {
            registerSubscription(event, identifier as string);
          } catch (e) {
            console.warn('registerSubscription failed', e);
          }
        }
      } else {
        setState(prev => ({
          ...prev,
          loading: false,
          error: new Error(response.message || 'Subscription failed'),
        }));
      }
    });
  }, [socket, socketState.connected, event, identifier, registerSubscription]);

  const unsubscribe = useCallback(() => {
    if (!socket) return;

    socket.emit('unsubscribe', { event, id: identifier }, response => {
      if (response.success) {
        setIsSubscribed(false);
        setState({ data: null, loading: false, error: null });
        if (unregisterSubscription) {
          try {
            unregisterSubscription(event, identifier as string);
          } catch (e) {
            console.warn('unregisterSubscription failed', e);
          }
        }
      }
    });
  }, [socket, event, identifier, unregisterSubscription]);

  // Listen for events
  useEffect(() => {
    if (!socket || !isSubscribed) return;

    // Composite event name (e.g., 'course:generation:{id}')
    const compositeEvent = `${event}:${identifier}`;

    const handleEvent = (data: T) => {
      setState(prev => ({
        ...prev,
        data,
        loading: false,
        error: null,
      }));
    };

    // Use a typed emitter for dynamic event keys
    const s = socket as unknown as {
      on: (event: string, handler: (data: T) => void) => void;
      off: (event: string, handler: (data: T) => void) => void;
    } | null;

    if (!s) return () => {};

    s.on(compositeEvent, handleEvent);

    return () => {
      s.off(compositeEvent, handleEvent);
    };
  }, [socket, event, identifier, isSubscribed]);

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
