import { useSocketSubscription } from './useSocketSubscription';
import type { SubscriptionOptions } from './useSocketSubscription';
import type { QuizGenerationPayload } from '../types/events';

/**
 * Hook for subscribing to quiz generation events
 * @param quizId - The quiz ID to subscribe to
 * @param options - Subscription options
 */
export function useQuizGeneration(
  quizId: string,
  options?: SubscriptionOptions
) {
  return useSocketSubscription<QuizGenerationPayload>(
    'quiz:generation',
    quizId,
    options
  );
}
