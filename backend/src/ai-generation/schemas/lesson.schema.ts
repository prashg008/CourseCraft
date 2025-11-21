import { z } from 'zod';

export const LessonSchema = z.object({
  title: z.string().describe('Title of the lesson'),
  content: z.string().describe('Detailed content of the lesson in markdown format'),
  order: z.number().int().describe('Order of the lesson in the module'),
});

export type LessonOutput = z.infer<typeof LessonSchema>;
