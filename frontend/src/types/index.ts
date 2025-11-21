// Minimal interfaces for API response shapes
export interface MessageResponse {
  message?: string;
}

export interface SuccessDataResponse<T> {
  success: boolean;
  data: T;
  message?: string;
}

export interface CountResultsResponse<T> {
  count: number;
  results: T[];
}
// User types
export interface User {
  id: string;
  username: string;
  email: string;
  createdAt: string;
}

// Course status
export type CourseStatus = 'draft' | 'published' | 'generating' | 'archived';

// Question types
export type QuestionType = 'mcq' | 'single_choice' | 'boolean';

// Generation status
export type GenerationStage = 'creating' | 'reviewing' | 'refining' | 'completed';
export type GenerationStatus = 'pending' | 'running' | 'completed' | 'failed' | 'generating';

// Answer interface
export interface Answer {
  id: string;
  questionId: string;
  text: string;
  isCorrect: boolean;
  order: number;
}

// Question interface
export interface Question {
  id: string;
  quizId: string;
  text: string;
  type: QuestionType;
  order: number;
  answers: Answer[];
}

// Quiz interface
export interface Quiz {
  id: string;
  courseId: string;
  generationStatus?: GenerationStatus;
  questions: Question[];
}

// Lesson interface
export interface Lesson {
  id: string;
  moduleId: string;
  title: string;
  content: string;
  order: number;
  createdAt: string;
}

// Module interface
export interface Module {
  id: string;
  courseId: string;
  title: string;
  description: string;
  order: number;
  generationStatus?: GenerationStatus;
  lessons: Lesson[];
  createdAt: string;
}

// Course interface
export interface Course {
  id: string;
  title: string;
  description: string;
  status: CourseStatus;
  owner?: User;
  ownerId?: string;
  moduleCount?: number;
  quizQuestionCount?: number;
  modules: Module[];
  quiz: Quiz;
  createdAt: string;
  updatedAt: string;
}

// Generation Task interface
export interface GenerationTask {
  id: string;
  courseId?: string;
  moduleId?: string;
  quizId?: string;
  entityType: 'course' | 'module' | 'quiz';
  status: GenerationStatus;
  currentStage: GenerationStage;
  progress: number; // 0-100
  message: string;
  errorMessage?: string;
  taskId?: string;
  createdAt: string;
  updatedAt: string;
}

// API Response types
export interface ApiResponse<T> {
  data: T;
  message?: string;
  success: boolean;
}

export interface PaginatedResponse<T> {
  data: T[];
  total: number;
  page: number;
  pageSize: number;
  totalPages: number;
}

// Form data types
export interface CourseFormData {
  title: string;
  description: string;
}

export interface CourseUpdatePayload {
  title?: string;
  description?: string;
}

export interface QuestionFormData {
  text: string;
  type: QuestionType;
  answers: {
    text: string;
    isCorrect: boolean;
  }[];
}

export interface RegenerationRequest {
  feedback?: string;
}

// Filter and search types
export interface CourseFilters {
  status?: CourseStatus | 'all';
  search?: string;
  sortBy?: 'date' | 'title';
  sortOrder?: 'asc' | 'desc';
  page?: number;
  pageSize?: number;
}
