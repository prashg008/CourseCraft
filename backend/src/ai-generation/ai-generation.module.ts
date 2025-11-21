import { Module, forwardRef } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { AiGenerationService } from './ai-generation.service';
import { CoursesModule } from '../courses/courses.module';
import { WebsocketModule } from '../websocket/websocket.module';
import { CreatorAgent } from './agents/creator.agent';
import { ReviewerAgent } from './agents/reviewer.agent';
import { OrchestratorService } from './orchestrator.service';
import { LLMFactoryService } from './llm-factory.service';
import { Course } from '../courses/entities/course.entity';
import { Module as CourseModule } from '../courses/entities/module.entity';
import { Lesson } from '../courses/entities/lesson.entity';
import { Quiz } from '../courses/entities/quiz.entity';
import { Question } from '../courses/entities/question.entity';
import { Answer } from '../courses/entities/answer.entity';

@Module({
  imports: [
    forwardRef(() => CoursesModule),
    WebsocketModule,
    TypeOrmModule.forFeature([Course, CourseModule, Lesson, Quiz, Question, Answer]),
  ],
  providers: [
    AiGenerationService,
    LLMFactoryService,
    CreatorAgent,
    ReviewerAgent,
    OrchestratorService,
  ],
  exports: [AiGenerationService, CreatorAgent, ReviewerAgent, OrchestratorService],
})
export class AiGenerationModule {}
