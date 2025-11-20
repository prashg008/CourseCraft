// Event payload interfaces for Socket.IO events

export interface CourseGenerationPayload {
  courseId: string;
  status: 'pending' | 'generating' | 'completed' | 'failed';
  currentStage: 'creating' | 'reviewing' | 'refining' | 'completed';
  progress: number; // 0-100
  message?: string;
  errorMessage?: string;
  course?: any; // Full course data when completed
}

export interface ModuleGenerationPayload {
  courseId: string;
  moduleId: string;
  status: 'pending' | 'generating' | 'completed' | 'failed';
  currentStage: 'creating' | 'reviewing' | 'refining' | 'completed';
  progress: number;
  errorMessage?: string;
  module?: any;
}

export interface QuizGenerationPayload {
  courseId: string;
  quizId: string;
  status: 'pending' | 'generating' | 'completed' | 'failed';
  currentStage: 'creating' | 'reviewing' | 'refining' | 'completed';
  progress: number;
  errorMessage?: string;
  quiz?: any;
}

export interface CourseUpdatePayload {
  courseId: string;
  action: 'update' | 'delete' | 'publish' | 'unpublish';
  data?: any;
}

export interface SubscriptionData {
  event: string;
  id?: string;
}

export interface SubscriptionResponse {
  success: boolean;
  message?: string;
}
