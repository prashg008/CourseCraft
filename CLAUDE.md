# CLAUDE.md - AI Assistant Guide for CourseCraft

> **Last Updated:** 2025-11-24
> **Version:** 1.0.0
> **Branch:** claude/claude-md-midfebbwrbv9g1c5-013Mdx5LRab4bBk5ey6GR7Wu

This document provides comprehensive guidance for AI assistants (like Claude) working on the CourseCraft codebase. It covers architecture, conventions, workflows, and critical implementation details.

---

## Table of Contents

1. [Project Overview](#project-overview)
2. [Architecture at a Glance](#architecture-at-a-glance)
3. [Directory Structure](#directory-structure)
4. [Technology Stack](#technology-stack)
5. [Development Setup](#development-setup)
6. [Code Conventions](#code-conventions)
7. [Database Schema](#database-schema)
8. [Backend Architecture](#backend-architecture)
9. [Frontend Architecture](#frontend-architecture)
10. [Common Development Tasks](#common-development-tasks)
11. [Testing Strategy](#testing-strategy)
12. [Deployment](#deployment)
13. [Critical Files Reference](#critical-files-reference)
14. [Troubleshooting](#troubleshooting)

---

## Project Overview

**CourseCraft** is an AI-assisted course authoring platform that enables users to generate educational content using Large Language Models (LLMs). The platform features:

- **AI-powered generation**: Courses, modules, lessons, and quizzes created via LangChain
- **Creator-Reviewer pattern**: Quality control through iterative AI review cycles
- **Real-time updates**: WebSocket notifications for long-running generation tasks
- **Full CRUD operations**: Manual editing of all generated content
- **JWT Authentication**: Secure user authentication and authorization
- **Multi-LLM support**: OpenAI GPT-4o-mini and Google Gemini Flash

**Target Users**: Educators, content creators, training coordinators

**Key Feature**: The AI generation is fire-and-forget (non-blocking) with progress communicated via WebSocket, allowing users to continue working while content generates in the background.

---

## Architecture at a Glance

```
┌─────────────────────────────────────────────────────────────────┐
│                         Frontend (React)                         │
│  ┌──────────────┐  ┌──────────────┐  ┌──────────────┐          │
│  │ Auth Context │  │ Socket.IO    │  │ Zustand      │          │
│  │ (JWT)        │  │ Client       │  │ Store        │          │
│  └──────────────┘  └──────────────┘  └──────────────┘          │
│         │                  │                  │                  │
│         └──────────────────┴──────────────────┘                  │
│                            │                                     │
└────────────────────────────┼─────────────────────────────────────┘
                             │ HTTP/WebSocket
┌────────────────────────────┼─────────────────────────────────────┐
│                    Backend (NestJS)                               │
│  ┌──────────────────────────────────────────────────────────┐   │
│  │  Controllers (REST API)  │  WebSocket Gateway            │   │
│  └──────────────────────────────────────────────────────────┘   │
│                            │                                     │
│  ┌──────────────┐  ┌──────────────┐  ┌──────────────┐          │
│  │ Auth Module  │  │ Course Module│  │ AI Generation│          │
│  │ (Passport)   │  │ (CRUD)       │  │ (LangChain)  │          │
│  └──────────────┘  └──────────────┘  └──────────────┘          │
│         │                  │                  │                  │
│  ┌──────────────────────────────────────────────────────────┐   │
│  │           TypeORM (ORM) + PostgreSQL (Database)          │   │
│  └──────────────────────────────────────────────────────────┘   │
└───────────────────────────────────────────────────────────────────┘
```

**Data Flow:**
1. User authenticates → JWT token stored in localStorage
2. User creates course → Backend triggers async AI generation
3. AI service orchestrates Creator/Reviewer agents
4. Progress updates emitted via WebSocket to subscribed clients
5. Generated content saved to PostgreSQL
6. Frontend updates in real-time

---

## Directory Structure

```
CourseCraft/
├── backend/                    # NestJS API + WebSocket server
│   ├── src/
│   │   ├── ai-generation/      # LangChain AI integration
│   │   │   ├── agents/         # Creator & Reviewer agents
│   │   │   ├── prompts/        # Prompt templates
│   │   │   ├── schemas/        # Zod schemas for structured output
│   │   │   ├── orchestrator.service.ts  # Creator-Reviewer loop
│   │   │   ├── ai-generation.service.ts # DB + WebSocket integration
│   │   │   └── llm-factory.service.ts   # LLM provider abstraction
│   │   ├── auth/               # JWT authentication
│   │   │   ├── guards/         # JWT, Local, Admin, Owner guards
│   │   │   ├── strategies/     # Passport strategies
│   │   │   └── decorators/     # @CurrentUser, @Public
│   │   ├── courses/            # Course CRUD operations
│   │   │   ├── entities/       # TypeORM entities (Course, Module, etc.)
│   │   │   ├── dto/            # Data transfer objects
│   │   │   ├── courses.controller.ts
│   │   │   └── courses.service.ts
│   │   ├── users/              # User management
│   │   ├── websocket/          # Socket.IO implementation
│   │   │   ├── course-generation.gateway.ts  # WebSocket hub
│   │   │   └── snapshot.service.ts           # State recovery
│   │   ├── database/           # TypeORM config + migrations
│   │   ├── common/             # Shared utilities, filters, interceptors
│   │   ├── config/             # Environment configuration
│   │   └── main.ts             # Bootstrap + middleware
│   ├── test/                   # E2E tests
│   ├── Dockerfile              # Multi-stage Docker build
│   ├── package.json            # Dependencies + scripts
│   └── tsconfig.json           # TypeScript configuration
├── frontend/                   # React SPA (Vite)
│   ├── src/
│   │   ├── components/         # React components
│   │   │   ├── auth/           # ProtectedRoute, GuestRoute
│   │   │   ├── course/         # Course-specific components
│   │   │   ├── layout/         # Header, Sidebar, MainLayout
│   │   │   └── ui/             # Reusable UI components
│   │   ├── context/            # AuthContext
│   │   ├── hooks/              # Custom React hooks
│   │   ├── pages/              # Route pages
│   │   ├── services/           # API client (Apisauce)
│   │   ├── websocket/          # Socket.IO client
│   │   │   ├── core/           # SocketProvider, socket-manager
│   │   │   ├── hooks/          # useSocket, useCourseGeneration
│   │   │   └── store/          # Zustand store
│   │   ├── types/              # TypeScript interfaces
│   │   ├── utils/              # Utility functions
│   │   ├── App.tsx             # Routes + AuthProvider
│   │   └── main.tsx            # React entry point
│   ├── public/                 # Static assets
│   ├── Dockerfile              # Nginx production build
│   ├── nginx.conf              # Nginx configuration
│   ├── package.json            # Dependencies + scripts
│   └── vite.config.ts          # Vite build configuration
├── docker-compose.yml          # Full stack orchestration
├── .env.example                # Environment variables template
└── README.md                   # User-facing documentation
```

**Key Directories:**
- `backend/src/ai-generation/` - All AI/LLM logic
- `backend/src/websocket/` - Real-time communication
- `backend/src/database/migrations/` - Database schema changes
- `frontend/src/pages/` - Top-level route components
- `frontend/src/websocket/` - WebSocket client implementation

---

## Technology Stack

### Backend
- **Framework**: NestJS 11 (Node 20, TypeScript 5.7)
- **ORM**: TypeORM 0.3.27
- **Database**: PostgreSQL 16
- **Authentication**: Passport JWT, bcrypt
- **WebSocket**: Socket.IO 4.8
- **AI/ML**: LangChain 1.0, @langchain/openai, @langchain/google-genai
- **Validation**: class-validator, class-transformer, Zod 4.1
- **API Docs**: Swagger (NestJS OpenAPI)
- **Testing**: Jest 30

### Frontend
- **Framework**: React 19, TypeScript 5.9
- **Build Tool**: Vite 7
- **Routing**: React Router 7
- **Styling**: Tailwind CSS 4
- **HTTP Client**: Apisauce (axios wrapper)
- **WebSocket**: Socket.IO Client 4.8
- **State Management**: React Context (auth), Zustand 4.5 (WebSocket events)
- **UI Feedback**: react-hot-toast
- **Markdown**: react-markdown

### Infrastructure
- **Containerization**: Docker, Docker Compose
- **Web Server**: Nginx (production frontend)
- **Node Version**: 20.x - 22.x
- **Package Manager**: npm 9+

---

## Development Setup

### Prerequisites
- Node.js 20+ and npm 9+
- Docker & Docker Compose (for full stack)
- PostgreSQL 16 (if running locally without Docker)
- OpenAI API key (for AI generation)

### Option 1: Docker Compose (Recommended)

```bash
# Clone repository
git clone <repo-url>
cd CourseCraft

# Setup environment
cp .env.example .env
# Edit .env: Add OPENAI_API_KEY, adjust DATABASE_PASSWORD, JWT_SECRET

# Build and start all services
docker compose up --build

# Access services:
# - Frontend: http://localhost:4173
# - Backend API: http://localhost:3000/api
# - Swagger docs: http://localhost:3000/api/docs
# - PostgreSQL: localhost:5435
```

**Services:**
- `db` - PostgreSQL 16 (port 5435 → 5432)
- `backend` - NestJS API (port 3000)
- `frontend` - Nginx serving Vite build (port 4173)

### Option 2: Local Development (No Docker)

**Backend:**
```bash
cd backend
npm install
cp .env.example .env
# Edit .env: Configure DATABASE_HOST=localhost, DATABASE_PORT=5432

# Run migrations
npm run migration:run

# Start development server
npm run start:dev
# API available at http://localhost:3000/api
```

**Frontend:**
```bash
cd frontend
npm install
cp .env.example .env
# Edit .env: Set VITE_API_BASE_URL=http://localhost:3000/api

# Start dev server
npm run dev
# UI available at http://localhost:5173
```

**PostgreSQL Setup:**
```bash
# Install PostgreSQL 16
# Create database
psql -U postgres
CREATE DATABASE coursecraft;
CREATE USER coursecraft_user WITH PASSWORD 'your_password';
GRANT ALL PRIVILEGES ON DATABASE coursecraft TO coursecraft_user;
```

### Environment Variables

**Backend (.env or root .env):**
```bash
# Database
DATABASE_HOST=db                    # or localhost for local dev
DATABASE_PORT=5432
DATABASE_NAME=coursecraft
DATABASE_USERNAME=postgres
DATABASE_PASSWORD=postgres

# JWT
JWT_SECRET=your-secret-key-change-me
JWT_EXPIRES_IN=7d

# LLM Provider
LLM_PROVIDER=openai                 # or gemini
OPENAI_API_KEY=sk-...               # Required for AI generation
GEMINI_API_KEY=...                  # Optional

# CORS
CORS_ORIGIN=http://localhost:4173
SOCKET_IO_CORS_ORIGIN=http://localhost:4173

# Ports (for Docker)
BACKEND_PORT=3000
FRONTEND_PORT=4173
DATABASE_HOST_PORT=5435
```

**Frontend (.env):**
```bash
VITE_API_BASE_URL=http://localhost:3000/api  # or http://backend:3000/api in Docker
VITE_WS_BASE_URL=ws://localhost:3000         # or ws://backend:3000 in Docker
```

**Important**: Frontend env vars are compile-time only. Change requires rebuild!

---

## Code Conventions

### File Naming

**Backend:**
- Files: `kebab-case.ts` (e.g., `course-generation.gateway.ts`)
- Classes: `PascalCase` (e.g., `CoursesService`, `JwtAuthGuard`)
- DTOs: `PascalCase` with `Dto` suffix (e.g., `CreateCourseDto`)
- Entities: Singular `PascalCase` (e.g., `Course`, `Module`)
- Interfaces: `PascalCase` (e.g., `UserPayload`)
- Enums: `PascalCase` with `UPPER_CASE` values

**Frontend:**
- Components: `PascalCase.tsx` (e.g., `CourseList.tsx`, `ModuleCard.tsx`)
- Utilities: `camelCase.ts` (e.g., `formatDate.ts`)
- Hooks: `use` prefix (e.g., `useAuth.ts`, `useCourseGeneration.ts`)
- Types: `PascalCase` (e.g., `Course`, `ApiResponse<T>`)

### TypeScript

**Strict Mode Enabled:**
- Always use explicit types (avoid `any`)
- Enable strict null checks
- Use interfaces for object shapes, types for unions/intersections

**Path Aliases:**
- Backend: `@auth/*`, `@courses/*`, `@ai-generation/*`, etc.
- Frontend: `@/*` maps to `./src/*`

**Examples:**
```typescript
// Backend service
import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Course } from './entities/course.entity';

@Injectable()
export class CoursesService {
  constructor(
    @InjectRepository(Course)
    private courseRepository: Repository<Course>,
  ) {}

  async findAll(): Promise<Course[]> {
    return this.courseRepository.find({ relations: ['modules', 'quiz'] });
  }
}

// Frontend hook
export function useCourseGeneration(courseId: string) {
  const { isConnected, socket } = useSocket();
  const channel = `course:generation:${courseId}`;

  useSocketSubscription(channel, courseId, isConnected, socket);

  return useGenerationStore((state) => state.getSnapshot(channel));
}
```

### Database Naming

- Tables: `snake_case` plural (e.g., `courses`, `modules`, `quiz_questions`)
- Columns: `snake_case` (e.g., `created_at`, `owner_id`, `is_correct`)
- Foreign keys: `{entity}_id` (e.g., `course_id`, `module_id`)

**TypeORM Entity Example:**
```typescript
@Entity('courses')
export class Course {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ name: 'title', length: 255 })
  title: string;

  @ManyToOne(() => User, (user) => user.courses)
  @JoinColumn({ name: 'owner_id' })
  owner: User;

  @Column({ name: 'owner_id' })
  ownerId: string;

  @CreateDateColumn({ name: 'created_at' })
  createdAt: Date;
}
```

### API Conventions

**REST Endpoints:**
- Base path: `/api`
- Pluralized resources: `/api/courses`, `/api/users`
- Nested resources: `/api/courses/:id/modules/:moduleId`
- Actions: POST `/api/courses/:id/publish`, POST `/api/courses/:id/regenerate`

**HTTP Methods:**
- GET - Retrieve resources
- POST - Create or trigger actions
- PATCH - Partial updates
- DELETE - Remove resources

**Response Format:**
```typescript
// Success
{
  id: "uuid",
  title: "Course Title",
  // ... entity fields
}

// Error (handled by NestJS exception filters)
{
  statusCode: 400,
  message: "Validation failed",
  error: "Bad Request"
}
```

**Query Parameters:**
- Pagination: `?page=1&limit=10`
- Filtering: `?status=published&search=react`
- Sorting: `?sortBy=createdAt&order=DESC`

### WebSocket Conventions

**Event Naming:**
- Pattern: `{entity}:{action}:{id}`
- Examples: `course:generation:123`, `module:generation:456`

**Event Envelope:**
```typescript
{
  version: 'v1',
  event: 'course:generation:123',
  timestamp: '2025-11-24T10:00:00.000Z',
  payload: {
    courseId: '123',
    status: 'generating',
    progress: 45,
    currentStage: 'Generating module 2 of 5',
    // ... entity-specific fields
  }
}
```

**Subscription Flow:**
```typescript
// Client subscribes
socket.emit('subscribe', {
  event: 'course:generation',
  id: courseId
});

// Server adds to room and confirms
socket.join(`course:generation:${courseId}`);

// Server emits to room
io.to(`course:generation:${courseId}`).emit(
  `course:generation:${courseId}`,
  envelope
);
```

### Error Handling

**Backend:**
- Use NestJS built-in exceptions: `NotFoundException`, `BadRequestException`, `UnauthorizedException`
- Custom exception filter handles formatting
- Validation errors auto-formatted by class-validator

**Frontend:**
- API errors wrapped in `ApiError` class
- Toast notifications for user feedback
- 401 errors trigger auto-logout

**Example:**
```typescript
// Backend
if (!course) {
  throw new NotFoundException(`Course with ID ${id} not found`);
}

// Frontend
try {
  const response = await coursesApi.getCourse(courseId);
  setCourse(response.data);
} catch (error) {
  if (error instanceof ApiError) {
    toast.error(error.message || 'Failed to fetch course');
  }
}
```

---

## Database Schema

### Entity Relationships

```
User
├── courses (1:N)
│
Course
├── owner (N:1 User)
├── modules (1:N Module)
├── quiz (1:1 Quiz)
└── generationTasks (1:N GenerationTask)
│
Module
├── course (N:1 Course)
├── lessons (1:N Lesson)
│
Lesson
├── module (N:1 Module)
│
Quiz
├── course (1:1 Course)
├── questions (1:N Question)
│
Question
├── quiz (N:1 Quiz)
├── answers (1:N Answer)
│
Answer
├── question (N:1 Question)
│
GenerationTask
├── course (N:1 Course)
```

### Key Entities

#### User
```typescript
{
  id: uuid (PK)
  username: string (unique)
  email: string (unique)
  password: string (hashed with bcrypt)
  role: 'user' | 'admin'
  createdAt: timestamp
  updatedAt: timestamp
}
```

#### Course
```typescript
{
  id: uuid (PK)
  title: string
  description: text
  status: 'draft' | 'published' | 'generating' | 'archived'
  prompt: text (original AI prompt)
  ownerId: uuid (FK → User)
  createdAt: timestamp
  updatedAt: timestamp
}
```

#### Module
```typescript
{
  id: uuid (PK)
  title: string
  description: text
  order: integer
  generationStatus: 'pending' | 'generating' | 'completed' | 'failed'
  courseId: uuid (FK → Course)
  createdAt: timestamp
  updatedAt: timestamp
}
```

#### Lesson
```typescript
{
  id: uuid (PK)
  title: string
  content: text (markdown)
  order: integer
  moduleId: uuid (FK → Module)
  createdAt: timestamp
  updatedAt: timestamp
}
```

#### Quiz
```typescript
{
  id: uuid (PK)
  generationStatus: 'pending' | 'generating' | 'completed' | 'failed'
  courseId: uuid (FK → Course)
  createdAt: timestamp
  updatedAt: timestamp
}
```

#### Question
```typescript
{
  id: uuid (PK)
  text: text
  type: 'mcq' | 'single_choice'
  order: integer
  quizId: uuid (FK → Quiz)
  createdAt: timestamp
  updatedAt: timestamp
}
```

#### Answer
```typescript
{
  id: uuid (PK)
  text: string
  isCorrect: boolean
  order: integer
  questionId: uuid (FK → Question)
  createdAt: timestamp
  updatedAt: timestamp
}
```

#### GenerationTask
```typescript
{
  id: uuid (PK)
  entityType: 'course' | 'module' | 'quiz'
  entityId: uuid
  status: 'pending' | 'generating' | 'completed' | 'failed'
  currentStage: string (progress message)
  progress: integer (0-100)
  errorMessage: text (nullable)
  courseId: uuid (FK → Course)
  createdAt: timestamp
  updatedAt: timestamp
}
```

### Migrations

**Location:** `backend/src/database/migrations/`

**Common Commands:**
```bash
# Generate migration from entity changes
npm run migration:generate -- src/database/migrations/MigrationName

# Create empty migration
npm run migration:create -- src/database/migrations/MigrationName

# Run pending migrations
npm run migration:run

# Revert last migration
npm run migration:revert

# Show migration status
npm run migration:show
```

**Example Migration:**
```typescript
// 1763616773544-AddUserRole.ts
export class AddUserRole1763616773544 implements MigrationInterface {
  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `ALTER TABLE "users" ADD "role" character varying NOT NULL DEFAULT 'user'`
    );
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`ALTER TABLE "users" DROP COLUMN "role"`);
  }
}
```

**Best Practices:**
- Always test migrations with `up` and `down`
- Never modify existing migrations in production
- Use transactions for complex migrations
- Synchronize disabled in production (use migrations only)

---

## Backend Architecture

### Module Structure

**Standard NestJS Module Pattern:**
```
feature-name/
├── dto/
│   ├── create-feature.dto.ts
│   └── update-feature.dto.ts
├── entities/
│   └── feature.entity.ts
├── feature.controller.ts
├── feature.service.ts
└── feature.module.ts
```

### Dependency Injection

**Service Registration:**
```typescript
@Module({
  imports: [TypeOrmModule.forFeature([Course, Module, Lesson])],
  controllers: [CoursesController],
  providers: [CoursesService],
  exports: [CoursesService],
})
export class CoursesModule {}
```

**Circular Dependencies:**
```typescript
// Use forwardRef() to break circular imports
@Module({
  imports: [forwardRef(() => AiGenerationModule)],
  // ...
})
export class CoursesModule {}
```

### Authentication Flow

**1. Registration/Login:**
```typescript
// POST /api/auth/register or /api/auth/login
{
  email: "user@example.com",
  password: "password123"
}

// Response
{
  access_token: "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...",
  user: {
    id: "uuid",
    username: "user",
    email: "user@example.com",
    role: "user"
  }
}
```

**2. Protected Routes:**
```typescript
@Controller('courses')
@UseGuards(JwtAuthGuard)  // Applied to entire controller
export class CoursesController {

  @Get()
  findAll(@CurrentUser() user: UserPayload) {
    // user is auto-injected from JWT
    return this.coursesService.findAll(user.sub);
  }

  @Public()  // Override guard for this route
  @Get('public')
  findPublic() {
    return this.coursesService.findPublished();
  }
}
```

**3. Authorization Guards:**
```typescript
// Owner guard ensures user owns the resource
@UseGuards(JwtAuthGuard, OwnerGuard)
@Patch(':id')
updateCourse(
  @Param('id') id: string,
  @Body() updateDto: UpdateCourseDto,
) {
  // Only course owner can update
  return this.coursesService.update(id, updateDto);
}

// Admin guard checks user.role === 'admin'
@UseGuards(JwtAuthGuard, AdminGuard)
@Delete('admin/courses/:id')
adminDeleteCourse(@Param('id') id: string) {
  return this.coursesService.adminDelete(id);
}
```

### AI Generation Pipeline

**Architecture:** Creator-Reviewer Loop with Orchestration

**Flow:**
```
User Request
    ↓
CoursesController.create()
    ↓
AiGenerationService.generateCourseAsync()
    ↓
OrchestratorService.orchestrateCourseGeneration()
    ↓
┌─────────────────────────────────────┐
│  Loop (max 3 attempts):             │
│  1. CreatorAgent.generateFullCourse()│
│  2. ReviewerAgent.reviewCourse()     │
│  3. If score < 50: revise & repeat  │
│  4. If score ≥ 50: accept           │
└─────────────────────────────────────┘
    ↓
Save to Database (Course → Modules → Lessons → Quiz → Questions → Answers)
    ↓
Emit WebSocket completion event
```

**Key Services:**

1. **LLMFactoryService** (`backend/src/ai-generation/llm-factory.service.ts`)
   - Creates LLM instances (OpenAI or Gemini)
   - Configures structured output via Zod schemas
   - Supports switching providers via `LLM_PROVIDER` env var

2. **CreatorAgent** (`backend/src/ai-generation/agents/creator.agent.ts`)
   - Generates content using LLM + prompt templates
   - Methods: `generateFullCourse()`, `generateModule()`, `generateQuiz()`
   - Returns structured output validated against Zod schemas

3. **ReviewerAgent** (`backend/src/ai-generation/agents/reviewer.agent.ts`)
   - Reviews generated content for quality
   - Returns score (0-100) and feedback
   - Can revise content based on feedback

4. **OrchestratorService** (`backend/src/ai-generation/orchestrator.service.ts`)
   - Coordinates Creator-Reviewer loop
   - Quality threshold: 50/100
   - Max 3 attempts before accepting best result
   - Methods mirror CreatorAgent but with review logic

5. **AiGenerationService** (`backend/src/ai-generation/ai-generation.service.ts`)
   - Integrates with database and WebSocket gateway
   - Async methods for non-blocking generation
   - Emits progress updates during generation
   - Handles errors and updates GenerationTask entities

**Progress Updates:**
```typescript
// Example progress event
this.gateway.emitCourseProgress(courseId, {
  courseId,
  status: 'generating',
  progress: 45,
  currentStage: 'Generating module 2 of 5',
  modules: [
    { id: 'uuid', status: 'completed', progress: 100 },
    { id: 'uuid', status: 'generating', progress: 70 },
    { id: 'uuid', status: 'pending', progress: 0 },
  ],
  quiz: { status: 'pending', progress: 0 },
});
```

### WebSocket Implementation

**Gateway:** `CourseGenerationGateway` (`backend/src/websocket/course-generation.gateway.ts`)

**Key Features:**
- JWT authentication on handshake
- Room-based subscriptions (one room per entity)
- Authorization checks (user must own course)
- Snapshot service for late-joiners

**Subscription Flow:**
```typescript
@SubscribeMessage('subscribe')
async handleSubscribe(
  @MessageBody() data: { event: string; id: string },
  @ConnectedSocket() client: AuthenticatedSocket,
) {
  const roomName = `${data.event}:${data.id}`;

  // Verify ownership
  const authorized = await this.verifyAuthorization(client.user, data);
  if (!authorized) {
    return { success: false, error: 'Unauthorized' };
  }

  // Join room
  client.join(roomName);

  // Send current snapshot (if available)
  const snapshot = this.snapshotService.getSnapshot(data.event, data.id);
  if (snapshot) {
    client.emit(roomName, snapshot);
  }

  return { success: true, room: roomName };
}
```

**Emitting Progress:**
```typescript
// From AI service
emitCourseProgress(courseId: string, payload: CourseGenerationPayload) {
  const envelope: EventEnvelope<CourseGenerationPayload> = {
    version: 'v1',
    event: `course:generation:${courseId}`,
    timestamp: new Date().toISOString(),
    payload,
  };

  // Emit to all clients in room
  this.server
    .to(`course:generation:${courseId}`)
    .emit(`course:generation:${courseId}`, envelope);

  // Store snapshot for late-joiners
  this.snapshotService.setSnapshot('course:generation', courseId, envelope);
}
```

**Snapshot Recovery:**
```typescript
// REST endpoint for late-joiners
@Get('snapshot')
getSnapshot(
  @Query('event') event: string,
  @Query('id') id: string,
) {
  return this.snapshotService.getSnapshot(event, id);
}
```

---

## Frontend Architecture

### Component Hierarchy

```
App (AuthProvider + SocketProvider)
├── MainLayout
│   ├── Header (navigation + user menu)
│   ├── Sidebar (course navigation)
│   └── <Outlet> (route content)
│
├── ProtectedRoute
│   ├── CourseList
│   │   ├── CourseCard (multiple)
│   │   └── GenerationStatus (if generating)
│   ├── CourseDetail
│   │   ├── GenerationStatus (if generating)
│   │   ├── ModuleCard (multiple)
│   │   │   └── LessonCard (multiple)
│   │   └── QuizSection
│   │       └── QuestionForm (multiple)
│   └── CreateCourse
│       └── CourseForm
│
└── GuestRoute
    ├── Login
    └── Signup
```

### State Management

**1. AuthContext (Global Auth State)**

Location: `frontend/src/context/AuthContext.tsx`

```typescript
interface AuthContextType {
  user: User | null;
  token: string | null;
  isAuthenticated: boolean;
  isLoading: boolean;
  login: (email: string, password: string) => Promise<void>;
  register: (username: string, email: string, password: string) => Promise<void>;
  logout: () => void;
}

// Usage
const { user, isAuthenticated, login, logout } = useAuth();
```

**Auto-logout on 401:**
- API client intercepts 401 responses
- Clears token from localStorage
- Redirects to /login

**2. Zustand Store (WebSocket Events)**

Location: `frontend/src/websocket/store/generation-store.ts`

```typescript
interface GenerationStore {
  channels: Record<string, EventEnvelope<any>>;
  setChannel: (channel: string, data: EventEnvelope<any>) => void;
  removeChannel: (channel: string) => void;
  getSnapshot: (channel: string) => any;
}

// Usage
const snapshot = useGenerationStore((state) =>
  state.getSnapshot(`course:generation:${courseId}`)
);
```

**3. Component State (Local UI State)**

```typescript
// Example: CourseDetail page
const [course, setCourse] = useState<Course | null>(null);
const [isEditing, setIsEditing] = useState(false);
const [activeTab, setActiveTab] = useState<'modules' | 'quiz'>('modules');
```

### API Client

**Structure:** Apisauce (axios wrapper) with interceptors

Location: `frontend/src/services/api.ts`

**Configuration:**
```typescript
const api = apisauce.create({
  baseURL: import.meta.env.VITE_API_BASE_URL,
  headers: {
    'Content-Type': 'application/json',
  },
  timeout: 30000,
});

// Request interceptor: Add JWT token
api.addRequestTransform((request) => {
  const token = localStorage.getItem('token');
  if (token) {
    request.headers['Authorization'] = `Bearer ${token}`;
  }
});

// Response interceptor: Handle 401, transform data
api.addResponseTransform((response) => {
  if (response.status === 401) {
    localStorage.removeItem('token');
    window.location.href = '/login';
  }
  // Transform snake_case to camelCase
  response.data = transformKeys(response.data, camelCase);
});
```

**API Modules:**
```typescript
// courses
export const coursesApi = {
  getCourses: (params) => api.get('/courses', params),
  getCourse: (id) => api.get(`/courses/${id}`),
  createCourse: (data) => api.post('/courses', data),
  updateCourse: (id, data) => api.patch(`/courses/${id}`, data),
  deleteCourse: (id) => api.delete(`/courses/${id}`),
  publishCourse: (id) => api.post(`/courses/${id}/publish`),
  regenerateCourse: (id) => api.post(`/courses/${id}/regenerate`),
};

// modules
export const modulesApi = {
  regenerateModule: (courseId, moduleId) =>
    api.post(`/courses/${courseId}/modules/${moduleId}/regenerate`),
  updateModule: (courseId, moduleId, data) =>
    api.patch(`/courses/${courseId}/modules/${moduleId}`, data),
};

// etc.
```

### WebSocket Client

**SocketProvider:** `frontend/src/websocket/core/SocketProvider.tsx`

**Setup:**
```typescript
const socket = io(WS_BASE_URL, {
  auth: { token: localStorage.getItem('token') },
  autoConnect: true,
  reconnection: true,
  reconnectionDelay: 1000,
  reconnectionAttempts: 5,
});

// Listen to all events and update Zustand store
socket.onAny((eventName, data) => {
  if (eventName.includes(':generation:')) {
    useGenerationStore.getState().setChannel(eventName, data);
  }
});

// Replay subscriptions on reconnect
socket.on('connect', () => {
  subscriptions.forEach(sub => {
    socket.emit('subscribe', sub);
  });
});
```

**Custom Hooks:**

1. **useCourseGeneration** (`frontend/src/websocket/hooks/useCourseGeneration.ts`)
```typescript
export function useCourseGeneration(courseId: string) {
  const { socket, isConnected } = useSocket();
  const channel = `course:generation:${courseId}`;

  // Subscribe to course generation events
  useSocketSubscription(channel, courseId, isConnected, socket);

  // Return latest snapshot from store
  return useGenerationStore((state) => state.getSnapshot(channel));
}
```

2. **useModuleGeneration** (similar pattern for modules)

3. **useQuizGeneration** (similar pattern for quizzes)

**Usage in Component:**
```typescript
function CourseDetail() {
  const { id } = useParams();
  const generationData = useCourseGeneration(id);

  if (generationData?.payload?.status === 'generating') {
    return <GenerationStatus data={generationData.payload} />;
  }

  return <CourseContent courseId={id} />;
}
```

### Routing

**Configuration:** `frontend/src/App.tsx`

```typescript
<Routes>
  <Route element={<MainLayout />}>
    {/* Protected routes */}
    <Route element={<ProtectedRoute />}>
      <Route path="/" element={<CourseList />} />
      <Route path="/courses/create" element={<CreateCourse />} />
      <Route path="/courses/:id" element={<CourseDetail />} />
    </Route>

    {/* Guest routes */}
    <Route element={<GuestRoute />}>
      <Route path="/login" element={<Login />} />
      <Route path="/signup" element={<Signup />} />
    </Route>
  </Route>

  {/* Catch-all redirect */}
  <Route path="*" element={<Navigate to="/" replace />} />
</Routes>
```

**Route Guards:**
- `ProtectedRoute` - Redirects to /login if not authenticated
- `GuestRoute` - Redirects to / if authenticated

---

## Common Development Tasks

### Adding a New API Endpoint

**1. Backend:**
```typescript
// courses.controller.ts
@Post(':id/duplicate')
@UseGuards(JwtAuthGuard, OwnerGuard)
async duplicateCourse(
  @Param('id') id: string,
  @CurrentUser() user: UserPayload,
) {
  return this.coursesService.duplicate(id, user.sub);
}

// courses.service.ts
async duplicate(courseId: string, userId: string): Promise<Course> {
  const original = await this.courseRepository.findOne({
    where: { id: courseId },
    relations: ['modules', 'modules.lessons', 'quiz', 'quiz.questions', 'quiz.questions.answers'],
  });

  if (!original) {
    throw new NotFoundException('Course not found');
  }

  // Create deep copy
  const duplicate = this.courseRepository.create({
    ...original,
    id: undefined,
    title: `${original.title} (Copy)`,
    ownerId: userId,
    status: CourseStatus.DRAFT,
  });

  return this.courseRepository.save(duplicate);
}
```

**2. Frontend:**
```typescript
// services/api.ts
export const coursesApi = {
  // ... existing methods
  duplicateCourse: (id: string) => api.post(`/courses/${id}/duplicate`),
};

// components/CourseCard.tsx
const handleDuplicate = async () => {
  try {
    const response = await coursesApi.duplicateCourse(course.id);
    if (response.ok) {
      toast.success('Course duplicated successfully');
      navigate(`/courses/${response.data.id}`);
    }
  } catch (error) {
    toast.error('Failed to duplicate course');
  }
};
```

### Adding a New Entity

**1. Create Entity:**
```typescript
// backend/src/courses/entities/section.entity.ts
import { Entity, Column, PrimaryGeneratedColumn, ManyToOne, JoinColumn } from 'typeorm';
import { Module } from './module.entity';

@Entity('sections')
export class Section {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ length: 255 })
  title: string;

  @Column('text')
  content: string;

  @Column({ type: 'int', default: 0 })
  order: number;

  @ManyToOne(() => Module, (module) => module.sections)
  @JoinColumn({ name: 'module_id' })
  module: Module;

  @Column({ name: 'module_id' })
  moduleId: string;

  @CreateDateColumn({ name: 'created_at' })
  createdAt: Date;

  @UpdateDateColumn({ name: 'updated_at' })
  updatedAt: Date;
}
```

**2. Update Related Entity:**
```typescript
// module.entity.ts
@OneToMany(() => Section, (section) => section.module)
sections: Section[];
```

**3. Generate Migration:**
```bash
npm run migration:generate -- src/database/migrations/AddSectionEntity
npm run migration:run
```

**4. Create DTO:**
```typescript
// dto/create-section.dto.ts
import { IsString, IsInt, IsUUID } from 'class-validator';

export class CreateSectionDto {
  @IsString()
  title: string;

  @IsString()
  content: string;

  @IsInt()
  order: number;

  @IsUUID()
  moduleId: string;
}
```

**5. Update Service:**
```typescript
// courses.service.ts
@InjectRepository(Section)
private sectionRepository: Repository<Section>;

async createSection(dto: CreateSectionDto): Promise<Section> {
  const section = this.sectionRepository.create(dto);
  return this.sectionRepository.save(section);
}
```

### Adding a WebSocket Event

**1. Define Payload Type:**
```typescript
// backend/src/websocket/contracts/payloads.ts
export interface SectionGenerationPayload {
  sectionId: string;
  moduleId: string;
  courseId: string;
  status: GenerationStatus;
  progress: number;
  currentStage: string;
}
```

**2. Emit from Service:**
```typescript
// ai-generation.service.ts
async generateSectionAsync(sectionId: string) {
  try {
    this.gateway.emitSectionProgress(sectionId, {
      sectionId,
      moduleId: section.moduleId,
      courseId: section.module.courseId,
      status: 'generating',
      progress: 50,
      currentStage: 'Generating content...',
    });

    // Generate content
    const content = await this.orchestrator.orchestrateSectionGeneration(section);

    // Save and emit completion
    await this.sectionRepository.update(sectionId, { content });
    this.gateway.emitSectionProgress(sectionId, {
      sectionId,
      moduleId: section.moduleId,
      courseId: section.module.courseId,
      status: 'completed',
      progress: 100,
      currentStage: 'Completed',
    });
  } catch (error) {
    this.gateway.emitSectionProgress(sectionId, {
      sectionId,
      moduleId: section.moduleId,
      courseId: section.module.courseId,
      status: 'failed',
      progress: 0,
      currentStage: error.message,
    });
  }
}
```

**3. Add Gateway Method:**
```typescript
// course-generation.gateway.ts
emitSectionProgress(sectionId: string, payload: SectionGenerationPayload) {
  const envelope = this.createEnvelope(`section:generation:${sectionId}`, payload);
  this.server.to(`section:generation:${sectionId}`).emit(`section:generation:${sectionId}`, envelope);
  this.snapshotService.setSnapshot('section:generation', sectionId, envelope);
}
```

**4. Frontend Hook:**
```typescript
// frontend/src/websocket/hooks/useSectionGeneration.ts
export function useSectionGeneration(sectionId: string) {
  const { socket, isConnected } = useSocket();
  const channel = `section:generation:${sectionId}`;

  useSocketSubscription(channel, sectionId, isConnected, socket);

  return useGenerationStore((state) => state.getSnapshot(channel));
}
```

**5. Use in Component:**
```typescript
function SectionCard({ sectionId }: { sectionId: string }) {
  const generationData = useSectionGeneration(sectionId);

  if (generationData?.payload?.status === 'generating') {
    return <Progress value={generationData.payload.progress} />;
  }

  return <SectionContent sectionId={sectionId} />;
}
```

### Running Database Migrations

**Generate from entity changes:**
```bash
cd backend
npm run migration:generate -- src/database/migrations/DescriptiveName
# Review generated migration in src/database/migrations/
npm run migration:run
```

**Create empty migration:**
```bash
npm run migration:create -- src/database/migrations/CustomLogic
# Edit migration file to add custom SQL
npm run migration:run
```

**Revert last migration:**
```bash
npm run migration:revert
```

**Check migration status:**
```bash
npm run migration:show
```

### Adding Environment Variables

**1. Backend:**
```typescript
// backend/src/config/env.validation.ts
export class EnvironmentVariables {
  // ... existing vars

  @IsString()
  NEW_FEATURE_API_KEY: string;

  @IsOptional()
  @IsString()
  NEW_FEATURE_ENDPOINT?: string;
}

// backend/src/config/configuration.ts
export default () => ({
  // ... existing config
  newFeature: {
    apiKey: process.env.NEW_FEATURE_API_KEY,
    endpoint: process.env.NEW_FEATURE_ENDPOINT || 'https://default-endpoint.com',
  },
});
```

**2. Update .env.example:**
```bash
# New Feature Configuration
NEW_FEATURE_API_KEY=your-api-key
NEW_FEATURE_ENDPOINT=https://api.example.com
```

**3. Frontend (compile-time only):**
```typescript
// frontend/vite.config.ts
export default defineConfig({
  define: {
    'import.meta.env.VITE_NEW_FEATURE': JSON.stringify(process.env.VITE_NEW_FEATURE),
  },
});

// Usage
const newFeature = import.meta.env.VITE_NEW_FEATURE;
```

**4. Update .env.example:**
```bash
VITE_NEW_FEATURE=enabled
```

**Important**: Frontend env vars require rebuild!

### Debugging WebSocket Issues

**Backend:**
```typescript
// Enable Socket.IO debug logs
// backend/src/main.ts
import * as debugModule from 'debug';
debugModule.enable('socket.io:*');

// Log all WebSocket events
// course-generation.gateway.ts
@WebSocketGateway({ namespace: '/ws', cors: true })
export class CourseGenerationGateway {
  private logger = new Logger('CourseGenerationGateway');

  handleConnection(client: Socket) {
    this.logger.log(`Client connected: ${client.id}`);
  }

  handleDisconnect(client: Socket) {
    this.logger.log(`Client disconnected: ${client.id}`);
  }

  @SubscribeMessage('subscribe')
  handleSubscribe(@MessageBody() data: any, @ConnectedSocket() client: Socket) {
    this.logger.log(`Subscribe: ${JSON.stringify(data)} from ${client.id}`);
    // ... rest of implementation
  }
}
```

**Frontend:**
```typescript
// frontend/src/websocket/core/socket-manager.ts
const socket = io(WS_BASE_URL, {
  auth: { token },
  autoConnect: true,
  reconnection: true,

  // Enable debug logs in console
  transports: ['websocket', 'polling'],
});

// Log all events
socket.onAny((eventName, ...args) => {
  console.log('[WebSocket]', eventName, args);
});

socket.on('connect', () => {
  console.log('[WebSocket] Connected:', socket.id);
});

socket.on('disconnect', (reason) => {
  console.log('[WebSocket] Disconnected:', reason);
});

socket.on('connect_error', (error) => {
  console.error('[WebSocket] Connection error:', error);
});
```

**Common Issues:**
- **401 on handshake**: JWT token missing or invalid
- **No events received**: Not subscribed to correct room, or authorization failed
- **Stale data**: Snapshot not updated, check `snapshotService.setSnapshot()` calls
- **Connection drops**: Check CORS settings, firewall rules, reverse proxy config

---

## Testing Strategy

### Current State

**Backend:**
- Framework: Jest 30
- Test files: `*.spec.ts` (unit tests), `*.e2e-spec.ts` (E2E tests)
- Coverage: Minimal (mostly scaffolding)
- E2E: Configured but not implemented

**Frontend:**
- No test framework configured
- No test files exist

### Recommended Testing Approach

**Backend Unit Tests:**
```typescript
// courses.service.spec.ts
describe('CoursesService', () => {
  let service: CoursesService;
  let repository: Repository<Course>;

  beforeEach(async () => {
    const module = await Test.createTestingModule({
      providers: [
        CoursesService,
        {
          provide: getRepositoryToken(Course),
          useClass: Repository,
        },
      ],
    }).compile();

    service = module.get<CoursesService>(CoursesService);
    repository = module.get<Repository<Course>>(getRepositoryToken(Course));
  });

  describe('findAll', () => {
    it('should return an array of courses', async () => {
      const courses = [{ id: '1', title: 'Test Course' }] as Course[];
      jest.spyOn(repository, 'find').mockResolvedValue(courses);

      const result = await service.findAll();
      expect(result).toEqual(courses);
      expect(repository.find).toHaveBeenCalled();
    });
  });
});
```

**Backend E2E Tests:**
```typescript
// courses.e2e-spec.ts
describe('CoursesController (e2e)', () => {
  let app: INestApplication;
  let authToken: string;

  beforeAll(async () => {
    const moduleFixture = await Test.createTestingModule({
      imports: [AppModule],
    }).compile();

    app = moduleFixture.createNestApplication();
    await app.init();

    // Login to get token
    const response = await request(app.getHttpServer())
      .post('/api/auth/login')
      .send({ email: 'test@example.com', password: 'password' });
    authToken = response.body.access_token;
  });

  it('/api/courses (GET)', () => {
    return request(app.getHttpServer())
      .get('/api/courses')
      .set('Authorization', `Bearer ${authToken}`)
      .expect(200)
      .expect((res) => {
        expect(Array.isArray(res.body)).toBe(true);
      });
  });

  afterAll(async () => {
    await app.close();
  });
});
```

**Frontend Testing Setup (Recommended):**
```bash
cd frontend
npm install -D vitest @testing-library/react @testing-library/jest-dom happy-dom
```

```typescript
// vite.config.ts
import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

export default defineConfig({
  plugins: [react()],
  test: {
    globals: true,
    environment: 'happy-dom',
    setupFiles: './src/test/setup.ts',
  },
});

// src/test/setup.ts
import '@testing-library/jest-dom';

// Component test example
// src/components/CourseCard.test.tsx
import { render, screen } from '@testing-library/react';
import { CourseCard } from './CourseCard';

describe('CourseCard', () => {
  it('renders course title', () => {
    const course = { id: '1', title: 'Test Course', status: 'published' };
    render(<CourseCard course={course} />);
    expect(screen.getByText('Test Course')).toBeInTheDocument();
  });
});
```

**Run Tests:**
```bash
# Backend unit tests
cd backend
npm test

# Backend E2E tests
npm run test:e2e

# Backend test coverage
npm run test:cov

# Frontend tests (once configured)
cd frontend
npm test
```

---

## Deployment

### Docker Compose (Full Stack)

**Production Deployment:**
```bash
# 1. Clone repository
git clone <repo-url> && cd CourseCraft

# 2. Configure environment
cp .env.example .env
# Edit .env with production values:
# - Strong DATABASE_PASSWORD
# - Strong JWT_SECRET
# - Production OPENAI_API_KEY
# - Production domain for CORS_ORIGIN

# 3. Build and start
docker compose up -d --build

# 4. Check status
docker compose ps
docker compose logs -f backend
docker compose logs -f frontend

# 5. Run migrations (if needed)
docker compose exec backend npm run migration:run
```

**Update Deployment:**
```bash
# Pull latest code
git pull origin main

# Rebuild changed services
docker compose build backend frontend
docker compose up -d

# Or rebuild specific service
docker compose up -d --build backend
```

**Backup Database:**
```bash
# Export PostgreSQL data
docker compose exec db pg_dump -U postgres coursecraft > backup.sql

# Restore
docker compose exec -T db psql -U postgres coursecraft < backup.sql
```

### Backend Only (Node.js)

**Server Requirements:**
- Node.js 20+
- PostgreSQL 16
- Nginx or Apache (reverse proxy)

**Setup:**
```bash
# 1. Clone and install
git clone <repo-url> && cd CourseCraft/backend
npm install

# 2. Configure environment
cp .env.example .env
# Edit .env with production values

# 3. Build
npm run build

# 4. Run migrations
npm run migration:run

# 5. Start production server
npm run start:prod
```

**Process Manager (PM2):**
```bash
npm install -g pm2

# Start
pm2 start dist/main.js --name coursecraft-api

# Auto-restart on reboot
pm2 startup
pm2 save

# Monitor
pm2 logs coursecraft-api
pm2 status
```

**Nginx Reverse Proxy:**
```nginx
# /etc/nginx/sites-available/coursecraft
server {
    listen 80;
    server_name api.coursecraft.com;

    location / {
        proxy_pass http://localhost:3000;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host $host;
        proxy_cache_bypass $http_upgrade;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
    }

    # WebSocket support
    location /ws/ {
        proxy_pass http://localhost:3000;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection "upgrade";
        proxy_read_timeout 86400;
    }
}
```

### Frontend Only (Static Site)

**Build:**
```bash
cd frontend
cp .env.example .env
# Edit VITE_API_BASE_URL and VITE_WS_BASE_URL to production URLs

npm install
npm run build
# Output: dist/
```

**Deploy to Nginx:**
```nginx
# /etc/nginx/sites-available/coursecraft-frontend
server {
    listen 80;
    server_name coursecraft.com;
    root /var/www/coursecraft/dist;
    index index.html;

    location / {
        try_files $uri $uri/ /index.html;
    }

    # Cache static assets
    location ~* \.(js|css|png|jpg|jpeg|gif|ico|svg|woff|woff2)$ {
        expires 1y;
        add_header Cache-Control "public, immutable";
    }
}
```

**Deploy to CDN (Vercel/Netlify):**
```bash
# Vercel
npm install -g vercel
cd frontend
vercel --prod

# Netlify
npm install -g netlify-cli
cd frontend
npm run build
netlify deploy --prod --dir=dist
```

**Environment Variables (Vercel/Netlify):**
- Set `VITE_API_BASE_URL` and `VITE_WS_BASE_URL` in dashboard
- Rebuild after changing env vars

---

## Critical Files Reference

### Backend

| File | Purpose |
|------|---------|
| `src/main.ts` | Application bootstrap, middleware, Swagger setup |
| `src/app.module.ts` | Root module, imports all feature modules |
| `src/config/configuration.ts` | Environment variable configuration |
| `src/config/env.validation.ts` | Environment variable validation (class-validator) |
| `src/database/data-source.ts` | TypeORM data source configuration |
| `src/database/migrations/` | Database migrations |
| `src/auth/strategies/jwt.strategy.ts` | JWT authentication strategy |
| `src/auth/guards/jwt-auth.guard.ts` | JWT guard with @Public() support |
| `src/courses/courses.service.ts` | Course CRUD operations |
| `src/courses/courses.controller.ts` | Course REST API endpoints |
| `src/courses/entities/*.entity.ts` | TypeORM entities |
| `src/ai-generation/orchestrator.service.ts` | Creator-Reviewer loop orchestration |
| `src/ai-generation/ai-generation.service.ts` | AI service with DB + WebSocket |
| `src/ai-generation/agents/creator.agent.ts` | Content generation with LLM |
| `src/ai-generation/agents/reviewer.agent.ts` | Content quality review |
| `src/ai-generation/prompts/templates.ts` | LLM prompt templates |
| `src/ai-generation/schemas/*.ts` | Zod schemas for structured output |
| `src/websocket/course-generation.gateway.ts` | WebSocket gateway (Socket.IO) |
| `src/websocket/snapshot.service.ts` | Snapshot storage for late-joiners |
| `src/common/decorators/current-user.decorator.ts` | @CurrentUser() decorator |
| `src/common/filters/http-exception.filter.ts` | Global exception filter |

### Frontend

| File | Purpose |
|------|---------|
| `src/main.tsx` | React entry point, renders <App /> |
| `src/App.tsx` | Routes, AuthProvider, SocketProvider |
| `src/context/AuthContext.tsx` | Global authentication state |
| `src/services/api.ts` | API client (Apisauce), interceptors |
| `src/websocket/core/SocketProvider.tsx` | WebSocket provider, subscription management |
| `src/websocket/core/socket-manager.ts` | Socket.IO client instance |
| `src/websocket/store/generation-store.ts` | Zustand store for WebSocket events |
| `src/websocket/hooks/*.ts` | WebSocket subscription hooks |
| `src/pages/CourseList.tsx` | Course listing page |
| `src/pages/CourseDetail.tsx` | Course detail page (modules + quiz) |
| `src/pages/CreateCourse.tsx` | Course creation form |
| `src/components/auth/ProtectedRoute.tsx` | Route guard for authenticated users |
| `src/components/course/GenerationStatus.tsx` | Real-time generation progress UI |
| `src/components/layout/MainLayout.tsx` | Page wrapper with header + sidebar |
| `vite.config.ts` | Vite build configuration |
| `tailwind.config.js` | Tailwind CSS configuration |

### Configuration

| File | Purpose |
|------|---------|
| `.env.example` | Environment variables template (root) |
| `docker-compose.yml` | Full stack orchestration |
| `backend/Dockerfile` | Backend Docker image (multi-stage) |
| `frontend/Dockerfile` | Frontend Docker image (multi-stage) |
| `frontend/nginx.conf` | Nginx configuration for production |
| `backend/tsconfig.json` | Backend TypeScript configuration |
| `frontend/tsconfig.json` | Frontend TypeScript configuration |
| `backend/nest-cli.json` | NestJS CLI configuration |
| `backend/package.json` | Backend dependencies + scripts |
| `frontend/package.json` | Frontend dependencies + scripts |

---

## Troubleshooting

### Backend Issues

**Problem: Backend fails to start with database connection error**
```
Error: connect ECONNREFUSED 127.0.0.1:5432
```
**Solution:**
- Check PostgreSQL is running: `docker compose ps` or `systemctl status postgresql`
- Verify `DATABASE_HOST`, `DATABASE_PORT`, `DATABASE_USERNAME`, `DATABASE_PASSWORD` in `.env`
- For Docker: ensure `DATABASE_HOST=db` (service name in compose)
- For local: ensure `DATABASE_HOST=localhost` and PostgreSQL is accessible

**Problem: Migrations fail with "relation already exists"**
```
Error: relation "courses" already exists
```
**Solution:**
- Check migration status: `npm run migration:show`
- If out of sync, reset database: `docker compose down -v` (destroys data!)
- Or manually revert: `npm run migration:revert` until clean
- Then re-run: `npm run migration:run`

**Problem: AI generation fails with "API key invalid"**
```
Error: OpenAI API key is invalid
```
**Solution:**
- Verify `OPENAI_API_KEY` in `.env` is valid
- Check API key has credits: https://platform.openai.com/usage
- Try alternative provider: set `LLM_PROVIDER=gemini` and `GEMINI_API_KEY`

**Problem: WebSocket authentication fails**
```
Error: Unauthorized (401) on WebSocket handshake
```
**Solution:**
- Check JWT token is sent in `auth` parameter during connection
- Verify token is not expired (check `JWT_EXPIRES_IN` in `.env`)
- Ensure `JwtAuthGuard` is not blocking WebSocket connections

### Frontend Issues

**Problem: Frontend cannot reach backend API**
```
Error: Network Error (axios)
```
**Solution:**
- Check `VITE_API_BASE_URL` in `.env` points to correct backend URL
- For Docker: should be `http://backend:3000/api` (internal network)
- For local dev: should be `http://localhost:3000/api`
- Verify CORS settings in backend `.env`: `CORS_ORIGIN` matches frontend URL
- Rebuild frontend after changing env vars: `docker compose build frontend`

**Problem: WebSocket connection fails**
```
Error: WebSocket connection failed (browser console)
```
**Solution:**
- Check `VITE_WS_BASE_URL` in `.env`
- For Docker: `ws://backend:3000`
- For local dev: `ws://localhost:3000`
- Verify `SOCKET_IO_CORS_ORIGIN` in backend `.env` matches frontend URL
- Check browser console for CORS errors

**Problem: 401 error on all API requests**
```
Error: Unauthorized (401)
```
**Solution:**
- Check JWT token in localStorage: `localStorage.getItem('token')`
- Token may be expired, try logging out and back in
- Verify `Authorization` header is set in API requests: `Bearer <token>`
- Check API client interceptor is adding token correctly

**Problem: Stale data after generation**
```
Generated content not showing up in UI
```
**Solution:**
- Check WebSocket connection is established: `useSocket().isConnected`
- Verify subscription to correct channel: `useCourseGeneration(courseId)`
- Check Zustand store has data: `useGenerationStore().channels`
- Refresh page to fetch latest data from API
- Check backend logs for errors during generation

### Docker Issues

**Problem: Port already in use**
```
Error: Bind for 0.0.0.0:3000 failed: port is already allocated
```
**Solution:**
- Change port in `.env`: `BACKEND_PORT=3001`
- Or stop conflicting service: `lsof -ti:3000 | xargs kill`

**Problem: Out of disk space**
```
Error: no space left on device
```
**Solution:**
- Clean Docker resources: `docker system prune -a --volumes`
- Remove old images: `docker image prune -a`
- Check disk usage: `df -h`

**Problem: Container keeps restarting**
```
backend_1 exited with code 1
```
**Solution:**
- Check logs: `docker compose logs backend`
- Common causes: missing env vars, database connection failure
- Verify `.env` has all required variables from `.env.example`

---

## Additional Resources

### Documentation
- **NestJS**: https://docs.nestjs.com/
- **TypeORM**: https://typeorm.io/
- **LangChain**: https://js.langchain.com/
- **Socket.IO**: https://socket.io/docs/v4/
- **React**: https://react.dev/
- **Vite**: https://vite.dev/
- **Tailwind CSS**: https://tailwindcss.com/

### API Documentation
- **Swagger UI**: http://localhost:3000/api/docs (when backend running)
- **OpenAI API**: https://platform.openai.com/docs/
- **Gemini API**: https://ai.google.dev/docs

### Development Tools
- **Postman Collection**: (Create one for API testing)
- **TypeORM CLI**: https://typeorm.io/using-cli
- **Docker Compose**: https://docs.docker.com/compose/

---

## Changelog

### Version 1.0.0 (2025-11-24)
- Initial CLAUDE.md creation
- Comprehensive codebase documentation
- Architecture overview
- Development workflows
- Testing strategy
- Deployment guide

---

## Contributing Guidelines for AI Assistants

When working on this codebase:

1. **Always read files before editing** - Never propose changes to code you haven't read
2. **Use TypeScript strictly** - Avoid `any`, use explicit types
3. **Follow naming conventions** - Match existing patterns (kebab-case files, PascalCase classes)
4. **Test changes locally** - Run `npm run start:dev` and verify functionality
5. **Update migrations** - Generate migrations after entity changes
6. **Maintain WebSocket contracts** - Keep event payloads consistent between backend and frontend
7. **Handle errors gracefully** - Use NestJS exceptions, toast notifications
8. **Document new features** - Update this CLAUDE.md when adding major features
9. **Avoid over-engineering** - Keep solutions simple and focused
10. **Security first** - Never commit secrets, validate user input, check authorization

**Key Principles:**
- **Separation of concerns**: Keep AI logic in `ai-generation/`, database in `courses/`, WebSocket in `websocket/`
- **Async by default**: AI generation is non-blocking, progress via WebSocket
- **Type safety**: Zod schemas for AI output, TypeScript interfaces everywhere
- **Authorization**: Always check ownership before mutations
- **Error recovery**: WebSocket snapshots for late-joiners, retry logic for API calls

---

**Last Updated:** 2025-11-24
**Maintained By:** AI Assistant (Claude)
**Repository:** prashg008/CourseCraft
