import { useSocketSubscription } from './useSocketSubscription';
import type { SubscriptionOptions } from './useSocketSubscription';
import type { CourseGenerationPayload } from '../types/events';
import type { EventEnvelope } from '../contracts/events';
import { useCourseGenerationStore } from './useGenerationStore';

/**
 * Hook that subscribes to course generation events and returns the live payload
 * from the centralized Zustand store. It performs the socket subscribe/unsubscribe
 * and exposes subscription state alongside the latest payload.
 */
export function useCourseGeneration(courseId: string, options?: SubscriptionOptions) {
  const socketSub = useSocketSubscription<EventEnvelope<CourseGenerationPayload>>(
    'course:generation',
    courseId,
    options
  );

  const channelData = useCourseGenerationStore(courseId);

  return {
    data: channelData.payload as CourseGenerationPayload | undefined,
    subscribe: socketSub.subscribe,
    unsubscribe: socketSub.unsubscribe,
    isSubscribed: socketSub.isSubscribed,
    loading: socketSub.loading,
    error: socketSub.error,
  };
}
