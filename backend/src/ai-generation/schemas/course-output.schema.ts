import { z } from 'zod';
import { ModuleSchema } from './module.schema';
import { QuizSchema } from './quiz.schema';

export const CourseOutputSchema = z.object({
  modules: z.array(ModuleSchema).describe('List of modules in the course'),
  quiz: QuizSchema.describe('Final quiz for the course'),
});

export type CourseOutput = z.infer<typeof CourseOutputSchema>;
