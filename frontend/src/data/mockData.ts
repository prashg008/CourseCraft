import type { Course, User, GenerationTask } from '@/types';

// Mock user
export const mockUser: User = {
  id: 'user-1',
  username: 'johndoe',
  email: 'john@example.com',
  createdAt: '2024-01-01T00:00:00Z',
};

// Mock courses
export const mockCourses: Course[] = [
  {
    id: 'course-1',
    title: 'Introduction to Python Programming',
    description:
      'Learn Python from scratch. This comprehensive course covers variables, data types, control structures, functions, and object-oriented programming.',
    status: 'published',
    ownerId: 'user-1',
    modules: [
      {
        id: 'module-1',
        courseId: 'course-1',
        title: 'Getting Started with Python',
        description: 'Learn the basics of Python installation and setup',
        order: 1,
        lessons: [
          {
            id: 'lesson-1',
            moduleId: 'module-1',
            title: 'Installing Python',
            content:
              'Python can be installed from python.org. Download the latest version for your operating system and follow the installation wizard. Make sure to check "Add Python to PATH" during installation.',
            order: 1,
            createdAt: '2024-01-15T10:00:00Z',
          },
          {
            id: 'lesson-2',
            moduleId: 'module-1',
            title: 'Your First Python Program',
            content:
              'Let\'s write our first program! Open your terminal and type: python -c "print(\'Hello, World!\')" This will output "Hello, World!" to your console.',
            order: 2,
            createdAt: '2024-01-15T10:30:00Z',
          },
        ],
        createdAt: '2024-01-15T10:00:00Z',
      },
      {
        id: 'module-2',
        courseId: 'course-1',
        title: 'Variables and Data Types',
        description: 'Understanding different data types in Python',
        order: 2,
        lessons: [
          {
            id: 'lesson-3',
            moduleId: 'module-2',
            title: 'Working with Numbers',
            content:
              'Python supports integers and floating-point numbers. You can perform arithmetic operations like addition (+), subtraction (-), multiplication (*), and division (/).',
            order: 1,
            createdAt: '2024-01-15T11:00:00Z',
          },
        ],
        createdAt: '2024-01-15T11:00:00Z',
      },
    ],
    quiz: {
      id: 'quiz-1',
      courseId: 'course-1',
      questions: [
        {
          id: 'q1',
          quizId: 'quiz-1',
          text: 'What is Python?',
          type: 'single_choice',
          order: 1,
          answers: [
            { id: 'a1', questionId: 'q1', text: 'A programming language', isCorrect: true, order: 1 },
            { id: 'a2', questionId: 'q1', text: 'A type of snake', isCorrect: false, order: 2 },
            { id: 'a3', questionId: 'q1', text: 'A web browser', isCorrect: false, order: 3 },
          ],
        },
        {
          id: 'q2',
          quizId: 'quiz-1',
          text: 'Python is case-sensitive',
          type: 'boolean',
          order: 2,
          answers: [
            { id: 'a4', questionId: 'q2', text: 'True', isCorrect: true, order: 1 },
            { id: 'a5', questionId: 'q2', text: 'False', isCorrect: false, order: 2 },
          ],
        },
      ],
    },
    createdAt: '2024-01-15T10:00:00Z',
    updatedAt: '2024-01-20T15:30:00Z',
  },
  {
    id: 'course-2',
    title: 'Web Development with React',
    description:
      'Master modern web development with React. Learn components, hooks, state management, and build real-world applications.',
    status: 'published',
    ownerId: 'user-1',
    modules: [
      {
        id: 'module-3',
        courseId: 'course-2',
        title: 'React Fundamentals',
        description: 'Core concepts of React',
        order: 1,
        lessons: [
          {
            id: 'lesson-4',
            moduleId: 'module-3',
            title: 'What is React?',
            content:
              'React is a JavaScript library for building user interfaces. It allows you to create reusable UI components and manage application state efficiently.',
            order: 1,
            createdAt: '2024-02-01T09:00:00Z',
          },
        ],
        createdAt: '2024-02-01T09:00:00Z',
      },
    ],
    quiz: {
      id: 'quiz-2',
      courseId: 'course-2',
      questions: [
        {
          id: 'q3',
          quizId: 'quiz-2',
          text: 'What is JSX?',
          type: 'mcq',
          order: 1,
          answers: [
            {
              id: 'a6',
              questionId: 'q3',
              text: 'JavaScript XML - a syntax extension for JavaScript',
              isCorrect: true,
              order: 1,
            },
            { id: 'a7', questionId: 'q3', text: 'A CSS framework', isCorrect: false, order: 2 },
            { id: 'a8', questionId: 'q3', text: 'A database query language', isCorrect: false, order: 3 },
          ],
        },
      ],
    },
    createdAt: '2024-02-01T09:00:00Z',
    updatedAt: '2024-02-05T14:00:00Z',
  },
  {
    id: 'course-3',
    title: 'Machine Learning Basics',
    description:
      'Introduction to machine learning concepts, algorithms, and practical applications using Python and scikit-learn.',
    status: 'draft',
    ownerId: 'user-1',
    modules: [
      {
        id: 'module-4',
        courseId: 'course-3',
        title: 'Introduction to ML',
        description: 'What is machine learning and why it matters',
        order: 1,
        lessons: [
          {
            id: 'lesson-5',
            moduleId: 'module-4',
            title: 'What is Machine Learning?',
            content:
              'Machine Learning is a subset of artificial intelligence that enables systems to learn and improve from experience without being explicitly programmed.',
            order: 1,
            createdAt: '2024-03-01T10:00:00Z',
          },
        ],
        createdAt: '2024-03-01T10:00:00Z',
      },
    ],
    quiz: {
      id: 'quiz-3',
      courseId: 'course-3',
      questions: [
        {
          id: 'q4',
          quizId: 'quiz-3',
          text: 'Machine Learning requires explicit programming for every scenario',
          type: 'boolean',
          order: 1,
          answers: [
            { id: 'a9', questionId: 'q4', text: 'True', isCorrect: false, order: 1 },
            { id: 'a10', questionId: 'q4', text: 'False', isCorrect: true, order: 2 },
          ],
        },
      ],
    },
    createdAt: '2024-03-01T10:00:00Z',
    updatedAt: '2024-03-01T10:00:00Z',
  },
  {
    id: 'course-4',
    title: 'Database Design and SQL',
    description:
      'Learn relational database design, normalization, and master SQL for data manipulation and retrieval.',
    status: 'generating',
    ownerId: 'user-1',
    modules: [],
    quiz: {
      id: 'quiz-4',
      courseId: 'course-4',
      questions: [],
    },
    createdAt: '2024-03-10T14:00:00Z',
    updatedAt: '2024-03-10T14:00:00Z',
  },
  {
    id: 'course-5',
    title: 'DevOps Fundamentals',
    description:
      'Understand CI/CD pipelines, containerization with Docker, orchestration with Kubernetes, and infrastructure as code.',
    status: 'published',
    ownerId: 'user-1',
    modules: [
      {
        id: 'module-5',
        courseId: 'course-5',
        title: 'Introduction to DevOps',
        description: 'DevOps culture and practices',
        order: 1,
        lessons: [
          {
            id: 'lesson-6',
            moduleId: 'module-5',
            title: 'What is DevOps?',
            content:
              'DevOps is a set of practices that combines software development and IT operations to shorten the development lifecycle.',
            order: 1,
            createdAt: '2024-02-15T11:00:00Z',
          },
        ],
        createdAt: '2024-02-15T11:00:00Z',
      },
    ],
    quiz: {
      id: 'quiz-5',
      courseId: 'course-5',
      questions: [
        {
          id: 'q5',
          quizId: 'quiz-5',
          text: 'What does CI/CD stand for?',
          type: 'single_choice',
          order: 1,
          answers: [
            {
              id: 'a11',
              questionId: 'q5',
              text: 'Continuous Integration/Continuous Deployment',
              isCorrect: true,
              order: 1,
            },
            {
              id: 'a12',
              questionId: 'q5',
              text: 'Computer Integration/Computer Deployment',
              isCorrect: false,
              order: 2,
            },
          ],
        },
      ],
    },
    createdAt: '2024-02-15T11:00:00Z',
    updatedAt: '2024-02-20T09:00:00Z',
  },
  {
    id: 'course-6',
    title: 'Mobile App Development with React Native',
    description:
      'Build cross-platform mobile applications using React Native. Learn navigation, state management, and native modules.',
    status: 'draft',
    ownerId: 'user-1',
    modules: [
      {
        id: 'module-6',
        courseId: 'course-6',
        title: 'Getting Started with React Native',
        description: 'Setup and basic concepts',
        order: 1,
        lessons: [
          {
            id: 'lesson-7',
            moduleId: 'module-6',
            title: 'Setting Up Your Environment',
            content:
              'To start with React Native, you need Node.js and either Xcode (for iOS) or Android Studio (for Android).',
            order: 1,
            createdAt: '2024-03-05T13:00:00Z',
          },
        ],
        createdAt: '2024-03-05T13:00:00Z',
      },
    ],
    quiz: {
      id: 'quiz-6',
      courseId: 'course-6',
      questions: [],
    },
    createdAt: '2024-03-05T13:00:00Z',
    updatedAt: '2024-03-05T13:00:00Z',
  },
  {
    id: 'course-7',
    title: 'Cybersecurity Essentials',
    description:
      'Learn fundamental cybersecurity concepts, threat analysis, encryption, network security, and best practices.',
    status: 'published',
    ownerId: 'user-1',
    modules: [
      {
        id: 'module-7',
        courseId: 'course-7',
        title: 'Introduction to Cybersecurity',
        description: 'Understanding threats and vulnerabilities',
        order: 1,
        lessons: [
          {
            id: 'lesson-8',
            moduleId: 'module-7',
            title: 'The CIA Triad',
            content:
              'The CIA triad consists of Confidentiality, Integrity, and Availability - the three core principles of information security.',
            order: 1,
            createdAt: '2024-02-25T10:00:00Z',
          },
        ],
        createdAt: '2024-02-25T10:00:00Z',
      },
    ],
    quiz: {
      id: 'quiz-7',
      courseId: 'course-7',
      questions: [
        {
          id: 'q6',
          quizId: 'quiz-7',
          text: 'What does CIA stand for in cybersecurity?',
          type: 'mcq',
          order: 1,
          answers: [
            {
              id: 'a13',
              questionId: 'q6',
              text: 'Confidentiality, Integrity, Availability',
              isCorrect: true,
              order: 1,
            },
            {
              id: 'a14',
              questionId: 'q6',
              text: 'Central Intelligence Agency',
              isCorrect: false,
              order: 2,
            },
            { id: 'a15', questionId: 'q6', text: 'Computer Internet Access', isCorrect: false, order: 3 },
          ],
        },
      ],
    },
    createdAt: '2024-02-25T10:00:00Z',
    updatedAt: '2024-03-01T16:00:00Z',
  },
];

// Mock generation statuses
export const mockGenerationStatuses: Record<string, GenerationTask> = {
  creating: {
    id: 'task-1',
    courseId: 'course-4',
    entityType: 'course',
    status: 'running',
    currentStage: 'creating',
    progress: 33,
    message: 'Creating course content...',
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  },
  reviewing: {
    id: 'task-2',
    courseId: 'course-4',
    entityType: 'course',
    status: 'running',
    currentStage: 'reviewing',
    progress: 66,
    message: 'Reviewing generated content...',
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  },
  refining: {
    id: 'task-3',
    courseId: 'course-4',
    entityType: 'course',
    status: 'running',
    currentStage: 'refining',
    progress: 85,
    message: 'Refining content...',
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  },
  completed: {
    id: 'task-4',
    courseId: 'course-4',
    entityType: 'course',
    status: 'completed',
    currentStage: 'completed',
    progress: 100,
    message: 'Course generation complete!',
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  },
};
