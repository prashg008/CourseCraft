import type {
  Course,
  CourseFormData,
  CourseFilters,
  PaginatedResponse,
  ApiResponse,
  GenerationTask,
  QuestionFormData,
  RegenerationRequest,
} from '@/types';
import { mockCourses, mockUser, mockGenerationStatuses } from '@/data/mockData';

// Simulated delay helper
const delay = (ms: number = 300) => new Promise((resolve) => setTimeout(resolve, ms));

// In-memory storage for mock data (will reset on page refresh)
let courses = [...mockCourses];
let generationTasks: Record<string, GenerationTask> = { ...mockGenerationStatuses };

// Generate random IDs
const generateId = () => `${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;

// ============================================================================
// Authentication
// ============================================================================

export const login = async (email: string, password: string): Promise<ApiResponse<{ token: string; user: typeof mockUser }>> => {
  await delay(400);

  // Simple mock validation
  if (email && password) {
    return {
      success: true,
      data: {
        token: `mock-token-${Date.now()}`,
        user: mockUser,
      },
      message: 'Login successful',
    };
  }

  throw new Error('Invalid credentials');
};

export const logout = async (): Promise<ApiResponse<null>> => {
  await delay(200);
  return {
    success: true,
    data: null,
    message: 'Logout successful',
  };
};

// ============================================================================
// Course CRUD
// ============================================================================

export const getCourses = async (filters?: CourseFilters): Promise<ApiResponse<PaginatedResponse<Course>>> => {
  await delay(350);

  let filteredCourses = [...courses];

  // Apply status filter
  if (filters?.status && filters.status !== 'all') {
    filteredCourses = filteredCourses.filter((c) => c.status === filters.status);
  }

  // Apply search filter
  if (filters?.search) {
    const searchLower = filters.search.toLowerCase();
    filteredCourses = filteredCourses.filter(
      (c) =>
        c.title.toLowerCase().includes(searchLower) ||
        c.description.toLowerCase().includes(searchLower)
    );
  }

  // Apply sorting
  if (filters?.sortBy === 'title') {
    filteredCourses.sort((a, b) => {
      const comparison = a.title.localeCompare(b.title);
      return filters.sortOrder === 'desc' ? -comparison : comparison;
    });
  } else if (filters?.sortBy === 'date') {
    filteredCourses.sort((a, b) => {
      const comparison = new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime();
      return filters.sortOrder === 'desc' ? -comparison : comparison;
    });
  }

  // Apply pagination
  const page = filters?.page || 1;
  const pageSize = filters?.pageSize || 10;
  const startIndex = (page - 1) * pageSize;
  const endIndex = startIndex + pageSize;
  const paginatedCourses = filteredCourses.slice(startIndex, endIndex);
  const totalPages = Math.ceil(filteredCourses.length / pageSize);

  return {
    success: true,
    data: {
      data: paginatedCourses,
      total: filteredCourses.length,
      page,
      pageSize,
      totalPages,
    },
  };
};

export const getCourseById = async (id: string): Promise<ApiResponse<Course>> => {
  await delay(250);

  const course = courses.find((c) => c.id === id);

  if (!course) {
    throw new Error('Course not found');
  }

  return {
    success: true,
    data: course,
  };
};

export const createCourse = async (data: CourseFormData): Promise<ApiResponse<Course>> => {
  await delay(500);

  const newCourse: Course = {
    id: generateId(),
    title: data.title,
    description: data.description,
    status: 'generating',
    ownerId: mockUser.id,
    modules: [],
    quiz: {
      id: generateId(),
      courseId: '', // Will be set below
      questions: [],
    },
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  };

  newCourse.quiz.courseId = newCourse.id;
  courses.push(newCourse);

  // Create a generation task
  const task: GenerationTask = {
    id: generateId(),
    courseId: newCourse.id,
    entityType: 'course',
    status: 'running',
    currentStage: 'creating',
    progress: 0,
    message: 'Starting course generation...',
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  };

  generationTasks[newCourse.id] = task;

  return {
    success: true,
    data: newCourse,
    message: 'Course creation started',
  };
};

export const updateCourse = async (id: string, data: Partial<CourseFormData>): Promise<ApiResponse<Course>> => {
  await delay(300);

  const courseIndex = courses.findIndex((c) => c.id === id);

  if (courseIndex === -1) {
    throw new Error('Course not found');
  }

  const updatedCourse = {
    ...courses[courseIndex],
    ...data,
    updatedAt: new Date().toISOString(),
  };

  courses[courseIndex] = updatedCourse;

  return {
    success: true,
    data: updatedCourse,
    message: 'Course updated successfully',
  };
};

export const deleteCourse = async (id: string): Promise<ApiResponse<null>> => {
  await delay(300);

  const courseIndex = courses.findIndex((c) => c.id === id);

  if (courseIndex === -1) {
    throw new Error('Course not found');
  }

  courses.splice(courseIndex, 1);

  // Clean up generation task if exists
  if (generationTasks[id]) {
    delete generationTasks[id];
  }

  return {
    success: true,
    data: null,
    message: 'Course deleted successfully',
  };
};

export const publishCourse = async (id: string): Promise<ApiResponse<Course>> => {
  await delay(250);

  const courseIndex = courses.findIndex((c) => c.id === id);

  if (courseIndex === -1) {
    throw new Error('Course not found');
  }

  const updatedCourse = {
    ...courses[courseIndex],
    status: 'published' as const,
    updatedAt: new Date().toISOString(),
  };

  courses[courseIndex] = updatedCourse;

  return {
    success: true,
    data: updatedCourse,
    message: 'Course published successfully',
  };
};

export const archiveCourse = async (id: string): Promise<ApiResponse<Course>> => {
  await delay(250);

  const courseIndex = courses.findIndex((c) => c.id === id);

  if (courseIndex === -1) {
    throw new Error('Course not found');
  }

  const updatedCourse = {
    ...courses[courseIndex],
    status: 'archived' as const,
    updatedAt: new Date().toISOString(),
  };

  courses[courseIndex] = updatedCourse;

  return {
    success: true,
    data: updatedCourse,
    message: 'Course archived successfully',
  };
};

export const unarchiveCourse = async (id: string): Promise<ApiResponse<Course>> => {
  await delay(250);

  const courseIndex = courses.findIndex((c) => c.id === id);

  if (courseIndex === -1) {
    throw new Error('Course not found');
  }

  const updatedCourse = {
    ...courses[courseIndex],
    status: 'draft' as const,
    updatedAt: new Date().toISOString(),
  };

  courses[courseIndex] = updatedCourse;

  return {
    success: true,
    data: updatedCourse,
    message: 'Course unarchived successfully',
  };
};

// ============================================================================
// Module Regeneration
// ============================================================================

export const regenerateModule = async (
  courseId: string,
  moduleId: string,
  request?: RegenerationRequest
): Promise<ApiResponse<GenerationTask>> => {
  await delay(400);

  const course = courses.find((c) => c.id === courseId);

  if (!course) {
    throw new Error('Course not found');
  }

  const module = course.modules.find((m) => m.id === moduleId);

  if (!module) {
    throw new Error('Module not found');
  }

  // Create a generation task for the module
  const task: GenerationTask = {
    id: generateId(),
    courseId,
    moduleId,
    entityType: 'module',
    status: 'running',
    currentStage: 'creating',
    progress: 0,
    message: `Regenerating module: ${module.title}${request?.feedback ? ' with feedback' : ''}`,
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  };

  generationTasks[task.id] = task;

  return {
    success: true,
    data: task,
    message: 'Module regeneration started',
  };
};

// ============================================================================
// Quiz Operations
// ============================================================================

export const regenerateQuiz = async (
  courseId: string,
  request?: RegenerationRequest
): Promise<ApiResponse<GenerationTask>> => {
  await delay(400);

  const course = courses.find((c) => c.id === courseId);

  if (!course) {
    throw new Error('Course not found');
  }

  // Create a generation task for the quiz
  const task: GenerationTask = {
    id: generateId(),
    courseId,
    quizId: course.quiz.id,
    entityType: 'quiz',
    status: 'running',
    currentStage: 'creating',
    progress: 0,
    message: `Regenerating quiz${request?.feedback ? ' with feedback' : ''}`,
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  };

  generationTasks[task.id] = task;

  return {
    success: true,
    data: task,
    message: 'Quiz regeneration started',
  };
};

export const addQuestion = async (
  courseId: string,
  data: QuestionFormData
): Promise<ApiResponse<Course>> => {
  await delay(300);

  const courseIndex = courses.findIndex((c) => c.id === courseId);

  if (courseIndex === -1) {
    throw new Error('Course not found');
  }

  const course = courses[courseIndex];
  const questionId = generateId();

  const newQuestion = {
    id: questionId,
    quizId: course.quiz.id,
    text: data.text,
    type: data.type,
    order: course.quiz.questions.length + 1,
    answers: data.answers.map((answer, index) => ({
      id: generateId(),
      questionId,
      text: answer.text,
      isCorrect: answer.isCorrect,
      order: index + 1,
    })),
  };

  const updatedCourse = {
    ...course,
    quiz: {
      ...course.quiz,
      questions: [...course.quiz.questions, newQuestion],
    },
    updatedAt: new Date().toISOString(),
  };

  courses[courseIndex] = updatedCourse;

  return {
    success: true,
    data: updatedCourse,
    message: 'Question added successfully',
  };
};

export const updateQuestion = async (
  courseId: string,
  questionId: string,
  data: QuestionFormData
): Promise<ApiResponse<Course>> => {
  await delay(300);

  const courseIndex = courses.findIndex((c) => c.id === courseId);

  if (courseIndex === -1) {
    throw new Error('Course not found');
  }

  const course = courses[courseIndex];
  const questionIndex = course.quiz.questions.findIndex((q) => q.id === questionId);

  if (questionIndex === -1) {
    throw new Error('Question not found');
  }

  const updatedQuestion = {
    ...course.quiz.questions[questionIndex],
    text: data.text,
    type: data.type,
    answers: data.answers.map((answer, index) => ({
      id: course.quiz.questions[questionIndex].answers[index]?.id || generateId(),
      questionId,
      text: answer.text,
      isCorrect: answer.isCorrect,
      order: index + 1,
    })),
  };

  const updatedQuestions = [...course.quiz.questions];
  updatedQuestions[questionIndex] = updatedQuestion;

  const updatedCourse = {
    ...course,
    quiz: {
      ...course.quiz,
      questions: updatedQuestions,
    },
    updatedAt: new Date().toISOString(),
  };

  courses[courseIndex] = updatedCourse;

  return {
    success: true,
    data: updatedCourse,
    message: 'Question updated successfully',
  };
};

export const deleteQuestion = async (courseId: string, questionId: string): Promise<ApiResponse<Course>> => {
  await delay(250);

  const courseIndex = courses.findIndex((c) => c.id === courseId);

  if (courseIndex === -1) {
    throw new Error('Course not found');
  }

  const course = courses[courseIndex];
  const questionIndex = course.quiz.questions.findIndex((q) => q.id === questionId);

  if (questionIndex === -1) {
    throw new Error('Question not found');
  }

  const updatedQuestions = course.quiz.questions.filter((q) => q.id !== questionId);

  // Reorder remaining questions
  const reorderedQuestions = updatedQuestions.map((q, index) => ({
    ...q,
    order: index + 1,
  }));

  const updatedCourse = {
    ...course,
    quiz: {
      ...course.quiz,
      questions: reorderedQuestions,
    },
    updatedAt: new Date().toISOString(),
  };

  courses[courseIndex] = updatedCourse;

  return {
    success: true,
    data: updatedCourse,
    message: 'Question deleted successfully',
  };
};

// ============================================================================
// Generation Status
// ============================================================================

export const getGenerationStatus = async (taskId: string): Promise<ApiResponse<GenerationTask>> => {
  await delay(200);

  const task = generationTasks[taskId];

  if (!task) {
    throw new Error('Generation task not found');
  }

  // Simulate progress updates
  if (task.status === 'running' && task.progress < 100) {
    const progressIncrement = Math.floor(Math.random() * 15) + 5;
    task.progress = Math.min(task.progress + progressIncrement, 100);

    // Update stage based on progress
    if (task.progress < 33) {
      task.currentStage = 'creating';
      task.message = 'Creating content...';
    } else if (task.progress < 66) {
      task.currentStage = 'reviewing';
      task.message = 'Reviewing content quality...';
    } else if (task.progress < 100) {
      task.currentStage = 'refining';
      task.message = 'Refining and finalizing...';
    } else {
      task.currentStage = 'completed';
      task.status = 'completed';
      task.message = 'Generation complete!';
    }

    task.updatedAt = new Date().toISOString();
  }

  return {
    success: true,
    data: task,
  };
};

// ============================================================================
// Utility Functions
// ============================================================================

// Reset mock data (useful for testing)
export const resetMockData = () => {
  courses = [...mockCourses];
  generationTasks = { ...mockGenerationStatuses };
};

// Get all generation tasks (for debugging)
export const getAllGenerationTasks = async (): Promise<ApiResponse<GenerationTask[]>> => {
  await delay(200);
  return {
    success: true,
    data: Object.values(generationTasks),
  };
};
