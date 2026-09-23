import { z } from 'zod';

import {
  DEFAULT_DEADLINE_OFFSET_MINUTES,
  DEFAULT_LESSON_DURATION_MINUTES,
  DEFAULT_LESSON_LOCATION,
  DEFAULT_LESSON_TITLE,
  DEFAULT_REPEAT_WEEKS,
  MAX_COURTS,
  MAX_DESCRIPTION_LENGTH,
  MAX_LESSON_DURATION_HOURS,
  MAX_LOCATION_LENGTH,
  MAX_REPEAT_WEEKS,
  MAX_TITLE_LENGTH,
  MIN_COURTS,
  MIN_REPEAT_WEEKS,
  REGISTRATION_LEAD_MINUTES,
} from '@/constants/lessons';
import { capacityForCourts } from '@/utils/capacity';
import { addMinutes, addWeeks, combineDateAndTime } from '@/utils/date';

import { getInvitedPlayerIds, type Lesson, type LessonInput } from './api';

const MAX_DURATION_MINUTES = MAX_LESSON_DURATION_HOURS * 60;

/**
 * Admin lesson form. Mirrors the database CHECK constraints so the coach gets
 * instant feedback; the database still validates every write.
 *
 * The coach picks a start time and a length rather than two clock times, and a
 * deadline as "how long before the lesson" rather than an absolute instant.
 * Both make a weekly series meaningful: every occurrence gets the same length
 * and the same amount of notice.
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
      durationMinutes: z
        .number()
        .int()
        .min(15, 'A lesson lasts at least 15 minutes.')
        .max(
          MAX_DURATION_MINUTES,
          `A lesson cannot last more than ${MAX_LESSON_DURATION_HOURS} hours.`,
        ),
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
      /** Minutes before the start when registration closes (0 = until the lesson starts). */
      deadlineOffsetMinutes: z
        .number()
        .int()
        .min(REGISTRATION_LEAD_MINUTES, 'Registration must close before the lesson starts.'),
      repeatWeekly: z.boolean(),
      repeatWeeks: z.number().int(),
      /** Private lesson: only the chosen players see it and hold a spot. */
      isPrivate: z.boolean(),
      invitedPlayerIds: z.array(z.string()),
    })
    .superRefine((values, ctx) => {
      if (requireFutureStart && firstStart(values) <= new Date()) {
        ctx.addIssue({
          code: 'custom',
          path: ['startTime'],
          message: 'The lesson must start in the future.',
        });
      }
      if (values.isPrivate && values.invitedPlayerIds.length === 0) {
        ctx.addIssue({
          code: 'custom',
          path: ['invitedPlayerIds'],
          message: 'Choose at least one player for a private lesson.',
        });
      }
      if (values.invitedPlayerIds.length > capacityForCourts(values.courtCount)) {
        ctx.addIssue({
          code: 'custom',
          path: ['invitedPlayerIds'],
          message: 'There are more players than spots. Add a court or remove players.',
        });
      }
      if (
        values.repeatWeekly &&
        (values.repeatWeeks < MIN_REPEAT_WEEKS || values.repeatWeeks > MAX_REPEAT_WEEKS)
      ) {
        ctx.addIssue({
          code: 'custom',
          path: ['repeatWeeks'],
          message: `A weekly series runs for ${MIN_REPEAT_WEEKS} to ${MAX_REPEAT_WEEKS} weeks.`,
        });
      }
    });
}

export type LessonFormValues = z.infer<ReturnType<typeof createLessonFormSchema>>;

/** The first (or only) occurrence's start, as a local wall-clock instant. */
export function firstStart(values: Pick<LessonFormValues, 'date' | 'startTime'>): Date {
  return combineDateAndTime(values.date, values.startTime);
}

export function endOf(values: Pick<LessonFormValues, 'date' | 'startTime' | 'durationMinutes'>) {
  return addMinutes(firstStart(values), values.durationMinutes);
}

/** How many lesson rows this form will create. */
export function occurrenceCount(
  values: Pick<LessonFormValues, 'repeatWeekly' | 'repeatWeeks'>,
): number {
  return values.repeatWeekly ? values.repeatWeeks : 1;
}

/** The start of every occurrence, same weekday and clock time each week. */
export function occurrenceStarts(values: LessonFormValues): Date[] {
  const start = firstStart(values);
  return Array.from({ length: occurrenceCount(values) }, (_, week) => addWeeks(start, week));
}

/** New lesson: tomorrow at 6:00 PM, 1 court, weekly, open until it starts. */
export function defaultLessonFormValues(now: Date = new Date()): LessonFormValues {
  const tomorrow = new Date(now.getFullYear(), now.getMonth(), now.getDate() + 1);
  return {
    title: DEFAULT_LESSON_TITLE,
    date: tomorrow,
    startTime: new Date(tomorrow.getFullYear(), tomorrow.getMonth(), tomorrow.getDate(), 18, 0),
    durationMinutes: DEFAULT_LESSON_DURATION_MINUTES,
    location: DEFAULT_LESSON_LOCATION,
    courtCount: 1,
    playerLevelId: null,
    description: '',
    registrationOpen: true,
    deadlineOffsetMinutes: DEFAULT_DEADLINE_OFFSET_MINUTES,
    repeatWeekly: true,
    repeatWeeks: DEFAULT_REPEAT_WEEKS,
    isPrivate: false,
    invitedPlayerIds: [],
  };
}

export function lessonToFormValues(lesson: Lesson): LessonFormValues {
  const start = new Date(lesson.start_time);
  const end = new Date(lesson.end_time);
  const deadline = lesson.registration_deadline ? new Date(lesson.registration_deadline) : null;
  return {
    title: lesson.title,
    date: new Date(start.getFullYear(), start.getMonth(), start.getDate()),
    startTime: start,
    durationMinutes: Math.round((end.getTime() - start.getTime()) / 60_000),
    location: lesson.location,
    courtCount: lesson.court_count,
    playerLevelId: lesson.player_level_id,
    description: lesson.description ?? '',
    registrationOpen: lesson.registration_open,
    deadlineOffsetMinutes: deadline
      ? Math.max(0, Math.round((start.getTime() - deadline.getTime()) / 60_000))
      : DEFAULT_DEADLINE_OFFSET_MINUTES,
    // Editing never repeats: each occurrence is an independent lesson.
    repeatWeekly: false,
    repeatWeeks: DEFAULT_REPEAT_WEEKS,
    isPrivate: lesson.is_private,
    invitedPlayerIds: getInvitedPlayerIds(lesson),
  };
}

/**
 * Form values → database rows. Local wall-clock times become absolute
 * instants, one row per weekly occurrence.
 */
export function toLessonInputs(values: LessonFormValues): LessonInput[] {
  const description = values.description.trim();
  const shared = {
    title: values.title.trim(),
    description: description.length > 0 ? description : null,
    location: values.location.trim(),
    court_count: values.courtCount,
    player_level_id: values.playerLevelId,
    registration_open: values.registrationOpen,
    is_private: values.isPrivate,
  };

  return occurrenceStarts(values).map((start) => ({
    ...shared,
    start_time: start.toISOString(),
    end_time: addMinutes(start, values.durationMinutes).toISOString(),
    registration_deadline: addMinutes(start, -values.deadlineOffsetMinutes).toISOString(),
  }));
}
