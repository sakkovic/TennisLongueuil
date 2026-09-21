import { toDate, type DateInput } from '@/utils/date';

export const LESSON_REMINDER_LEAD_MS = 24 * 60 * 60 * 1000;

export interface LessonReminderInput {
  lessonId: string;
  title: string;
  startTime: DateInput;
}

export function reminderIdentifier(lessonId: string): string {
  return `lesson-reminder:${lessonId}`;
}

/** 24 hours before the lesson, or null when that moment is already past. */
export function reminderAt(startTime: DateInput, now: Date = new Date()): Date | null {
  const when = new Date(toDate(startTime).getTime() - LESSON_REMINDER_LEAD_MS);
  return when.getTime() > now.getTime() ? when : null;
}
