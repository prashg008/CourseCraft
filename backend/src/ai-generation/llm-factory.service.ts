import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { ChatOpenAI } from '@langchain/openai';
import { ChatGoogleGenerativeAI } from '@langchain/google-genai';

type LLMProvider = 'openai' | 'gemini';

interface LLMOptions {
  temperature?: number;
  streaming?: boolean;
}

@Injectable()
export class LLMFactoryService {
  private readonly logger = new Logger(LLMFactoryService.name);

  constructor(private readonly configService: ConfigService) {}

  /**
   * Create an LLM instance based on environment configuration
   * Supports OpenAI and Google Gemini
   */
  createLLM(options: LLMOptions = {}) {
    const { temperature = 0.7, streaming = false } = options;

    const provider = this.configService.get<LLMProvider>('llm.provider', 'openai');
    const modelName = this.configService.get<string>('llm.modelName');
    const apiKey = this.configService.get<string>('llm.apiKey');

    if (!apiKey) {
      const envVar = provider === 'openai' ? 'OPENAI_API_KEY' : 'GEMINI_API_KEY';
      throw new Error(
        `API key not configured for ${provider}. Please set ${envVar} in your environment.`,
      );
    }

    this.logger.log(`Creating LLM instance: provider=${provider}, model=${modelName ?? 'unknown'}`);

    switch (provider) {
      case 'openai':
        return new ChatOpenAI({
          apiKey,
          modelName: modelName || 'gpt-4o-mini',
          temperature,
          streaming,
        });

      case 'gemini':
        return new ChatGoogleGenerativeAI({
          apiKey,
          model: modelName || 'gemini-1.5-flash',
          temperature,
          streaming,
        });

      default:
        throw new Error('Unsupported LLM provider. Supported providers: openai, gemini');
    }
  }

  /**
   * Get the current provider configuration
   */
  getProviderInfo() {
    return {
      provider: this.configService.get<LLMProvider>('llm.provider', 'openai'),
      modelName: this.configService.get<string>('llm.modelName'),
      hasApiKey: Boolean(this.configService.get<string>('llm.apiKey')),
    };
  }
}
