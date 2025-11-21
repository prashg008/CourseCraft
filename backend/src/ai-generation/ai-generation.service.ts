import { Injectable, Logger } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { In, Repository } from 'typeorm';
import { OrchestratorService } from './orchestrator.service';
import { Course, CourseStatus } from '../courses/entities/course.entity';
import { Module as CourseModule } from '../courses/entities/module.entity';
import { Lesson } from '../courses/entities/lesson.entity';
import { Quiz } from '../courses/entities/quiz.entity';
import { Question, QuestionType } from '../courses/entities/question.entity';
import { Answer } from '../courses/entities/answer.entity';
import { CourseGenerationGateway } from '../websocket/course-generation.gateway';
import { on } from 'events';

@Injectable()
export class AiGenerationService {
  private readonly logger = new Logger(AiGenerationService.name);

  constructor(
    private readonly orchestratorService: OrchestratorService,
    private readonly gateway: CourseGenerationGateway,
    @InjectRepository(Course)
    private readonly courseRepository: Repository<Course>,
    @InjectRepository(CourseModule)
    private readonly moduleRepository: Repository<CourseModule>,
    @InjectRepository(Lesson)
    private readonly lessonRepository: Repository<Lesson>,
    @InjectRepository(Quiz)
    private readonly quizRepository: Repository<Quiz>,
    @InjectRepository(Question)
    private readonly questionRepository: Repository<Question>,
    @InjectRepository(Answer)
    private readonly answerRepository: Repository<Answer>,
  ) {}

  /**
   * Generate course content asynchronously without blocking the response
   */
  generateCourseAsync(
    courseId: string,
    title: string,
    description: string,
    _userId: string,
  ): { courseId: string; status: string } {
    this.logger.log(`generateCourseAsync called for course ${courseId}`);

    // Fire and forget - start generation in background
    this.processCourseGeneration(courseId, title, description).catch((error) => {
      const message = this.extractErrorMessage(error);
      const stack = error instanceof Error ? error.stack : undefined;
      this.logger.error(`Unhandled error in processCourseGeneration: ${message}`, stack);
    });

    return {
      courseId,
      status: 'generating',
    };
  }

  /**
   * Regenerate a specific module asynchronously
   */
  regenerateModuleAsync(
    courseId: string,
    moduleId: string,
    userId: string,
    feedback?: string,
  ): { moduleId: string; status: string } {
    // Fire and forget - start regeneration in background
    this.processModuleRegeneration(courseId, moduleId, feedback).catch((error) => {
      const message = this.extractErrorMessage(error);
      this.logger.error(`Unhandled error in processModuleRegeneration: ${message}`);
    });

    return {
      moduleId,
      status: 'generating',
    };
  }

  /**
   * Regenerate quiz asynchronously
   */
  regenerateQuizAsync(
    courseId: string,
    userId: string,
    feedback?: string,
  ): { courseId: string; status: string } {
    // Fire and forget - start regeneration in background
    this.processQuizRegeneration(courseId, feedback).catch((error) => {
      const message = this.extractErrorMessage(error);
      this.logger.error(`Unhandled error in processQuizRegeneration: ${message}`);
    });

    return {
      courseId,
      status: 'generating',
    };
  }

  /**
   * Process course generation (runs in background)
   */
  private async processCourseGeneration(
    courseId: string,
    title: string,
    description: string,
  ): Promise<void> {
    this.logger.log(`Starting course generation for course ${courseId}`);

    try {
      // Update progress
      this.gateway.emitCourseProgress(courseId, 10, 'Starting course generation...');

      // Generate course content using orchestrator
      this.logger.log('Generating course content...');
      this.gateway.emitCourseProgress(courseId, 20, 'Generating course content with AI...');

      const reviewStarted = () => {
        this.gateway.emitCourseProgress(
          courseId,
          40,
          'Course content generated, review in progress...',
        );
      };

      const generatedCourse = await this.orchestratorService.orchestrateCourseGeneration(
        title,
        description,
        reviewStarted,
      );

      this.gateway.emitCourseProgress(
        courseId,
        50,
        'Course content generated, saving to database...',
      );

      // Load the course entity with relations to clean up existing content
      const course = await this.courseRepository.findOne({
        where: { id: courseId },
        relations: [
          'modules',
          'modules.lessons',
          'quiz',
          'quiz.questions',
          'quiz.questions.answers',
        ],
      });
      if (!course) {
        throw new Error(`Course ${courseId} not found`);
      }

      this.logger.log('Saving course content to database...');

      // Clean up existing content if any
      if (course.modules && course.modules.length > 0) {
        const moduleIds = course.modules.map((module) => module.id);

        if (moduleIds.length > 0) {
          await this.lessonRepository.delete({ moduleId: In(moduleIds) });
          await this.moduleRepository.delete(moduleIds);
        }
      }

      // Prepare quiz (reuse existing or create new)
      let savedQuiz = course.quiz;
      if (savedQuiz) {
        if (savedQuiz.questions && savedQuiz.questions.length > 0) {
          const questionIds = savedQuiz.questions.map((question) => question.id);

          if (questionIds.length > 0) {
            await this.answerRepository.delete({ questionId: In(questionIds) });
            await this.questionRepository.delete(questionIds);
          }
        }
      } else {
        const quiz = this.quizRepository.create({
          course: course,
        });
        savedQuiz = await this.quizRepository.save(quiz);
      }

      // Save modules and lessons
      for (const moduleData of generatedCourse.modules) {
        const module = this.moduleRepository.create({
          title: moduleData.title,
          description: moduleData.description,
          order: moduleData.order,
          course: course,
        });
        const savedModule = await this.moduleRepository.save(module);

        // Save lessons for this module
        for (const lessonData of moduleData.lessons) {
          const lesson = this.lessonRepository.create({
            title: lessonData.title,
            content: lessonData.content,
            order: lessonData.order,
            module: savedModule,
          });
          await this.lessonRepository.save(lesson);
        }
      }

      this.gateway.emitCourseProgress(courseId, 75, 'Modules and lessons saved, creating quiz...');

      // Save questions to the quiz
      for (const questionData of generatedCourse.quiz.questions) {
        const question = this.questionRepository.create({
          text: questionData.text,
          type: questionData.type as QuestionType,
          order: questionData.order,
          quizId: savedQuiz.id,
        });
        const savedQuestion = await this.questionRepository.save(question);

        // Save answers for this question
        for (const answerData of questionData.answers) {
          const answer = this.answerRepository.create({
            text: answerData.text,
            isCorrect: answerData.isCorrect,
            order: answerData.order,
            questionId: savedQuestion.id,
          });
          await this.answerRepository.save(answer);
        }
      }

      this.gateway.emitCourseProgress(courseId, 90, 'Quiz created, finalizing course...');

      // Update course status to DRAFT without re-saving related entities
      await this.courseRepository.update(course.id, { status: CourseStatus.DRAFT });

      this.gateway.emitCourseComplete(courseId, 'Course generation completed successfully!');

      this.logger.log(`Course generation completed successfully for course ${courseId}`);
    } catch (error) {
      const message = this.extractErrorMessage(error);
      this.logger.error(`Course generation failed for course ${courseId}: ${message}`);

      // Emit error to WebSocket clients
      this.gateway.emitCourseError(courseId, message);

      // Update course status to DRAFT as fallback
      try {
        await this.courseRepository.update(courseId, { status: CourseStatus.DRAFT });
      } catch (updateError) {
        const updateMessage = this.extractErrorMessage(updateError);
        this.logger.error(`Failed to update course status: ${updateMessage}`);
      }
    }
  }

  /**
   * Process module regeneration (runs in background)
   */
  private async processModuleRegeneration(
    courseId: string,
    moduleId: string,
    feedback?: string,
  ): Promise<void> {
    this.logger.log(`Starting module regeneration for module ${moduleId}`);

    try {
      // Update progress
      this.gateway.emitModuleProgress(courseId, moduleId, 10, 'Starting module regeneration...');

      // Load course and modules
      const course = await this.courseRepository.findOne({
        where: { id: courseId },
        relations: ['modules'],
      });

      if (!course) {
        throw new Error(`Course ${courseId} not found`);
      }

      const module = await this.moduleRepository.findOne({
        where: { id: moduleId },
        relations: ['lessons'],
      });

      if (!module) {
        throw new Error(`Module ${moduleId} not found`);
      }

      this.gateway.emitModuleProgress(
        courseId,
        moduleId,
        20,
        'Generating new module content with AI...',
      );

      // Get existing modules for context (excluding the one being regenerated)
      const existingModules = course.modules
        .filter((m) => m.id !== moduleId)
        .map((m) => ({ title: m.title, description: m.description }));

      this.logger.log('Regenerating module content...');

      // Generate new module content using orchestrator
      const generatedModule = await this.orchestratorService.orchestrateModuleGeneration(
        course.title,
        course.description,
        existingModules,
        module.order,
        feedback,
      );

      this.gateway.emitModuleProgress(
        courseId,
        moduleId,
        70,
        'Module content generated, saving to database...',
      );

      this.logger.log('Updating module in database...');

      // Delete old lessons
      await this.lessonRepository.delete({ moduleId: module.id });

      // Update module
      module.title = generatedModule.title;
      module.description = generatedModule.description;
      await this.moduleRepository.save(module);

      // Save new lessons
      for (const lessonData of generatedModule.lessons) {
        const lesson = this.lessonRepository.create({
          title: lessonData.title,
          content: lessonData.content,
          order: lessonData.order,
          moduleId: module.id,
        });
        await this.lessonRepository.save(lesson);
      }

      this.gateway.emitModuleComplete(
        courseId,
        moduleId,
        'Module regeneration completed successfully!',
      );

      this.logger.log(`Module regeneration completed successfully for module ${moduleId}`);
    } catch (error) {
      const message = this.extractErrorMessage(error);
      this.logger.error(`Module regeneration failed for module ${moduleId}: ${message}`);
      this.gateway.emitCourseError(courseId, `Module regeneration failed: ${message}`);
    }
  }

  /**
   * Process quiz regeneration (runs in background)
   */
  private async processQuizRegeneration(courseId: string, feedback?: string): Promise<void> {
    this.logger.log(`Starting quiz regeneration for course ${courseId}`);

    try {
      // Update progress
      this.gateway.emitQuizProgress(courseId, 10, 'Starting quiz regeneration...');

      // Load course with modules and lessons
      const course = await this.courseRepository.findOne({
        where: { id: courseId },
        relations: [
          'modules',
          'modules.lessons',
          'quiz',
          'quiz.questions',
          'quiz.questions.answers',
        ],
      });

      if (!course) {
        throw new Error(`Course ${courseId} not found`);
      }

      this.gateway.emitQuizProgress(courseId, 20, 'Generating new quiz content with AI...');

      // Build course content summary for quiz generation
      const courseContent = this.buildCourseContentSummary(course);

      this.logger.log('Regenerating quiz content...');

      // Generate new quiz content using orchestrator
      const generatedQuiz = await this.orchestratorService.orchestrateQuizGeneration(
        courseContent,
        feedback,
      );

      this.gateway.emitQuizProgress(courseId, 70, 'Quiz content generated, saving to database...');

      this.logger.log('Updating quiz in database...');

      // Get or create quiz
      let quiz = course.quiz;
      if (!quiz) {
        quiz = this.quizRepository.create({ courseId: course.id });
        quiz = await this.quizRepository.save(quiz);
      }

      // Delete old questions and answers
      if (quiz.questions && quiz.questions.length > 0) {
        const questionIds = quiz.questions.map((question) => question.id);

        if (questionIds.length > 0) {
          await this.answerRepository.delete({ questionId: In(questionIds) });
          await this.questionRepository.delete(questionIds);
        }
      }

      // Save new questions and answers
      for (const questionData of generatedQuiz.questions) {
        const question = this.questionRepository.create({
          text: questionData.text,
          type: questionData.type as QuestionType,
          order: questionData.order,
          quizId: quiz.id,
        });
        const savedQuestion = await this.questionRepository.save(question);

        // Save answers for this question
        for (const answerData of questionData.answers) {
          const answer = this.answerRepository.create({
            text: answerData.text,
            isCorrect: answerData.isCorrect,
            order: answerData.order,
            questionId: savedQuestion.id,
          });
          await this.answerRepository.save(answer);
        }
      }

      this.gateway.emitQuizComplete(courseId, 'Quiz regeneration completed successfully!');

      this.logger.log(`Quiz regeneration completed successfully for course ${courseId}`);
    } catch (error) {
      const message = this.extractErrorMessage(error);
      this.logger.error(`Quiz regeneration failed for course ${courseId}: ${message}`);
      this.gateway.emitCourseError(courseId, `Quiz regeneration failed: ${message}`);
    }
  }

  /**
   * Helper method to build course content summary for quiz generation
   */
  private buildCourseContentSummary(course: Course): string {
    let summary = `Course: ${course.title}\n\n`;

    if (course.modules && course.modules.length > 0) {
      summary += 'Modules:\n';
      for (const module of course.modules) {
        summary += `\n${module.order + 1}. ${module.title}\n`;
        summary += `   ${module.description}\n`;

        if (module.lessons && module.lessons.length > 0) {
          summary += '   Lessons:\n';
          for (const lesson of module.lessons) {
            summary += `   - ${lesson.title}\n`;
          }
        }
      }
    }

    return summary;
  }

  private extractErrorMessage(error: unknown): string {
    if (error instanceof Error) {
      return error.message;
    }

    if (typeof error === 'string') {
      return error;
    }

    try {
      return JSON.stringify(error);
    } catch {
      return 'Unknown error';
    }
  }
}
