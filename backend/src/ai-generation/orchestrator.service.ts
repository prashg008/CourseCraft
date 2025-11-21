import { Injectable, Logger } from '@nestjs/common';
import { CreatorAgent } from './agents/creator.agent';
import { ReviewerAgent } from './agents/reviewer.agent';
import { CourseOutputSchema, CourseOutput } from './schemas/course-output.schema';
import { ModuleSchema, ModuleOutput } from './schemas/module.schema';
import { QuizSchema, QuizOutput } from './schemas/quiz.schema';
import {
  formatCourseGenerationPrompt,
  formatModuleGenerationPrompt,
  formatQuizGenerationPrompt,
} from './prompts/templates';

const MAX_ATTEMPTS = 3;
const QUALITY_THRESHOLD = 50;

@Injectable()
export class OrchestratorService {
  private readonly logger = new Logger(OrchestratorService.name);

  constructor(
    private readonly creatorAgent: CreatorAgent,
    private readonly reviewerAgent: ReviewerAgent,
  ) {}

  async orchestrateCourseGeneration(
    title: string,
    description: string,
    onReviewStarted?: () => void,
  ): Promise<CourseOutput> {
    this.logger.log(`Starting course generation orchestration: ${title}`);
    const originalPrompt = formatCourseGenerationPrompt(title, description);

    let currentContent: CourseOutput | null = null;
    let attempt = 0;

    while (attempt < MAX_ATTEMPTS) {
      attempt++;
      this.logger.log(`Course generation attempt ${attempt}/${MAX_ATTEMPTS}`);

      try {
        // Generate or revise content
        if (currentContent === null) {
          // First attempt - generate from scratch
          currentContent = await this.creatorAgent.generateFullCourse(title, description);
        } else {
          // Subsequent attempts - revise based on feedback
          const review = await this.reviewerAgent.reviewContent(currentContent, originalPrompt);
          // eslint-disable-next-line @typescript-eslint/no-unused-expressions
          onReviewStarted && onReviewStarted();
          currentContent = await this.reviewerAgent.reviseContent(
            currentContent,
            review.qualityScore,
            review.issues,
            review.suggestions,
            CourseOutputSchema,
          );
        }

        // Review the content
        const review = await this.reviewerAgent.reviewContent(currentContent, originalPrompt);

        this.logger.log(
          `Review result - Score: ${review.qualityScore}, Approved: ${review.approved}`,
        );

        if (review.approved && review.qualityScore >= QUALITY_THRESHOLD) {
          this.logger.log(`Course generation successful after ${attempt} attempt(s)`);
          return currentContent;
        }

        if (attempt === MAX_ATTEMPTS) {
          this.logger.warn(`Course generation failed quality check after ${MAX_ATTEMPTS} attempts`);
          throw new Error(
            `Failed to generate acceptable course content after ${MAX_ATTEMPTS} attempts. Last score: ${review.qualityScore}`,
          );
        }

        this.logger.log(`Quality below threshold, attempting revision...`);
      } catch (error: any) {
        this.logger.error(`Attempt ${attempt} failed: ${error.message}`);

        if (attempt === MAX_ATTEMPTS) {
          throw new Error(
            `Course generation failed after ${MAX_ATTEMPTS} attempts: ${error.message}`,
          );
        }
      }
    }

    throw new Error('Course generation failed: max attempts reached');
  }

  async orchestrateModuleGeneration(
    courseTitle: string,
    courseDescription: string,
    existingModules: Array<{ title: string; description: string }>,
    moduleOrder: number,
    feedback?: string,
  ): Promise<ModuleOutput> {
    this.logger.log(`Starting module generation orchestration for: ${courseTitle}`);
    const originalPrompt = formatModuleGenerationPrompt(
      courseTitle,
      courseDescription,
      existingModules.map((m, i) => `${i + 1}. ${m.title}: ${m.description}`).join('\n'),
      moduleOrder,
      feedback,
    );

    let currentContent: ModuleOutput | null = null;
    let attempt = 0;

    while (attempt < MAX_ATTEMPTS) {
      attempt++;
      this.logger.log(`Module generation attempt ${attempt}/${MAX_ATTEMPTS}`);

      try {
        // Generate or revise content
        if (currentContent === null) {
          // First attempt - generate from scratch
          currentContent = await this.creatorAgent.generateModule(
            courseTitle,
            courseDescription,
            existingModules,
            moduleOrder,
            feedback,
          );
        } else {
          // Subsequent attempts - revise based on feedback
          const review = await this.reviewerAgent.reviewContent(currentContent, originalPrompt);

          currentContent = await this.reviewerAgent.reviseContent(
            currentContent,
            review.qualityScore,
            review.issues,
            review.suggestions,
            ModuleSchema,
          );
        }

        // Review the content
        const review = await this.reviewerAgent.reviewContent(currentContent, originalPrompt);

        this.logger.log(
          `Review result - Score: ${review.qualityScore}, Approved: ${review.approved}`,
        );

        if (review.approved && review.qualityScore >= QUALITY_THRESHOLD) {
          this.logger.log(`Module generation successful after ${attempt} attempt(s)`);
          return currentContent;
        }

        if (attempt === MAX_ATTEMPTS) {
          this.logger.warn(`Module generation failed quality check after ${MAX_ATTEMPTS} attempts`);
          throw new Error(
            `Failed to generate acceptable module content after ${MAX_ATTEMPTS} attempts. Last score: ${review.qualityScore}`,
          );
        }

        this.logger.log(`Quality below threshold, attempting revision...`);
      } catch (error: any) {
        this.logger.error(`Attempt ${attempt} failed: ${error.message}`);

        if (attempt === MAX_ATTEMPTS) {
          throw new Error(
            `Module generation failed after ${MAX_ATTEMPTS} attempts: ${error.message}`,
          );
        }
      }
    }

    throw new Error('Module generation failed: max attempts reached');
  }

  async orchestrateQuizGeneration(courseContent: string, feedback?: string): Promise<QuizOutput> {
    this.logger.log('Starting quiz generation orchestration');
    const originalPrompt = formatQuizGenerationPrompt(courseContent, feedback);

    let currentContent: QuizOutput | null = null;
    let attempt = 0;

    while (attempt < MAX_ATTEMPTS) {
      attempt++;
      this.logger.log(`Quiz generation attempt ${attempt}/${MAX_ATTEMPTS}`);

      try {
        // Generate or revise content
        if (currentContent === null) {
          // First attempt - generate from scratch
          currentContent = await this.creatorAgent.generateQuiz(courseContent, feedback);
        } else {
          // Subsequent attempts - revise based on feedback
          const review = await this.reviewerAgent.reviewContent(currentContent, originalPrompt);

          currentContent = await this.reviewerAgent.reviseContent(
            currentContent,
            review.qualityScore,
            review.issues,
            review.suggestions,
            QuizSchema,
          );
        }

        // Review the content
        const review = await this.reviewerAgent.reviewContent(currentContent, originalPrompt);

        this.logger.log(
          `Review result - Score: ${review.qualityScore}, Approved: ${review.approved}`,
        );

        if (review.approved && review.qualityScore >= QUALITY_THRESHOLD) {
          this.logger.log(`Quiz generation successful after ${attempt} attempt(s)`);
          return currentContent;
        }

        if (attempt === MAX_ATTEMPTS) {
          this.logger.warn(`Quiz generation failed quality check after ${MAX_ATTEMPTS} attempts`);
          throw new Error(
            `Failed to generate acceptable quiz content after ${MAX_ATTEMPTS} attempts. Last score: ${review.qualityScore}`,
          );
        }

        this.logger.log(`Quality below threshold, attempting revision...`);
      } catch (error: any) {
        this.logger.error(`Attempt ${attempt} failed: ${error.message}`);

        if (attempt === MAX_ATTEMPTS) {
          throw new Error(
            `Quiz generation failed after ${MAX_ATTEMPTS} attempts: ${error.message}`,
          );
        }
      }
    }

    throw new Error('Quiz generation failed: max attempts reached');
  }
}
