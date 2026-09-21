import { z } from 'zod';

import {
  DEFAULT_LESSON_DURATION_MINUTES,
  DEFAULT_LESSON_LOCATION,
  DEFAULT_LESSON_TITLE,
  MAX_COURTS,
  MAX_DESCRIPTION_LENGTH,
  MAX_LESSON_DURATION_HOURS,
  MAX_LOCATION_LENGTH,
  MAX_TITLE_LENGTH,
  MIN_COURTS,
} from '@/constants/lessons';
import { addMinutes, combineDateAndTime } from '@/utils/date';

import type { Lesson, LessonInput } from './api';

/**
 * Admin lesson form. Mirrors the database CHECK constraints so the coach gets
 * instant feedback; the database still validates every write.
 */
export function createLessonFormSchema({ requireFutureStart }: { requireFutureStart: boolean }) {
  return z
    .object({
      title: z
        .string()
        .trim()
        .min(1, 'Please enter a title.')
        .max(MAX_TITLE_LENGTH, `Keep the title under ${MAX_TITLE_LENGTH} characters.`),
      date: z.date(),
      startTime: z.date(),
      endTime: z.date(),
      location: z
        .string()
        .trim()
        .min(1, 'Please enter a location.')
        .max(MAX_LOCATION_LENGTH, `Keep the location under ${MAX_LOCATION_LENGTH} characters.`),
      courtCount: z
        .number()
        .int()
        .min(MIN_COURTS, 'A lesson needs at least 1 court.')
        .max(MAX_COURTS, `A lesson can use at most ${MAX_COURTS} courts.`),
      playerLevelId: z.number().nullable(),
      description: z
        .string()
        .max(
          MAX_DESCRIPTION_LENGTH,
          `Keep the description under ${MAX_DESCRIPTION_LENGTH} characters.`,
        ),
      registrationOpen: z.boolean(),
      hasDeadline: z.boolean(),
      deadline: z.date(),
    })
    .superRefine((values, ctx) => {
      const start = combineDateAndTime(values.date, values.startTime);
      const end = combineDateAndTime(values.date, values.endTime);

      if (requireFutureStart && start <= new Date()) {
        ctx.addIssue({
          code: 'custom',
          path: ['startTime'],
          message: 'The lesson must start in the future.',
        });
      }
      if (end <= start) {
        ctx.addIssue({
          code: 'custom',
          path: ['endTime'],
          message: 'The end time must be after the start time.',
        });
      } else if (end.getTime() - start.getTime() > MAX_LESSON_DURATION_HOURS * 3_600_000) {
        ctx.addIssue({
          code: 'custom',
          path: ['endTime'],
          message: `A lesson cannot last more than ${MAX_LESSON_DURATION_HOURS} hours.`,
        });
      }
      if (values.hasDeadline && values.deadline > start) {
        ctx.addIssue({
          code: 'custom',
          path: ['deadline'],
          message: 'The registration deadline must be before the lesson starts.',
        });
      }
    });
}

export type LessonFormValues = z.infer<ReturnType<typeof createLessonFormSchema>>;

/** New lesson: tomorrow 6:00 PM – 7:30 PM, 1 court, at the default location. */
export function defaultLessonFormValues(now: Date = new Date()): LessonFormValues {
  const tomorrow = new Date(now.getFullYear(), now.getMonth(), now.getDate() + 1);
  const start = new Date(tomorrow.getFullYear(), tomorrow.getMonth(), tomorrow.getDate(), 18, 0);
  return {
    title: DEFAULT_LESSON_TITLE,
    date: tomorrow,
    startTime: start,
    endTime: addMinutes(start, DEFAULT_LESSON_DURATION_MINUTES),
    location: DEFAULT_LESSON_LOCATION,
    courtCount: 1,
    playerLevelId: null,
    description: '',
    registrationOpen: true,
    hasDeadline: false,
    deadline: addMinutes(start, -120),
  };
}

export function lessonToFormValues(lesson: Lesson): LessonFormValues {
  const start = new Date(lesson.start_time);
  const end = new Date(lesson.end_time);
  return {
    title: lesson.title,
    date: new Date(start.getFullYear(), start.getMonth(), start.getDate()),
    startTime: start,
    endTime: end,
    location: lesson.location,
    courtCount: lesson.court_count,
    playerLevelId: lesson.player_level_id,
    description: lesson.description ?? '',
    registrationOpen: lesson.registration_open,
    hasDeadline: lesson.registration_deadline !== null,
    deadline: lesson.registration_deadline
      ? new Date(lesson.registration_deadline)
      : addMinutes(start, -120),
  };
}

/** Form values → database row. Local wall-clock times become absolute instants. */
export function toLessonInput(values: LessonFormValues): LessonInput {
  const start = combineDateAndTime(values.date, values.startTime);
  const end = combineDateAndTime(values.date, values.endTime);
  const description = values.description.trim();
  return {
    title: values.title.trim(),
    description: description.length > 0 ? description : null,
    start_time: start.toISOString(),
    end_time: end.toISOString(),
    location: values.location.trim(),
    court_count: values.courtCount,
    player_level_id: values.playerLevelId,
    registration_open: values.registrationOpen,
    registration_deadline: values.hasDeadline ? values.deadline.toISOString() : null,
  };
}
