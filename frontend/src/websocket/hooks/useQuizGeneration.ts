import { useSocketSubscription } from './useSocketSubscription';
import type { SubscriptionOptions } from './useSocketSubscription';
import type { QuizGenerationPayload } from '../types/events';
import type { EventEnvelope } from '../contracts/events';
import { useQuizGenerationStore } from './useGenerationStore';

export function useQuizGeneration(quizId: string, options?: SubscriptionOptions) {
  const socketSub = useSocketSubscription<EventEnvelope<QuizGenerationPayload>>(
    'quiz:generation',
    quizId,
    options
  );

  const channelData = useQuizGenerationStore(quizId);

  return {
    data: channelData.payload as QuizGenerationPayload | undefined,
    subscribe: socketSub.subscribe,
    unsubscribe: socketSub.unsubscribe,
    isSubscribed: socketSub.isSubscribed,
    loading: socketSub.loading,
    error: socketSub.error,
  };
}
