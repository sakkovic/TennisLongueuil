import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useFocusEffect } from 'expo-router';
import { useCallback, useRef } from 'react';

import { queryKeys } from '@/lib/queryClient';
import { supabase } from '@/lib/supabase';
import type { LessonStatus } from '@/types/models';

import {
  createLesson,
  fetchLesson,
  fetchPastLessons,
  fetchUpcomingLessons,
  setLessonStatus,
  updateLesson,
  type LessonInput,
} from './api';

export function useUpcomingLessons() {
  return useQuery({ queryKey: queryKeys.upcomingLessons, queryFn: fetchUpcomingLessons });
}

export function usePastLessons(enabled = true) {
  return useQuery({ queryKey: queryKeys.pastLessons, queryFn: fetchPastLessons, enabled });
}

export function useLesson(lessonId: string) {
  return useQuery({
    queryKey: queryKeys.lesson(lessonId),
    queryFn: () => fetchLesson(lessonId),
    enabled: Boolean(lessonId),
  });
}

/** Refresh everything that shows lessons or registrations. */
export function useInvalidateLessons() {
  const queryClient = useQueryClient();
  return useCallback(
    () =>
      Promise.all([
        queryClient.invalidateQueries({ queryKey: queryKeys.lessons }),
        queryClient.invalidateQueries({ queryKey: ['registrations'] }),
        queryClient.invalidateQueries({ queryKey: ['profile'] }),
        queryClient.invalidateQueries({ queryKey: queryKeys.members }),
      ]),
    [queryClient],
  );
}

/**
 * Live updates while a lesson screen is focused.
 *
 * Every join/cancel updates lessons.registered_count, so listening to the
 * lessons table (optionally one row) is enough to refresh counts, participant
 * lists and full/available state. The subscription exists only while the
 * screen is focused and is removed on blur/unmount. On re-focus, data is
 * refreshed to catch up on anything missed in the meantime.
 */
export function useLessonsRealtime(lessonId?: string) {
  const invalidate = useInvalidateLessons();
  const hasFocusedBefore = useRef(false);

  useFocusEffect(
    useCallback(() => {
      if (hasFocusedBefore.current) void invalidate();
      hasFocusedBefore.current = true;

      const channel = supabase
        .channel(lessonId ? `lesson-${lessonId}` : 'lessons-list')
        .on(
          'postgres_changes',
          {
            event: '*',
            schema: 'public',
            table: 'lessons',
            ...(lessonId ? { filter: `id=eq.${lessonId}` } : {}),
          },
          () => void invalidate(),
        )
        .subscribe();

      return () => {
        void supabase.removeChannel(channel);
      };
    }, [lessonId, invalidate]),
  );
}

export function useSaveLesson() {
  const invalidate = useInvalidateLessons();
  return useMutation({
    mutationFn: ({ lessonId, input }: { lessonId?: string; input: LessonInput }) =>
      lessonId ? updateLesson(lessonId, input).then(() => lessonId) : createLesson(input),
    onSettled: invalidate,
  });
}

export function useSetLessonStatus() {
  const invalidate = useInvalidateLessons();
  return useMutation({
    mutationFn: ({ lessonId, status }: { lessonId: string; status: LessonStatus }) =>
      setLessonStatus(lessonId, status),
    onSettled: invalidate,
  });
}
