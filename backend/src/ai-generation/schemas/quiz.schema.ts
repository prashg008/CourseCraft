import { z } from 'zod';
import { QuestionSchema } from './question.schema';

export const QuizSchema = z.object({
  questions: z.array(QuestionSchema).describe('List of questions in the quiz'),
});

export type QuizOutput = z.infer<typeof QuizSchema>;
