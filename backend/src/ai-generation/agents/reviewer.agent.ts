import { Injectable, Logger } from '@nestjs/common';
import { LLMFactoryService } from '../llm-factory.service';
import { formatReviewPrompt, formatRevisionPrompt } from '../prompts/templates';
import { z } from 'zod';

const ReviewOutputSchema = z.object({
  qualityScore: z.number().int().min(0).max(100),
  approved: z.boolean(),
  issues: z.array(z.string()),
  suggestions: z.array(z.string()),
  summary: z.string(),
});

export type ReviewOutput = z.infer<typeof ReviewOutputSchema>;

@Injectable()
export class ReviewerAgent {
  private readonly logger = new Logger(ReviewerAgent.name);

  constructor(private readonly llmFactory: LLMFactoryService) {}

  async reviewContent(content: unknown, originalPrompt: string): Promise<ReviewOutput> {
    this.logger.log('Reviewing generated content');

    const llm = this.llmFactory.createLLM({ temperature: 0.3, streaming: false });
    const prompt = formatReviewPrompt(JSON.stringify(content, null, 2), originalPrompt);

    try {
      const structuredLLM = llm.withStructuredOutput(ReviewOutputSchema);
      const result = await structuredLLM.invoke(prompt);

      this.logger.log(
        `Review complete - Score: ${result.qualityScore}/100, Approved: ${result.approved}`,
      );

      return result as ReviewOutput;
    } catch (error) {
      const msg = error instanceof Error ? error.message : String(error);
      this.logger.error(`Failed to review content: ${msg}`);
      throw new Error(`Content review failed: ${msg}`);
    }
  }

  async reviseContent<T>(
    content: T,
    qualityScore: number,
    issues: string[],
    suggestions: string[],
    schema: z.ZodType<T>,
  ): Promise<T> {
    this.logger.log(`Revising content based on review feedback (score: ${qualityScore})`);

    const llm = this.llmFactory.createLLM({ temperature: 0.7, streaming: false });
    const prompt = formatRevisionPrompt(
      JSON.stringify(content, null, 2),
      qualityScore,
      issues,
      suggestions,
    );

    try {
      const structuredLLM = llm.withStructuredOutput(schema);
      const result = await structuredLLM.invoke(prompt);

      this.logger.log('Content revision complete');
      return result as T;
    } catch (error) {
      const msg = error instanceof Error ? error.message : String(error);
      this.logger.error(`Failed to revise content: ${msg}`);
      throw new Error(`Content revision failed: ${msg}`);
    }
  }
}
