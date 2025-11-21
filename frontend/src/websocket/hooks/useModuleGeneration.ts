import { useSocketSubscription } from './useSocketSubscription';
import type { SubscriptionOptions } from './useSocketSubscription';
import type { ModuleGenerationPayload } from '../types/events';

/**
 * Hook for subscribing to module generation events
 * @param moduleId - The module ID to subscribe to
 * @param options - Subscription options
 */
export function useModuleGeneration(
  moduleId: string,
  options?: SubscriptionOptions
) {
  return useSocketSubscription<ModuleGenerationPayload>(
    'module:generation',
    moduleId,
    options
  );
}
