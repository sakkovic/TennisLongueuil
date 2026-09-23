import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useFocusEffect } from 'expo-router';
import { useCallback, useRef } from 'react';

import { queryKeys } from '@/lib/queryClient';
import { supabase } from '@/lib/supabase';
import type { AttendanceStatus, LessonStatus } from '@/types/models';

import {
  createLessons,
  fetchFollowingInSeries,
  setLessonInvites,
  fetchLesson,
  fetchPastLessons,
  fetchUpcomingLessons,
  setAttendance,
  setLessonsStatus,
  setLessonStatus,
  updateLesson,
  updateLessons,
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

/**
 * Creates one lesson, a weekly series, or saves an edit. Always resolves to
 * the ids that were written, oldest first.
 */
export interface SaveLessonInput {
  lessonId?: string;
  inputs: LessonInput[];
  /** Guests of a private lesson; empty for a lesson open to everyone. */
  invitedPlayerIds: string[];
}

export function useSaveLesson() {
  const invalidate = useInvalidateLessons();
  return useMutation({
    mutationFn: async ({ lessonId, inputs, invitedPlayerIds }: SaveLessonInput) => {
      const ids = lessonId
        ? await updateLesson(lessonId, inputs[0]).then(() => [lessonId])
        : await createLessons(inputs);
      await setLessonInvites(ids, inputs[0].is_private ? invitedPlayerIds : []);
      return ids;
    },
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

/**
 * This lesson and the later, still-scheduled lessons of its weekly series.
 * Empty for a lesson that is not part of a series.
 */
export function useFollowingInSeries(
  lesson: { series_id: string | null; start_time: string } | null | undefined,
) {
  return useQuery({
    queryKey: queryKeys.seriesFrom(lesson?.series_id ?? null, lesson?.start_time ?? ''),
    queryFn: () => (lesson ? fetchFollowingInSeries(lesson) : Promise.resolve([])),
    enabled: Boolean(lesson?.series_id),
  });
}

/** Saves several lessons at once (a series edit): all of them or none. */
export function useUpdateLessons() {
  const invalidate = useInvalidateLessons();
  return useMutation({
    mutationFn: async ({
      lessons,
      invitedPlayerIds,
    }: {
      lessons: (LessonInput & { id: string })[];
      invitedPlayerIds: string[];
    }) => {
      await updateLessons(lessons);
      await setLessonInvites(
        lessons.map((lesson) => lesson.id),
        lessons[0]?.is_private ? invitedPlayerIds : [],
      );
    },
    onSettled: invalidate,
  });
}

export function useSetLessonsStatus() {
  const invalidate = useInvalidateLessons();
  return useMutation({
    mutationFn: ({ lessonIds, status }: { lessonIds: string[]; status: LessonStatus }) =>
      setLessonsStatus(lessonIds, status),
    onSettled: invalidate,
  });
}

export function useSetAttendance() {
  const invalidate = useInvalidateLessons();
  return useMutation({
    mutationFn: ({
      registrationId,
      status,
    }: {
      registrationId: string;
      status: AttendanceStatus | null;
    }) => setAttendance(registrationId, status),
    onSettled: invalidate,
  });
}
