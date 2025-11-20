export default () => {
  const llmProvider = (process.env.LLM_PROVIDER || 'openai').toLowerCase();

  // Determine API key and model based on provider
  let llmApiKey = '';
  let llmModelName = '';

  if (llmProvider === 'openai') {
    llmApiKey = process.env.OPENAI_API_KEY || '';
    llmModelName = process.env.OPENAI_MODEL || 'gpt-4o-mini';
  } else if (llmProvider === 'gemini') {
    llmApiKey = process.env.GEMINI_API_KEY || '';
    llmModelName = process.env.GEMINI_MODEL || 'gemini-1.5-flash';
  }

  return {
    nodeEnv: process.env.NODE_ENV || 'development',
    port: parseInt(process.env.PORT || '3000', 10),
    database: {
      host: process.env.DATABASE_HOST || 'localhost',
      port: parseInt(process.env.DATABASE_PORT || '5432', 10),
      username: process.env.DATABASE_USERNAME || 'coursecraft_user',
      password: process.env.DATABASE_PASSWORD || 'coursecraft_pass',
      name: process.env.DATABASE_NAME || 'coursecraft_db',
      synchronize: process.env.DATABASE_SYNCHRONIZE === 'true',
      logging: process.env.DATABASE_LOGGING === 'true',
    },
    jwt: {
      secret: process.env.JWT_SECRET || 'default-secret-change-me',
      expiration: process.env.JWT_EXPIRATION || '7d',
    },
    llm: {
      provider: llmProvider,
      apiKey: llmApiKey,
      modelName: llmModelName,
    },
    cors: {
      origin: process.env.CORS_ORIGIN?.split(',') || ['http://localhost:5173'],
    },
    socketio: {
      corsOrigin: process.env.SOCKET_IO_CORS_ORIGIN?.split(',') || ['http://localhost:5173'],
    },
  };
};
