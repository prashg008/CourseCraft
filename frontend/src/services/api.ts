// Custom error class for API errors
class ApiError extends Error {
  public problem: string | null | undefined;
  public data: unknown;
  public status: number | undefined;
  constructor(message: string, problem?: string | null, data?: unknown, status?: number) {
    super(message);
    this.problem = problem;
    this.data = data;
    this.status = status;
    Object.setPrototypeOf(this, ApiError.prototype);
  }
}
import { create as createApi } from 'apisauce';
import type { ApisauceInstance } from 'apisauce';
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

export const API_BASE_URL = import.meta.env.VITE_API_BASE_URL ?? 'http://localhost:3000/api';
export const WS_BASE_URL = import.meta.env.VITE_WS_BASE_URL ?? 'http://localhost:3000';

// Create apisauce instance
const apiClient: ApisauceInstance = createApi({
  baseURL: API_BASE_URL,
  headers: { 'Content-Type': 'application/json' },
  timeout: 10000,
});

// Request transform to add auth token
apiClient.addRequestTransform(request => {
  const token = localStorage.getItem('authToken');
  if (token) {
    request.headers = { ...request.headers, Authorization: `Bearer ${token}` };
  }
});

// Response transform for camelCase, 401 handling, and error throwing
apiClient.addResponseTransform(response => {
  if (response.status === 401) {
    localStorage.removeItem('authToken');
    localStorage.removeItem('user');
    window.location.href = '/login';
  }
  if (response.data) {
    response.data = camelizeKeys(response.data);
  }
  // Explicitly throw error for non-ok responses
  if (!response.ok) {
    throw new ApiError('API Error', response.problem, response.data, response.status);
  }
});

// Helper function to handle API errors
import type { MessageResponse as MsgResp } from '../types';
function isErrorObj(obj: unknown): obj is { error?: string } {
  return typeof obj === 'object' && obj !== null && 'error' in obj;
}
function isMessageObj(obj: unknown): obj is { message?: string } {
  return typeof obj === 'object' && obj !== null && 'message' in obj;
}
const handleApiError = (problem: unknown, data?: MsgResp): Error => {
  let message = data?.message;
  if (!message && isErrorObj(data)) message = data.error;
  if (!message && isMessageObj(problem)) message = problem.message;
  if (!message) message = 'An error occurred';
  return new Error(message);
};

export const authApi = {
  async register(
    username: string,
    email: string,
    password: string
  ): Promise<ApiResponse<{ accessToken: string; user: User }>> {
    const { ok, data, problem } = await apiClient.post('/auth/register', {
      username,
      email,
      password,
    });
    if (ok && data) {
      return { success: true, data: data as { accessToken: string; user: User } };
    }
    throw handleApiError(problem as MsgResp, data as MsgResp);
  },

  async login(
    email: string,
    password: string
  ): Promise<ApiResponse<{ accessToken: string; user: User }>> {
    const { ok, data, problem } = await apiClient.post('/auth/login', { email, password });
    if (ok && data) {
      return { success: true, data: data as { accessToken: string; user: User } };
    }
    throw handleApiError(problem as MsgResp, data as MsgResp);
  },

  async logout(): Promise<ApiResponse<null>> {
    const { ok, data, problem } = await apiClient.post('/auth/logout');
    if (ok) {
      return { success: true, data: null };
    }
    throw handleApiError(problem as MsgResp, data as MsgResp);
  },

  async me(): Promise<ApiResponse<User>> {
    const { ok, data, problem } = await apiClient.get('/auth/profile');
    if (ok && data) {
      return { success: true, data: data as User };
    }
    throw handleApiError(problem as MsgResp, data as MsgResp);
  },
};

// Courses API
export const coursesApi = {
  async getAll(filters?: CourseFilters): Promise<PaginatedResponse<Course>> {
    const page = filters?.page ?? 1;
    const pageSize = filters?.pageSize ?? 10;
    const sortBy = filters?.sortBy === 'title' ? 'title' : 'createdAt';
    const sortOrder = (filters?.sortOrder ?? 'desc').toUpperCase() === 'ASC' ? 'ASC' : 'DESC';

    const params: Record<string, unknown> = {
      page,
      limit: pageSize,
      sortBy,
      order: sortOrder,
    };

    if (filters?.search) {
      params.search = filters.search;
    }

    if (filters?.status && filters.status !== 'all') {
      params.status = filters.status;
    }

    const { ok, data, problem } = await apiClient.get('/courses', params);
    if (ok && data) {
      const { data: courseData = [], meta } = data as {
        data: Course[];
        meta?: Record<string, unknown>;
      };
      const metaNum = meta as {
        total?: number;
        limit?: number;
        totalPages?: number;
        page?: number;
      };
      const totalItems = metaNum?.total ?? courseData.length;
      const resolvedPageSize = metaNum?.limit ?? pageSize;
      const totalPages = metaNum?.totalPages ?? Math.ceil(totalItems / (resolvedPageSize || 1));
      return {
        data: courseData,
        total: totalItems,
        page: metaNum?.page ?? page,
        pageSize: resolvedPageSize,
        totalPages,
      };
    }
    throw handleApiError(problem as MsgResp, data as MsgResp);
  },

  async getById(id: string): Promise<ApiResponse<Course>> {
    const { ok, data, problem } = await apiClient.get(`/courses/${id}`);
    if (ok && data) {
      return { success: true, data: data as Course };
    }
    throw handleApiError(problem as MsgResp, data as MsgResp);
  },

  async create(data: CourseFormData): Promise<ApiResponse<Course>> {
    const { ok, data: respData, problem } = await apiClient.post('/courses', data);
    if (ok && respData) {
      return { success: true, data: respData as Course, message: 'Course created successfully' };
    }
    throw handleApiError(
      problem as import('../types').MessageResponse,
      respData as import('../types').MessageResponse
    );
  },

  async update(id: string, data: Partial<Course>): Promise<ApiResponse<Course>> {
    try {
      const response = await apiClient.patch(`/courses/${id}`, data);
      return {
        success: true,
        data: response.data as Course,
        message: 'Course updated successfully',
      };
    } catch (error: unknown) {
      if (error instanceof ApiError) {
        throw handleApiError(error.problem, error.data as import('../types').MessageResponse);
      }
      throw error;
    }
  },

  async updateDetails(id: string, data: CourseUpdatePayload): Promise<ApiResponse<Course>> {
    try {
      const response = await apiClient.patch(`/courses/${id}/details`, data);
      return {
        success: true,
        data: response.data as Course,
        message: 'Course details updated successfully',
      };
    } catch (error: unknown) {
      if (error instanceof ApiError) {
        throw handleApiError(error.problem, error.data as import('../types').MessageResponse);
      }
      throw error;
    }
  },

  async delete(id: string): Promise<ApiResponse<null>> {
    try {
      await apiClient.delete(`/courses/${id}`);
      return {
        success: true,
        data: null,
        message: 'Course deleted successfully',
      };
    } catch (error: unknown) {
      if (error instanceof ApiError) {
        throw handleApiError(error.problem, error.data as import('../types').MessageResponse);
      }
      throw error;
    }
  },

  async publish(id: string): Promise<ApiResponse<Course>> {
    const { ok, data, problem } = await apiClient.post(`/courses/${id}/publish`);
    if (ok && data) {
      return { success: true, data: data as Course, message: 'Course published successfully' };
    }
    throw handleApiError(problem as MsgResp, data as MsgResp);
  },

  async unpublish(id: string): Promise<ApiResponse<Course>> {
    const { ok, data, problem } = await apiClient.post(`/courses/${id}/unpublish`);
    if (ok && data) {
      return { success: true, data: data as Course, message: 'Course moved to draft' };
    }
    throw handleApiError(problem as MsgResp, data as MsgResp);
  },

  async archive(id: string): Promise<ApiResponse<Course>> {
    const { ok, data, problem } = await apiClient.post(`/courses/${id}/archive`);
    if (ok && data) {
      return { success: true, data: data as Course, message: 'Course archived successfully' };
    }
    throw handleApiError(problem as MsgResp, data as MsgResp);
  },

  async unarchive(id: string): Promise<ApiResponse<Course>> {
    const { ok, data, problem } = await apiClient.post(`/courses/${id}/unarchive`);
    if (ok && data) {
      return { success: true, data: data as Course, message: 'Course unarchived successfully' };
    }
    throw handleApiError(problem as MsgResp, data as MsgResp);
  },

  async getArchivedCourses(): Promise<ApiResponse<Course[]>> {
    const { ok, data, problem } = await apiClient.get('/courses/archived');
    if (ok && data) {
      return { success: true, data: data as Course[] };
    }
    throw handleApiError(
      problem as import('../types').MessageResponse,
      data as import('../types').MessageResponse
    );
  },

  async regenerateModule(
    courseId: string,
    moduleId: string,
    request?: RegenerationRequest
  ): Promise<ApiResponse<GenerationTask>> {
    const payload = request ? { feedback: request.feedback } : {};
    const { ok, data, problem } = await apiClient.post(
      `/courses/${courseId}/modules/${moduleId}/regenerate`,
      payload
    );
    if (ok && data) {
      const msg =
        (data as import('../types').MessageResponse).message || 'Module regeneration started';
      return { success: true, data: data as GenerationTask, message: msg };
    }
    throw handleApiError(
      problem as import('../types').MessageResponse,
      data as import('../types').MessageResponse
    );
  },

  async regenerateQuiz(
    courseId: string,
    request?: RegenerationRequest
  ): Promise<ApiResponse<GenerationTask>> {
    const payload = request ? { feedback: request.feedback } : {};
    const { ok, data, problem } = await apiClient.post(
      `/courses/${courseId}/quiz/regenerate`,
      payload
    );
    if (ok && data) {
      const msg =
        (data as import('../types').MessageResponse).message || 'Quiz regeneration started';
      return { success: true, data: data as GenerationTask, message: msg };
    }
    throw handleApiError(
      problem as import('../types').MessageResponse,
      data as import('../types').MessageResponse
    );
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
    const { ok, data: respData, problem } = await apiClient.post('/modules', data);
    if (ok && respData) {
      return { success: true, data: respData as Module, message: 'Module created successfully' };
    }
    throw handleApiError(problem as MsgResp, respData as MsgResp);
  },

  async update(id: string, data: Partial<Module>): Promise<ApiResponse<Module>> {
    const { ok, data: respData, problem } = await apiClient.patch(`/modules/${id}`, data);
    if (ok && respData) {
      return { success: true, data: respData as Module, message: 'Module updated successfully' };
    }
    throw handleApiError(problem as MsgResp, respData as MsgResp);
  },

  async delete(id: string): Promise<ApiResponse<null>> {
    try {
      await apiClient.delete(`/modules/${id}`);
      return {
        success: true,
        data: null,
        message: 'Module deleted successfully',
      };
    } catch (error: unknown) {
      if (error instanceof ApiError) {
        throw handleApiError(error.problem, error.data as import('../types').MessageResponse);
      }
      throw error;
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
    const { ok, data: respData, problem } = await apiClient.post('/lessons', data);
    if (ok && respData) {
      return { success: true, data: respData as Lesson, message: 'Lesson created successfully' };
    }
    throw handleApiError(problem as MsgResp, respData as MsgResp);
  },

  async update(id: string, data: Partial<Lesson>): Promise<ApiResponse<Lesson>> {
    const { ok, data: respData, problem } = await apiClient.patch(`/lessons/${id}`, data);
    if (ok && respData) {
      return { success: true, data: respData as Lesson, message: 'Lesson updated successfully' };
    }
    throw handleApiError(problem as MsgResp, respData as MsgResp);
  },

  async delete(id: string): Promise<ApiResponse<null>> {
    try {
      await apiClient.delete(`/lessons/${id}`);
      return {
        success: true,
        data: null,
        message: 'Lesson deleted successfully',
      };
    } catch (error: unknown) {
      if (error instanceof ApiError) {
        throw handleApiError(error.problem, error.data as import('../types').MessageResponse);
      }
      throw error;
    }
  },
};

// Quiz API
export const quizApi = {
  async create(data: { course: string }): Promise<ApiResponse<Quiz>> {
    const { ok, data: respData, problem } = await apiClient.post('/quizzes', data);
    if (ok && respData) {
      return { success: true, data: respData as Quiz, message: 'Quiz created successfully' };
    }
    throw handleApiError(problem as MsgResp, respData as MsgResp);
  },

  async delete(id: string): Promise<ApiResponse<null>> {
    try {
      await apiClient.delete(`/quizzes/${id}`);
      return {
        success: true,
        data: null,
        message: 'Quiz deleted successfully',
      };
    } catch (error) {
      throw handleApiError(error as import('../types').MessageResponse, undefined);
    }
  },
};

// Questions API
export const questionsApi = {
  async create(
    data: { quiz: string; order: number } & QuestionFormData
  ): Promise<ApiResponse<Question>> {
    const {
      ok,
      data: respData,
      problem,
    } = await apiClient.post('/questions', {
      quizId: data.quiz,
      text: data.text,
      type: data.type,
      order: data.order,
      answers: data.answers.map((answer, index) => ({
        text: answer.text,
        isCorrect: answer.isCorrect,
        order: index + 1,
      })),
    });
    if (ok && respData) {
      return {
        success: true,
        data: respData as Question,
        message: 'Question created successfully',
      };
    }
    throw handleApiError(problem as MsgResp, respData as MsgResp);
  },

  async update(id: string, data: Partial<QuestionFormData>): Promise<ApiResponse<Question>> {
    const payload: Record<string, unknown> = {};
    if (data.text) payload.text = data.text;
    if (data.type) payload.type = data.type;
    if (data.answers) {
      payload.answers = data.answers.map((answer, index) => ({
        text: answer.text,
        isCorrect: answer.isCorrect,
        order: index + 1,
      }));
    }
    const { ok, data: respData, problem } = await apiClient.patch(`/questions/${id}`, payload);
    if (ok && respData) {
      return {
        success: true,
        data: respData as Question,
        message: 'Question updated successfully',
      };
    }
    throw handleApiError(
      problem as import('../types').MessageResponse,
      respData as import('../types').MessageResponse
    );
  },

  async delete(id: string): Promise<ApiResponse<null>> {
    try {
      await apiClient.delete(`/questions/${id}`);
      return {
        success: true,
        data: null,
        message: 'Question deleted successfully',
      };
    } catch (error) {
      throw handleApiError(error as import('../types').MessageResponse, undefined);
    }
  },
};

// AI Generation API
export const aiApi = {
  async generateCourse(courseId: string): Promise<ApiResponse<{ task_id: string }>> {
    const { ok, data, problem } = await apiClient.post(`/courses/${courseId}/regenerate`);
    if (ok && data) {
      const msg =
        (data as import('../types').MessageResponse).message || 'Course regeneration started';
      return { success: true, data: { task_id: courseId }, message: msg };
    }
    throw handleApiError(problem as MsgResp, data as MsgResp);
  },

  async generateModule(moduleId: string): Promise<ApiResponse<{ task_id: string }>> {
    const { ok, data, problem } = await apiClient.post(`/ai/generate/module/${moduleId}`);
    if (ok && data) {
      const resp = data as import('../types').SuccessDataResponse<
        { id: string } & import('../types').MessageResponse
      >;
      const id = resp.data?.id;
      const msg = resp.message;
      return { success: resp.success, data: { task_id: id }, message: msg };
    }
    throw handleApiError(problem as MsgResp, data as MsgResp);
  },

  async getTaskStatus(taskId: string): Promise<ApiResponse<Record<string, unknown>>> {
    const { ok, data, problem } = await apiClient.get(`/ai/tasks/${taskId}/status`);
    if (ok && data) {
      const resp = data as import('../types').SuccessDataResponse<Record<string, unknown>>;
      return { success: resp.success, data: resp.data };
    }
    throw handleApiError(problem as MsgResp, data as MsgResp);
  },

  async getTasks(page: number = 1): Promise<PaginatedResponse<Record<string, unknown>>> {
    const { ok, data, problem } = await apiClient.get('/ai/tasks', { params: { page } });
    if (ok && data) {
      const resp = data as import('../types').CountResultsResponse<Record<string, unknown>>;
      return {
        data: resp.results,
        total: resp.count,
        page,
        pageSize: 10,
        totalPages: Math.ceil(resp.count / 10),
      };
    }
    throw handleApiError(
      problem as import('../types').MessageResponse,
      data as import('../types').MessageResponse
    );
  },
};
export default apiClient;
