import { z } from 'zod';

export const AnswerSchema = z.object({
  text: z.string().describe('The answer text'),
  isCorrect: z.boolean().describe('Whether this answer is correct'),
  order: z.number().int().describe('Order of the answer'),
});

export type AnswerOutput = z.infer<typeof AnswerSchema>;
