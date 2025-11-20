import React, { useEffect, useState, useRef } from 'react';
import type { ReactNode } from 'react';
import { SocketContext } from './SocketContext';
import { createSocket } from './socket-manager';
import type { SocketOptions } from './socket-manager';
import type { TypedSocket, SocketState } from '../types/socket';

interface SocketProviderProps {
  children: ReactNode;
  url: string;
  namespace?: string;
  autoConnect?: boolean;
}

export const SocketProvider: React.FC<SocketProviderProps> = ({
  children,
  url,
  namespace = '/',
  autoConnect = true,
}) => {
  const [state, setState] = useState<SocketState>({
    connected: false,
    error: null,
  });

  const socketRef = useRef<TypedSocket | null>(null);

  useEffect(() => {
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
    });

    socket.on('disconnect', reason => {
      console.log('Socket disconnected:', reason);
      setState({
        connected: false,
        error: null,
      });
    });

    socket.on('connect_error', error => {
      console.error('Socket connection error:', error);
      setState({
        connected: false,
        error,
      });
    });

    // Cleanup on unmount
    return () => {
      if (socketRef.current) {
        socketRef.current.disconnect();
        socketRef.current = null;
      }
    };
  }, [url, namespace, autoConnect]);

  return (
    <SocketContext.Provider value={{ socket: socketRef.current, state }}>
      {children}
    </SocketContext.Provider>
  );
};
