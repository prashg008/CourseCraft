import type { Socket } from 'socket.io-client';
import type {
  CourseGenerationPayload,
  ModuleGenerationPayload,
  QuizGenerationPayload,
  CourseUpdatePayload,
  SubscriptionData,
  SubscriptionResponse,
} from './events';

// Define the event map for type safety
export interface ServerToClientEvents {
  'course:generation': (data: CourseGenerationPayload) => void;
  'module:generation': (data: ModuleGenerationPayload) => void;
  'quiz:generation': (data: QuizGenerationPayload) => void;
  'course:update': (data: CourseUpdatePayload) => void;
}

export interface ClientToServerEvents {
  subscribe: (data: SubscriptionData, callback: (response: SubscriptionResponse) => void) => void;
  unsubscribe: (data: SubscriptionData, callback: (response: SubscriptionResponse) => void) => void;
}

// Typed Socket.IO client
export type TypedSocket = Socket<ServerToClientEvents, ClientToServerEvents>;

// Socket connection state
export interface SocketState {
  connected: boolean;
  error: Error | null;
}
