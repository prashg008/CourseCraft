// Core exports
export { SocketProvider } from './core/SocketProvider';
export { SocketContext } from './core/SocketContext';
export type { SocketContextValue } from './core/SocketContext';
export { createSocket } from './core/socket-manager';
export type { SocketOptions } from './core/socket-manager';

// Hook exports
export { useSocket } from './hooks/useSocket';
export { useSocketSubscription } from './hooks/useSocketSubscription';
export type { SubscriptionOptions, SubscriptionState } from './hooks/useSocketSubscription';
export { useCourseGeneration } from './hooks/useCourseGeneration';
export { useModuleGeneration } from './hooks/useModuleGeneration';
export { useQuizGeneration } from './hooks/useQuizGeneration';

// Type exports
export type {
  CourseGenerationPayload,
  ModuleGenerationPayload,
  QuizGenerationPayload,
  CourseUpdatePayload,
  SubscriptionData,
  SubscriptionResponse,
} from './types/events';
export type {
  TypedSocket,
  SocketState,
  ServerToClientEvents,
  ClientToServerEvents,
} from './types/socket';
