import type { BadgeTone } from '@/components/Badges';
import { CANCELLATION_LEAD_MINUTES, REGISTRATION_LEAD_MINUTES } from '@/constants/lessons';
import type { TranslationKey } from '@/i18n/strings';
import type { LessonStatus } from '@/types/models';
import { addMinutes } from '@/utils/date';

export type LessonAvailabilityState =
  | 'cancelled'
  | 'completed'
  | 'in_progress'
  | 'registered'
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
  full: 'full',
  closed: 'registrationClosed',
  deadline_passed: 'registrationClosed',
  open: 'open',
};

export interface LessonAvailability {
  state: LessonAvailabilityState;
  tone: BadgeTone;
  canJoin: boolean;
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

/**
 * What a player can do with a lesson right now. This only drives the UI:
 * join_lesson and cancel_registration re-check every rule in the database.
 */
export function getLessonAvailability(
  lesson: LessonAvailabilityInput,
  isRegistered: boolean,
  now: Date = new Date(),
): LessonAvailability {
  const start = new Date(lesson.start_time);
  const end = new Date(lesson.end_time);
  const registrationDeadline = registrationClosesAt(lesson);
  const cancellationDeadline = cancellationClosesAt(lesson);

  const result = (
    state: LessonAvailabilityState,
    tone: BadgeTone,
    extra: Partial<Pick<LessonAvailability, 'canJoin' | 'canCancel'>> = {},
  ): LessonAvailability => ({
    state,
    tone,
    canJoin: false,
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
  if (lesson.registered_count >= lesson.capacity) return result('full', 'warning');
  if (!lesson.registration_open) return result('closed', 'neutral');
  if (now > registrationDeadline) return result('deadline_passed', 'neutral');
  return result('open', 'success', { canJoin: true });
}
