import { addMinutes, startOfDay } from '@/utils/date';

import type { LessonInput, SeriesLesson } from './api';

const DAY_MS = 24 * 60 * 60 * 1000;

/** Whole local calendar days from `from` to `to` (DST-safe). */
function calendarDaysBetween(from: Date, to: Date): number {
  return Math.round((startOfDay(to).getTime() - startOfDay(from).getTime()) / DAY_MS);
}

/**
 * Applies an edit made to one lesson to it and the following lessons of its
 * series.
 *
 * Every field is copied from the edited lesson. Times follow the same wall
 * clock each week: if the coach moves the lesson from Monday 6:00 PM to
 * Tuesday 7:00 PM, every following occurrence moves to its Tuesday at
 * 7:00 PM, whatever the daylight-saving offset that week. The registration
 * deadline keeps the same lead time before each start.
 */
export function applyEditToSeries(
  original: { id: string; start_time: string },
  edited: LessonInput,
  following: readonly SeriesLesson[],
): (LessonInput & { id: string })[] {
  const originalStart = new Date(original.start_time);
  const editedStart = new Date(edited.start_time);
  const dayShift = calendarDaysBetween(originalStart, editedStart);
  const durationMinutes = Math.round(
    (new Date(edited.end_time).getTime() - editedStart.getTime()) / 60_000,
  );
  const deadlineLeadMinutes = edited.registration_deadline
    ? Math.round(
        (editedStart.getTime() - new Date(edited.registration_deadline).getTime()) / 60_000,
      )
    : null;

  return following.map((lesson) => {
    if (lesson.id === original.id) return { ...edited, id: lesson.id };

    const current = new Date(lesson.start_time);
    const start = new Date(
      current.getFullYear(),
      current.getMonth(),
      current.getDate() + dayShift,
      editedStart.getHours(),
      editedStart.getMinutes(),
      0,
      0,
    );
    return {
      ...edited,
      id: lesson.id,
      start_time: start.toISOString(),
      end_time: addMinutes(start, durationMinutes).toISOString(),
      registration_deadline:
        deadlineLeadMinutes === null ? null : addMinutes(start, -deadlineLeadMinutes).toISOString(),
    };
  });
}

/** The following lessons other than `lessonId` itself. */
export function laterInSeries(lessonId: string, following: readonly { id: string }[]): number {
  return following.filter((lesson) => lesson.id !== lessonId).length;
}
