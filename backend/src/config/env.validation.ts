import { z } from 'zod';

export const envSchema = z.object({
  // Server
  NODE_ENV: z.enum(['development', 'production', 'test']).default('development'),
  PORT: z
    .string()
    .optional()
    .default('3000')
    .transform((val) => parseInt(val, 10)),

  // Database
  DATABASE_HOST: z.string().default('localhost'),
  DATABASE_PORT: z
    .string()
    .optional()
    .default('5432')
    .transform((val) => parseInt(val, 10)),
  DATABASE_USERNAME: z.string().min(1),
  DATABASE_PASSWORD: z.string().min(1),
  DATABASE_NAME: z.string().min(1),
  DATABASE_SYNCHRONIZE: z
    .string()
    .optional()
    .default('false')
    .transform((val) => val === 'true'),
  DATABASE_LOGGING: z
    .string()
    .optional()
    .default('false')
    .transform((val) => val === 'true'),

  // JWT
  JWT_SECRET: z.string().min(32, 'JWT_SECRET must be at least 32 characters'),
  JWT_EXPIRATION: z.string().default('7d'),

  // LLM Configuration
  LLM_PROVIDER: z.enum(['openai', 'gemini']).default('openai'),

  // OpenAI
  OPENAI_API_KEY: z.string().optional(),
  OPENAI_MODEL: z.string().default('gpt-4o-mini'),

  // Google Gemini
  GEMINI_API_KEY: z.string().optional(),
  GEMINI_MODEL: z.string().default('gemini-1.5-flash'),

  // CORS
  CORS_ORIGIN: z.string().default('http://localhost:5173'),

  // Socket.IO
  SOCKET_IO_CORS_ORIGIN: z.string().default('http://localhost:5173'),
});

export type Environment = z.infer<typeof envSchema>;

export function validateEnv(config: Record<string, unknown>): Environment {
  const result = envSchema.safeParse(config);

  if (!result.success) {
    const errors = result.error.issues.map((err) => `${err.path.join('.')}: ${err.message}`);
    throw new Error(`Environment validation failed:\n${errors.join('\n')}`);
  }

  return result.data;
}
