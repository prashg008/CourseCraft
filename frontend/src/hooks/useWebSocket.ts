import { useCallback, useEffect, useRef, useState } from 'react';
import { WS_BASE_URL as DEFAULT_WS_BASE_URL } from '@/services/api';

type WebSocketStatus = 'idle' | 'connecting' | 'open' | 'closed' | 'error';

type Sendable = string | Record<string, unknown>;

export interface UseWebSocketOptions<T> {
  courseId?: string;
  token?: string | null;
  enabled?: boolean;
  retryLimit?: number; // -1 means unlimited retries
  reconnectInterval?: number;
  maxReconnectInterval?: number;
  onMessage?: (data: T) => void;
  onOpen?: (event: Event) => void;
  onClose?: (event: CloseEvent) => void;
  onError?: (event: Event) => void;
}

export interface UseWebSocketResult<T> {
  latestMessage: T | null;
  status: WebSocketStatus;
  reconnecting: boolean;
  error: string | null;
  reconnectAttempts: number;
  sendMessage: (payload: Sendable) => boolean;
  disconnect: () => void;
}

const DEFAULT_RETRY_LIMIT = 5;
const DEFAULT_RECONNECT_INTERVAL = 2000; // ms
const DEFAULT_MAX_RECONNECT_INTERVAL = 15000; // ms

export function useWebSocket<T = Record<string, unknown>>({
  courseId,
  token,
  enabled = true,
  retryLimit = DEFAULT_RETRY_LIMIT,
  reconnectInterval = DEFAULT_RECONNECT_INTERVAL,
  maxReconnectInterval = DEFAULT_MAX_RECONNECT_INTERVAL,
  onMessage,
  onOpen,
  onClose,
  onError,
}: UseWebSocketOptions<T>): UseWebSocketResult<T> {
  const [latestMessage, setLatestMessage] = useState<T | null>(null);
  const [status, setStatus] = useState<WebSocketStatus>('idle');
  const [reconnecting, setReconnecting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [reconnectAttempts, setReconnectAttempts] = useState(0);

  const wsRef = useRef<WebSocket | null>(null);
  const reconnectTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const retryCountRef = useRef(0);
  const shouldReconnectRef = useRef(false);

  const messageHandlerRef = useRef(onMessage);
  const openHandlerRef = useRef(onOpen);
  const closeHandlerRef = useRef(onClose);
  const errorHandlerRef = useRef(onError);
  const enabledRef = useRef(enabled);

  useEffect(() => {
    messageHandlerRef.current = onMessage;
  }, [onMessage]);

  useEffect(() => {
    openHandlerRef.current = onOpen;
  }, [onOpen]);

  useEffect(() => {
    closeHandlerRef.current = onClose;
  }, [onClose]);

  useEffect(() => {
    errorHandlerRef.current = onError;
  }, [onError]);

  useEffect(() => {
    enabledRef.current = enabled;
  }, [enabled]);

  const clearReconnectTimeout = useCallback(() => {
    if (reconnectTimeoutRef.current) {
      clearTimeout(reconnectTimeoutRef.current);
      reconnectTimeoutRef.current = null;
    }
  }, []);

  const disconnect = useCallback(() => {
    shouldReconnectRef.current = false;
    clearReconnectTimeout();

    if (wsRef.current) {
      wsRef.current.close();
      wsRef.current = null;
    }

    setStatus('closed');
    setReconnecting(false);
  }, [clearReconnectTimeout]);

  const connectRef = useRef<() => void>(() => {});

  const scheduleReconnect = useCallback(() => {
    if (!enabledRef.current) {
      setReconnecting(false);
      return;
    }

    const unlimitedRetries = retryLimit < 0;
    if (!unlimitedRetries && retryCountRef.current >= retryLimit) {
      setReconnecting(false);
      return;
    }

    retryCountRef.current += 1;
    setReconnectAttempts(retryCountRef.current);
    setReconnecting(true);

    const delay = Math.min(
      reconnectInterval * Math.pow(2, retryCountRef.current - 1),
      maxReconnectInterval
    );

    reconnectTimeoutRef.current = setTimeout(() => {
      if (!enabledRef.current || !shouldReconnectRef.current) {
        setReconnecting(false);
        return;
      }
      setReconnecting(false);
      connectRef.current();
    }, delay);
  }, [maxReconnectInterval, reconnectInterval, retryLimit]);

  const connect = useCallback(() => {
    if (!courseId || !enabled) {
      return;
    }

    const envBase = import.meta.env.VITE_WS_BASE_URL as string | undefined;
    const resolvedBase = (envBase ?? DEFAULT_WS_BASE_URL)?.replace(/\/$/, '');

    if (!resolvedBase) {
      setStatus('error');
      setError('WebSocket base URL missing (set VITE_WS_BASE_URL).');
      return;
    }

    clearReconnectTimeout();

    const resolvedToken =
      token ?? (typeof window !== 'undefined' ? localStorage.getItem('authToken') : null);
    const query = resolvedToken ? `?token=${encodeURIComponent(resolvedToken)}` : '';
    const url = `${resolvedBase}/courses/${courseId}/generation/${query}`;

    shouldReconnectRef.current = true;
    retryCountRef.current = 0;
    setReconnectAttempts(0);
    setStatus('connecting');
    setError(null);
    setLatestMessage(null);

    try {
      const socket = new WebSocket(url);
      wsRef.current = socket;

      socket.onopen = event => {
        setStatus('open');
        setReconnecting(false);
        openHandlerRef.current?.(event);
      };

      socket.onmessage = event => {
        try {
          const envelope = JSON.parse(event.data) as { type: string; data: T };
          // Extract data from envelope if present, otherwise use the payload directly
          const payload = envelope.data !== undefined ? envelope.data : (envelope as unknown as T);
          setLatestMessage(payload);
          messageHandlerRef.current?.(payload);
        } catch (err) {
          console.error('Failed to parse WebSocket message', err);
        }
      };

      socket.onerror = event => {
        setStatus('error');
        setError('WebSocket connection error');
        errorHandlerRef.current?.(event);
      };

      socket.onclose = event => {
        closeHandlerRef.current?.(event);

        if (!shouldReconnectRef.current) {
          setStatus('closed');
          setReconnecting(false);
          return;
        }

        setStatus('closed');
        scheduleReconnect();
      };
    } catch (err) {
      console.error('WebSocket connection failed', err);
      setStatus('error');
      setError(err instanceof Error ? err.message : 'Failed to create WebSocket connection');
    }
  }, [clearReconnectTimeout, courseId, enabled, scheduleReconnect, token]);

  useEffect(() => {
    connectRef.current = connect;
  }, [connect]);

  useEffect(() => {
    if (!courseId || !enabled) {
      shouldReconnectRef.current = false;
      clearReconnectTimeout();
      if (wsRef.current) {
        wsRef.current.close();
        wsRef.current = null;
      }
      return;
    }

    const connectTimeout = setTimeout(() => {
      connect();
    }, 0);

    return () => {
      clearTimeout(connectTimeout);
      shouldReconnectRef.current = false;
      clearReconnectTimeout();
      if (wsRef.current) {
        wsRef.current.close();
        wsRef.current = null;
      }
    };
  }, [courseId, enabled, clearReconnectTimeout, connect]);

  const sendMessage = useCallback((payload: Sendable) => {
    if (!wsRef.current || wsRef.current.readyState !== WebSocket.OPEN) {
      return false;
    }

    const data = typeof payload === 'string' ? payload : JSON.stringify(payload);
    wsRef.current.send(data);
    return true;
  }, []);

  return {
    latestMessage,
    status,
    reconnecting,
    error,
    reconnectAttempts,
    sendMessage,
    disconnect,
  };
}
