export type EventVersion = 'v1';

export interface EventEnvelope<TPayload = unknown> {
  version: EventVersion;
  event: string;
  timestamp: string; // ISO
  correlationId?: string;
  payload: TPayload;
}

export interface BaseGenerationPayload {
  courseId: string;
  status: 'pending' | 'generating' | 'completed' | 'failed';
  currentStage: 'creating' | 'reviewing' | 'refining' | 'completed';
  progress: number; // 0-100
  message?: string;
  errorMessage?: string;
}

export interface CourseGenerationPayload extends BaseGenerationPayload {
  course?: unknown;
}

export interface ModuleGenerationPayload extends BaseGenerationPayload {
  moduleId: string;
  module?: unknown;
}

export interface QuizGenerationPayload extends BaseGenerationPayload {
  quizId?: string;
  quiz?: unknown;
}

export interface ErrorPayload {
  courseId?: string;
  moduleId?: string;
  quizId?: string;
  message: string;
  code?: string;
  retryable?: boolean;
}
