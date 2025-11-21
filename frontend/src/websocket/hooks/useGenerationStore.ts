import { useCallback } from 'react';
import useGenerationStore from '../store/generationStore';

export function useGenerationState(channel: string) {
  const payload = useGenerationStore(s => s.channels[channel]);
  const setChannel = useGenerationStore(s => s.setChannel);

  const set = useCallback(
    (p: unknown) => {
      setChannel(channel, p);
    },
    [channel, setChannel]
  );

  return { payload, set };
}

export function useCourseGenerationStore(courseId: string) {
  const channel = `course:generation:${courseId}`;
  return useGenerationState(channel);
}

export function useModuleGenerationStore(moduleId: string) {
  const channel = `module:generation:${moduleId}`;
  return useGenerationState(channel);
}

export function useQuizGenerationStore(quizId: string) {
  const channel = `quiz:generation:${quizId}`;
  return useGenerationState(channel);
}

export default useGenerationState;
