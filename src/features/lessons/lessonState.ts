import type { BadgeTone } from '@/components/Badges';
import {
  ATTENDANCE_LEAD_MINUTES,
  CANCELLATION_LEAD_MINUTES,
  REGISTRATION_LEAD_MINUTES,
} from '@/constants/lessons';
import type { TranslationKey } from '@/i18n/strings';
import type { LessonStatus, RegistrationStatus } from '@/types/models';
import { addMinutes } from '@/utils/date';

export type LessonAvailabilityState =
  | 'cancelled'
  | 'completed'
  | 'in_progress'
  | 'registered'
  | 'waitlisted'
  | 'full'
  | 'closed'
  | 'deadline_passed'
  | 'open';

/** Translated status label for each state. */
export const AVAILABILITY_LABEL_KEYS: Record<LessonAvailabilityState, TranslationKey> = {
  cancelled: 'lessonCancelled',
  completed: 'completed',
  in_progress: 'inProgress',
  registered: 'youreRegistered',
  waitlisted: 'onWaitlist',
  full: 'full',
  closed: 'registrationClosed',
  deadline_passed: 'registrationClosed',
  open: 'open',
};

export interface LessonAvailability {
  state: LessonAvailabilityState;
  tone: BadgeTone;
  canJoin: boolean;
  /** Full, but registration is still open: the player can queue. */
  canJoinWaitlist: boolean;
  /** Release a spot (until 24 hours before) or leave the waitlist (until the start). */
  canCancel: boolean;
  /** When registration closes: the lesson's own deadline, or 4 hours before. */
  registrationClosesAt: Date;
  /** When players can no longer cancel: 24 hours before the lesson. */
  cancellationClosesAt: Date;
}

export interface LessonAvailabilityInput {
  status: LessonStatus;
  start_time: string;
  end_time: string;
  registration_open: boolean;
  registration_deadline: string | null;
  registered_count: number;
  capacity: number;
}

export function registrationClosesAt(
  lesson: Pick<LessonAvailabilityInput, 'start_time' | 'registration_deadline'>,
): Date {
  return lesson.registration_deadline
    ? new Date(lesson.registration_deadline)
    : addMinutes(new Date(lesson.start_time), -REGISTRATION_LEAD_MINUTES);
}

export function cancellationClosesAt(lesson: Pick<LessonAvailabilityInput, 'start_time'>): Date {
  return addMinutes(new Date(lesson.start_time), -CANCELLATION_LEAD_MINUTES);
}

/** The coach can take attendance from 30 minutes before a lesson that was not cancelled. */
export function canTakeAttendance(
  lesson: Pick<LessonAvailabilityInput, 'start_time' | 'status'>,
  now: Date = new Date(),
): boolean {
  return (
    lesson.status !== 'cancelled' &&
    now >= addMinutes(new Date(lesson.start_time), -ATTENDANCE_LEAD_MINUTES)
  );
}

/**
 * What a player can do with a lesson right now. This only drives the UI:
 * join_lesson, join_waitlist and cancel_registration re-check every rule in
 * the database.
 *
 * `registration` is the player's own registration status (`true` is
 * shorthand for 'joined').
 */
export function getLessonAvailability(
  lesson: LessonAvailabilityInput,
  registration: RegistrationStatus | boolean | null | undefined,
  now: Date = new Date(),
): LessonAvailability {
  const isRegistered = registration === true || registration === 'joined';
  const isWaitlisted = registration === 'waitlisted';
  const start = new Date(lesson.start_time);
  const end = new Date(lesson.end_time);
  const registrationDeadline = registrationClosesAt(lesson);
  const cancellationDeadline = cancellationClosesAt(lesson);

  const result = (
    state: LessonAvailabilityState,
    tone: BadgeTone,
    extra: Partial<Pick<LessonAvailability, 'canJoin' | 'canJoinWaitlist' | 'canCancel'>> = {},
  ): LessonAvailability => ({
    state,
    tone,
    canJoin: false,
    canJoinWaitlist: false,
    canCancel: false,
    registrationClosesAt: registrationDeadline,
    cancellationClosesAt: cancellationDeadline,
    ...extra,
  });

  if (lesson.status === 'cancelled') return result('cancelled', 'danger');
  if (lesson.status === 'completed' || end <= now) return result('completed', 'neutral');
  if (start <= now) return result('in_progress', 'info');
  if (isRegistered) {
    return result('registered', 'success', { canCancel: now < cancellationDeadline });
  }
  if (isWaitlisted) return result('waitlisted', 'info', { canCancel: true });
  const registrationOpen = lesson.registration_open && now <= registrationDeadline;
  if (lesson.registered_count >= lesson.capacity) {
    return result('full', 'warning', { canJoinWaitlist: registrationOpen });
  }
  if (!lesson.registration_open) return result('closed', 'neutral');
  if (now > registrationDeadline) return result('deadline_passed', 'neutral');
  return result('open', 'success', { canJoin: true });
}
