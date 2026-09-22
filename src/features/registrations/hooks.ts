import { useMutation, useQuery } from '@tanstack/react-query';

import { useInvalidateLessons } from '@/features/lessons/hooks';
import { cancelLessonReminder, scheduleLessonReminder } from '@/features/notifications/reminders';
import { queryKeys } from '@/lib/queryClient';

import { cancelRegistration, fetchPlayerRegistrations, joinLesson, joinWaitlist } from './api';

export interface JoinLessonInput {
  lessonId: string;
  title: string;
  startTime: string;
}

/**
 * No optimistic updates: the UI shows "registered" only after the database
 * accepted the registration. Data is refreshed after success AND failure
 * (e.g. LESSON_FULL), so the screen always reflects the real state.
 */
export function useJoinLesson() {
  const invalidate = useInvalidateLessons();
  return useMutation({
    mutationFn: async ({ lessonId, title, startTime }: JoinLessonInput) => {
      const result = await joinLesson(lessonId);
      void scheduleLessonReminder({ lessonId, title, startTime });
      return result;
    },
    onSettled: invalidate,
  });
}

/** Queue for a full lesson (or join it, if a spot opened in the meantime). */
export function useJoinWaitlist() {
  const invalidate = useInvalidateLessons();
  return useMutation({
    mutationFn: async ({ lessonId, title, startTime }: JoinLessonInput) => {
      const result = await joinWaitlist(lessonId);
      if (result.status === 'joined') void scheduleLessonReminder({ lessonId, title, startTime });
      return result;
    },
    onSettled: invalidate,
  });
}

export function useCancelRegistration() {
  const invalidate = useInvalidateLessons();
  return useMutation({
    mutationFn: async ({ lessonId, reason }: { lessonId: string; reason: string }) => {
      const result = await cancelRegistration(lessonId, reason);
      void cancelLessonReminder(lessonId);
      return result;
    },
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
