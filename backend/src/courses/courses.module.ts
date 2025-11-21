import { Module, forwardRef } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { Course } from './entities/course.entity';
import { Module as CourseModule } from './entities/module.entity';
import { Lesson } from './entities/lesson.entity';
import { Quiz } from './entities/quiz.entity';
import { Question } from './entities/question.entity';
import { Answer } from './entities/answer.entity';
import { CoursesController } from './courses.controller';
import { QuestionsController } from './questions.controller';
import { CoursesService } from './courses.service';
import { AiGenerationModule } from '../ai-generation/ai-generation.module';

@Module({
  imports: [
    TypeOrmModule.forFeature([Course, CourseModule, Lesson, Quiz, Question, Answer]),
    forwardRef(() => AiGenerationModule),
  ],
  controllers: [CoursesController, QuestionsController],
  providers: [CoursesService],
  exports: [TypeOrmModule, CoursesService],
})
export class CoursesModule {}
