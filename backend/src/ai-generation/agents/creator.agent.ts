import { Injectable, Logger } from '@nestjs/common';
import { LLMFactoryService } from '../llm-factory.service';
import {
  formatCourseGenerationPrompt,
  formatModuleGenerationPrompt,
  formatQuizGenerationPrompt,
} from '../prompts/templates';
import { CourseOutputSchema, CourseOutput } from '../schemas/course-output.schema';
import { ModuleSchema, ModuleOutput } from '../schemas/module.schema';
import { QuizSchema, QuizOutput } from '../schemas/quiz.schema';

@Injectable()
export class CreatorAgent {
  private readonly logger = new Logger(CreatorAgent.name);

  constructor(private readonly llmFactory: LLMFactoryService) {}

  async generateFullCourse(title: string, description: string): Promise<CourseOutput> {
    this.logger.log(`Generating full course: ${title}`);

    const llm = this.llmFactory.createLLM({ temperature: 0.7, streaming: false });
    const prompt = formatCourseGenerationPrompt(title, description);

    try {
      const structuredLLM = llm.withStructuredOutput(CourseOutputSchema);
      const result = await structuredLLM.invoke(prompt);

      this.logger.log(`Successfully generated course with ${result.modules.length} modules`);
      return result as CourseOutput;
    } catch (error: any) {
      this.logger.error(`Failed to generate full course: ${error.message}`);
      throw new Error(`Course generation failed: ${error.message}`);
    }
  }

  async generateModule(
    courseTitle: string,
    courseDescription: string,
    existingModules: Array<{ title: string; description: string }>,
    moduleOrder: number,
    feedback?: string,
  ): Promise<ModuleOutput> {
    this.logger.log(`Generating module #${moduleOrder} for course: ${courseTitle}`);

    const llm = this.llmFactory.createLLM({ temperature: 0.7, streaming: false });

    const existingModulesText =
      existingModules.length > 0
        ? existingModules.map((m, i) => `${i + 1}. ${m.title}: ${m.description}`).join('\n')
        : 'None (this is the first module)';

    const prompt = formatModuleGenerationPrompt(
      courseTitle,
      courseDescription,
      existingModulesText,
      moduleOrder,
      feedback,
    );

    try {
      const structuredLLM = llm.withStructuredOutput(ModuleSchema);
      const result = await structuredLLM.invoke(prompt);

      this.logger.log(`Successfully generated module with ${result.lessons.length} lessons`);
      return result as ModuleOutput;
    } catch (error: any) {
      this.logger.error(`Failed to generate module: ${error.message}`);
      throw new Error(`Module generation failed: ${error.message}`);
    }
  }

  async generateQuiz(courseContent: string, feedback?: string): Promise<QuizOutput> {
    this.logger.log('Generating quiz for course content');

    const llm = this.llmFactory.createLLM({ temperature: 0.7, streaming: false });
    const prompt = formatQuizGenerationPrompt(courseContent, feedback);

    try {
      const structuredLLM = llm.withStructuredOutput(QuizSchema);
      const result = await structuredLLM.invoke(prompt);

      this.logger.log(`Successfully generated quiz with ${result.questions.length} questions`);
      return result as QuizOutput;
    } catch (error: any) {
      this.logger.error(`Failed to generate quiz: ${error.message}`);
      throw new Error(`Quiz generation failed: ${error.message}`);
    }
  }
}
