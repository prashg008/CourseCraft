// Event payload interfaces for Socket.IO events

export interface CourseGenerationPayload {
  courseId: string;
  status: 'pending' | 'generating' | 'completed' | 'failed';
  currentStage: 'creating' | 'reviewing' | 'refining' | 'completed';
  progress: number; // 0-100
  message?: string;
  errorMessage?: string;
  course?: unknown; // Full course data when completed
}

export interface ModuleGenerationPayload {
  courseId: string;
  moduleId: string;
  status: 'pending' | 'generating' | 'completed' | 'failed';
  currentStage: 'creating' | 'reviewing' | 'refining' | 'completed';
  progress: number;
  errorMessage?: string;
  module?: unknown;
}

export interface QuizGenerationPayload {
  courseId: string;
  quizId: string;
  status: 'pending' | 'generating' | 'completed' | 'failed';
  currentStage: 'creating' | 'reviewing' | 'refining' | 'completed';
  progress: number;
  errorMessage?: string;
  quiz?: unknown;
}

export interface CourseUpdatePayload {
  courseId: string;
  action: 'update' | 'delete' | 'publish' | 'unpublish';
  data?: unknown;
}

export interface SubscriptionData {
  event: string;
  id?: string;
}

export interface SubscriptionResponse {
  success: boolean;
  message?: string;
}
