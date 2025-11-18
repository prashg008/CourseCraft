import axios, { AxiosError } from 'axios';
import type { AxiosInstance, AxiosRequestHeaders } from 'axios';
import type {
  Course,
  Module,
  Lesson,
  Quiz,
  Question,
  ApiResponse,
  User,
  PaginatedResponse,
  CourseFilters,
  CourseFormData,
  CourseUpdatePayload,
  QuestionFormData,
  GenerationTask,
  RegenerationRequest,
} from '../types';
import { camelizeKeys } from '@/utils/casing';

export const API_BASE_URL = import.meta.env.VITE_API_BASE_URL ?? 'http://localhost:8000/api';
export const WS_BASE_URL = import.meta.env.VITE_WS_BASE_URL ?? 'ws://localhost:8000/ws';

// Create axios instance
const apiClient: AxiosInstance = axios.create({
  baseURL: API_BASE_URL,
  headers: {
    'Content-Type': 'application/json',
  },
});

// Request interceptor to add auth token
apiClient.interceptors.request.use(
  config => {
    const token = localStorage.getItem('authToken');
    const headers = (config.headers ?? {}) as AxiosRequestHeaders;
    if (token) {
      headers.Authorization = `Token ${token}`;
    }
    config.headers = headers;
    return config;
  },
  error => Promise.reject(error)
);

// Response interceptor for error handling
apiClient.interceptors.response.use(
  response => {
    response.data = camelizeKeys(response.data);
    return response;
  },
  (error: AxiosError) => {
    if (error.response?.status === 401) {
      localStorage.removeItem('authToken');
      localStorage.removeItem('user');
      window.location.href = '/login';
    }
    return Promise.reject(error);
  }
);

// Helper function to handle API errors
const handleApiError = (error: unknown): Error => {
  if (axios.isAxiosError(error)) {
    const message =
      error.response?.data?.error ||
      error.response?.data?.message ||
      error.message ||
      'An error occurred';
    return new Error(message);
  }

  if (error instanceof Error) {
    return error;
  }

  return new Error('An unexpected error occurred');
};

// Authentication API
export const authApi = {
  async register(
    username: string,
    email: string,
    password: string
  ): Promise<ApiResponse<{ token: string; user: User }>> {
    try {
      const response = await apiClient.post('/auth/register/', { username, email, password });
      return {
        success: response.data.success,
        data: response.data.data,
        message: response.data.message,
      };
    } catch (error) {
      throw handleApiError(error);
    }
  },

  async login(
    email: string,
    password: string
  ): Promise<ApiResponse<{ token: string; user: User }>> {
    try {
      const response = await apiClient.post('/auth/login/', { email, password });
      return {
        success: response.data.success,
        data: response.data.data,
        message: response.data.message,
      };
    } catch (error) {
      throw handleApiError(error);
    }
  },

  async logout(): Promise<ApiResponse<null>> {
    try {
      const response = await apiClient.post('/auth/logout/');
      return {
        success: response.data.success,
        data: null,
        message: response.data.message,
      };
    } catch (error) {
      throw handleApiError(error);
    }
  },

  async me(): Promise<ApiResponse<User>> {
    try {
      const response = await apiClient.get('/auth/me/');
      return {
        success: response.data.success,
        data: response.data.data,
      };
    } catch (error) {
      throw handleApiError(error);
    }
  },
};

// Courses API
export const coursesApi = {
  async getAll(filters?: CourseFilters): Promise<PaginatedResponse<Course>> {
    try {
      const page = filters?.page ?? 1;
      const pageSize = filters?.pageSize ?? 10;
      const sortOrder = filters?.sortOrder ?? 'desc';
      const sortBy = filters?.sortBy ?? 'date';

      const params: Record<string, unknown> = {
        page,
        page_size: pageSize,
      };

      if (filters?.search) {
        params.search = filters.search;
      }

      if (filters?.status && filters.status !== 'all') {
        params.status = filters.status;
      }

      if (sortBy === 'title') {
        params.ordering = sortOrder === 'asc' ? 'title' : '-title';
      } else {
        params.ordering = sortOrder === 'asc' ? 'created_at' : '-created_at';
      }

      const response = await apiClient.get('/courses/', { params });
      return {
        data: response.data.results || [],
        total: response.data.count || 0,
        page,
        pageSize,
        totalPages: Math.ceil((response.data.count || 0) / pageSize),
      };
    } catch (error) {
      throw handleApiError(error);
    }
  },

  async getById(id: string): Promise<ApiResponse<Course>> {
    try {
      const response = await apiClient.get(`/courses/${id}/`);
      return {
        success: true,
        data: response.data,
      };
    } catch (error) {
      throw handleApiError(error);
    }
  },

  async create(data: CourseFormData): Promise<ApiResponse<Course>> {
    try {
      const response = await apiClient.post('/courses/', data);
      return {
        success: true,
        data: response.data,
        message: 'Course created successfully',
      };
    } catch (error) {
      throw handleApiError(error);
    }
  },

  async update(id: string, data: Partial<Course>): Promise<ApiResponse<Course>> {
    try {
      const response = await apiClient.patch(`/courses/${id}/`, data);
      return {
        success: true,
        data: response.data,
        message: 'Course updated successfully',
      };
    } catch (error) {
      throw handleApiError(error);
    }
  },

  async updateDetails(id: string, data: CourseUpdatePayload): Promise<ApiResponse<Course>> {
    try {
      const response = await apiClient.patch(`/courses/${id}/details/`, data);
      return {
        success: true,
        data: response.data,
        message: 'Course details updated successfully',
      };
    } catch (error) {
      throw handleApiError(error);
    }
  },

  async delete(id: string): Promise<ApiResponse<null>> {
    try {
      await apiClient.delete(`/courses/${id}/`);
      return {
        success: true,
        data: null,
        message: 'Course deleted successfully',
      };
    } catch (error) {
      throw handleApiError(error);
    }
  },

  async publish(id: string): Promise<ApiResponse<Course>> {
    try {
      const response = await apiClient.post(`/courses/${id}/publish/`);
      return {
        success: true,
        data: response.data,
        message: 'Course published successfully',
      };
    } catch (error) {
      throw handleApiError(error);
    }
  },

  async unpublish(id: string): Promise<ApiResponse<Course>> {
    try {
      const response = await apiClient.post(`/courses/${id}/unpublish/`);
      return {
        success: true,
        data: response.data,
        message: 'Course moved to draft',
      };
    } catch (error) {
      throw handleApiError(error);
    }
  },

  async archive(id: string): Promise<ApiResponse<Course>> {
    try {
      const response = await apiClient.post(`/courses/${id}/archive/`);
      return {
        success: true,
        data: response.data,
        message: 'Course archived successfully',
      };
    } catch (error) {
      throw handleApiError(error);
    }
  },

  async unarchive(id: string): Promise<ApiResponse<Course>> {
    try {
      const response = await apiClient.post(`/courses/${id}/unarchive/`);
      return {
        success: true,
        data: response.data,
        message: 'Course unarchived successfully',
      };
    } catch (error) {
      throw handleApiError(error);
    }
  },

  async getArchivedCourses(): Promise<ApiResponse<Course[]>> {
    try {
      const response = await apiClient.get('/courses/archived/');
      return {
        success: true,
        data: response.data,
      };
    } catch (error) {
      throw handleApiError(error);
    }
  },

  async regenerateModule(
    courseId: string,
    moduleId: string,
    request?: RegenerationRequest
  ): Promise<ApiResponse<GenerationTask>> {
    try {
      const payload = request ? { feedback: request.feedback } : {};
      const response = await apiClient.post(
        `/courses/${courseId}/modules/${moduleId}/regenerate/`,
        payload
      );
      return {
        success: true,
        data: response.data,
        message: response.data.message || 'Module regeneration started',
      };
    } catch (error) {
      throw handleApiError(error);
    }
  },

  async regenerateQuiz(
    courseId: string,
    request?: RegenerationRequest
  ): Promise<ApiResponse<GenerationTask>> {
    try {
      const payload = request ? { feedback: request.feedback } : {};
      const response = await apiClient.post(`/courses/${courseId}/quiz/regenerate/`, payload);
      return {
        success: true,
        data: response.data,
        message: response.data.message || 'Quiz regeneration started',
      };
    } catch (error) {
      throw handleApiError(error);
    }
  },
};

// Modules API
export const modulesApi = {
  async create(data: {
    course: string;
    title: string;
    description: string;
    order: number;
  }): Promise<ApiResponse<Module>> {
    try {
      const response = await apiClient.post('/modules/', data);
      return {
        success: true,
        data: response.data,
        message: 'Module created successfully',
      };
    } catch (error) {
      throw handleApiError(error);
    }
  },

  async update(id: string, data: Partial<Module>): Promise<ApiResponse<Module>> {
    try {
      const response = await apiClient.patch(`/modules/${id}/`, data);
      return {
        success: true,
        data: response.data,
        message: 'Module updated successfully',
      };
    } catch (error) {
      throw handleApiError(error);
    }
  },

  async delete(id: string): Promise<ApiResponse<null>> {
    try {
      await apiClient.delete(`/modules/${id}/`);
      return {
        success: true,
        data: null,
        message: 'Module deleted successfully',
      };
    } catch (error) {
      throw handleApiError(error);
    }
  },
};

// Lessons API
export const lessonsApi = {
  async create(data: {
    module: string;
    title: string;
    content: string;
    order: number;
  }): Promise<ApiResponse<Lesson>> {
    try {
      const response = await apiClient.post('/lessons/', data);
      return {
        success: true,
        data: response.data,
        message: 'Lesson created successfully',
      };
    } catch (error) {
      throw handleApiError(error);
    }
  },

  async update(id: string, data: Partial<Lesson>): Promise<ApiResponse<Lesson>> {
    try {
      const response = await apiClient.patch(`/lessons/${id}/`, data);
      return {
        success: true,
        data: response.data,
        message: 'Lesson updated successfully',
      };
    } catch (error) {
      throw handleApiError(error);
    }
  },

  async delete(id: string): Promise<ApiResponse<null>> {
    try {
      await apiClient.delete(`/lessons/${id}/`);
      return {
        success: true,
        data: null,
        message: 'Lesson deleted successfully',
      };
    } catch (error) {
      throw handleApiError(error);
    }
  },
};

// Quiz API
export const quizApi = {
  async create(data: { course: string }): Promise<ApiResponse<Quiz>> {
    try {
      const response = await apiClient.post('/quizzes/', data);
      return {
        success: true,
        data: response.data,
        message: 'Quiz created successfully',
      };
    } catch (error) {
      throw handleApiError(error);
    }
  },

  async delete(id: string): Promise<ApiResponse<null>> {
    try {
      await apiClient.delete(`/quizzes/${id}/`);
      return {
        success: true,
        data: null,
        message: 'Quiz deleted successfully',
      };
    } catch (error) {
      throw handleApiError(error);
    }
  },
};

// Questions API
export const questionsApi = {
  async create(
    data: { quiz: string; order: number } & QuestionFormData
  ): Promise<ApiResponse<Question>> {
    try {
      const response = await apiClient.post('/questions/', {
        quiz: data.quiz,
        text: data.text,
        type: data.type,
        order: data.order,
        answers: data.answers.map((answer, index) => ({
          text: answer.text,
          is_correct: answer.isCorrect,
          order: index + 1,
        })),
      });
      return {
        success: true,
        data: response.data,
        message: 'Question created successfully',
      };
    } catch (error) {
      throw handleApiError(error);
    }
  },

  async update(id: string, data: Partial<QuestionFormData>): Promise<ApiResponse<Question>> {
    try {
      const payload: Record<string, unknown> = {};
      if (data.text) payload.text = data.text;
      if (data.type) payload.type = data.type;
      if (data.answers) {
        payload.answers = data.answers.map((answer, index) => ({
          text: answer.text,
          is_correct: answer.isCorrect,
          order: index + 1,
        }));
      }

      const response = await apiClient.patch(`/questions/${id}/`, payload);
      return {
        success: true,
        data: response.data,
        message: 'Question updated successfully',
      };
    } catch (error) {
      throw handleApiError(error);
    }
  },

  async delete(id: string): Promise<ApiResponse<null>> {
    try {
      await apiClient.delete(`/questions/${id}/`);
      return {
        success: true,
        data: null,
        message: 'Question deleted successfully',
      };
    } catch (error) {
      throw handleApiError(error);
    }
  },
};

// AI Generation API
export const aiApi = {
  async generateCourse(courseId: string): Promise<ApiResponse<{ task_id: string }>> {
    try {
      const response = await apiClient.post(`/ai/generate/course/${courseId}/`);
      return {
        success: response.data.success,
        data: { task_id: response.data.data.id },
        message: response.data.message,
      };
    } catch (error) {
      throw handleApiError(error);
    }
  },

  async generateModule(moduleId: string): Promise<ApiResponse<{ task_id: string }>> {
    try {
      const response = await apiClient.post(`/ai/generate/module/${moduleId}/`);
      return {
        success: response.data.success,
        data: { task_id: response.data.data.id },
        message: response.data.message,
      };
    } catch (error) {
      throw handleApiError(error);
    }
  },

  async getTaskStatus(taskId: string): Promise<ApiResponse<Record<string, unknown>>> {
    try {
      const response = await apiClient.get(`/ai/tasks/${taskId}/status/`);
      return {
        success: response.data.success,
        data: response.data.data,
      };
    } catch (error) {
      throw handleApiError(error);
    }
  },

  async getTasks(page: number = 1): Promise<PaginatedResponse<Record<string, unknown>>> {
    try {
      const response = await apiClient.get('/ai/tasks/', { params: { page } });
      return {
        data: response.data.results,
        total: response.data.count,
        page,
        pageSize: 10,
        totalPages: Math.ceil(response.data.count / 10),
      };
    } catch (error) {
      throw handleApiError(error);
    }
  },
};

// WebSocket connection for real-time updates
export const createGenerationWebSocket = (
  courseId: string,
  onMessage: (data: Record<string, unknown>) => void,
  token?: string
) => {
  const baseUrl = WS_BASE_URL.replace(/\/$/, '');
  const query = token ? `?token=${token}` : '';
  const ws = new WebSocket(`${baseUrl}/generation/${courseId}/${query}`);

  ws.onopen = () => {
    console.log('Generation WebSocket connected', courseId);
  };

  ws.onmessage = event => {
    const payload = JSON.parse(event.data);
    onMessage(payload);
  };

  ws.onerror = error => {
    console.error('WebSocket error', error);
  };

  ws.onclose = () => {
    console.log('Generation WebSocket closed');
  };

  return ws;
};

export default apiClient;
