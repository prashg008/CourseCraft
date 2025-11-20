import { useSocketSubscription } from './useSocketSubscription';
import type { SubscriptionOptions } from './useSocketSubscription';
import type { CourseGenerationPayload } from '../types/events';

/**
 * Hook for subscribing to course generation events
 * @param courseId - The course ID to subscribe to
 * @param options - Subscription options
 */
export function useCourseGeneration(
  courseId: string,
  options?: SubscriptionOptions
) {
  return useSocketSubscription<CourseGenerationPayload>(
    'course:generation',
    courseId,
    options
  );
}
