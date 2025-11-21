import { z } from 'zod';
import { AnswerSchema } from './answer.schema';

export const QuestionSchema = z.object({
  text: z.string().describe('The question text'),
  type: z
    .enum(['mcq', 'single_choice'])
    .describe('Type of question: multiple choice (mcq) or single choice'),
  order: z.number().int().describe('Order of the question in the quiz'),
  answers: z.array(AnswerSchema).describe('List of possible answers'),
});

export type QuestionOutput = z.infer<typeof QuestionSchema>;
