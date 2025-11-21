import { z } from 'zod';
import { LessonSchema } from './lesson.schema';

export const ModuleSchema = z.object({
  title: z.string().describe('Title of the module'),
  description: z.string().describe('Description of what the module covers'),
  order: z.number().int().describe('Order of the module in the course'),
  lessons: z.array(LessonSchema).describe('List of lessons in the module'),
});

export type ModuleOutput = z.infer<typeof ModuleSchema>;
