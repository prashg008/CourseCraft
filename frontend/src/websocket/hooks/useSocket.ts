import { useContext } from 'react';
import { SocketContext } from '../core/SocketContext';

/**
 * Hook to access the Socket.IO instance and connection state
 */
export function useSocket() {
  const context = useContext(SocketContext);

  if (!context) {
    throw new Error('useSocket must be used within a SocketProvider');
  }

  return context;
}
