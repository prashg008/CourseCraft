import { useSocketSubscription } from './useSocketSubscription';
import type { SubscriptionOptions } from './useSocketSubscription';
import type { ModuleGenerationPayload } from '../types/events';
import type { EventEnvelope } from '../contracts/events';
import { useModuleGenerationStore } from './useGenerationStore';

export function useModuleGeneration(moduleId: string, options?: SubscriptionOptions) {
  const socketSub = useSocketSubscription<EventEnvelope<ModuleGenerationPayload>>(
    'module:generation',
    moduleId,
    options
  );

  const channelData = useModuleGenerationStore(moduleId);

  return {
    data: channelData.payload as ModuleGenerationPayload | undefined,
    subscribe: socketSub.subscribe,
    unsubscribe: socketSub.unsubscribe,
    isSubscribed: socketSub.isSubscribed,
    loading: socketSub.loading,
    error: socketSub.error,
  };
}
