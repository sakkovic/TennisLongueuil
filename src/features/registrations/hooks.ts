import { useMutation, useQuery } from '@tanstack/react-query';

import { useInvalidateLessons } from '@/features/lessons/hooks';
import { queryKeys } from '@/lib/queryClient';

import { cancelRegistration, fetchPlayerRegistrations, joinLesson } from './api';

/**
 * No optimistic updates: the UI shows "registered" only after the database
 * accepted the registration. Data is refreshed after success AND failure
 * (e.g. LESSON_FULL), so the screen always reflects the real state.
 */
export function useJoinLesson() {
  const invalidate = useInvalidateLessons();
  return useMutation({
    mutationFn: (lessonId: string) => joinLesson(lessonId),
    onSettled: invalidate,
  });
}

export function useCancelRegistration() {
  const invalidate = useInvalidateLessons();
  return useMutation({
    mutationFn: ({ lessonId, reason }: { lessonId: string; reason: string }) =>
      cancelRegistration(lessonId, reason),
    onSettled: invalidate,
  });
}

export function useMyRegistrations(userId: string | undefined) {
  return useQuery({
    queryKey: queryKeys.myRegistrations(userId),
    queryFn: () => fetchPlayerRegistrations(userId ?? ''),
    enabled: Boolean(userId),
  });
}

export function useMemberRegistrations(memberId: string) {
  return useQuery({
    queryKey: queryKeys.memberRegistrations(memberId),
    queryFn: () => fetchPlayerRegistrations(memberId),
    enabled: Boolean(memberId),
  });
}
