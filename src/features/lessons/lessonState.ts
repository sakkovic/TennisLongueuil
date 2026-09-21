import type { BadgeTone } from '@/components/Badges';
import type { LessonStatus } from '@/types/models';

export type LessonAvailabilityState =
  | 'cancelled'
  | 'completed'
  | 'in_progress'
  | 'registered'
  | 'full'
  | 'closed'
  | 'deadline_passed'
  | 'open';

export interface LessonAvailability {
  state: LessonAvailabilityState;
  label: string;
  tone: BadgeTone;
  canJoin: boolean;
  canCancel: boolean;
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

/**
 * What a player can do with a lesson right now. This only drives the UI:
 * join_lesson re-checks every rule atomically in the database.
 */
export function getLessonAvailability(
  lesson: LessonAvailabilityInput,
  isRegistered: boolean,
  now: Date = new Date(),
): LessonAvailability {
  const start = new Date(lesson.start_time);
  const end = new Date(lesson.end_time);

  const result = (
    state: LessonAvailabilityState,
    label: string,
    tone: BadgeTone,
    extra: Partial<Pick<LessonAvailability, 'canJoin' | 'canCancel'>> = {},
  ): LessonAvailability => ({ state, label, tone, canJoin: false, canCancel: false, ...extra });

  if (lesson.status === 'cancelled') return result('cancelled', 'Lesson cancelled', 'danger');
  if (lesson.status === 'completed' || end <= now)
    return result('completed', 'Completed', 'neutral');
  if (start <= now) return result('in_progress', 'In progress', 'info');
  if (isRegistered) {
    return result('registered', "You're registered", 'success', { canCancel: true });
  }
  if (lesson.registered_count >= lesson.capacity) return result('full', 'Full', 'danger');
  if (!lesson.registration_open) return result('closed', 'Registration closed', 'neutral');
  if (lesson.registration_deadline && new Date(lesson.registration_deadline) < now) {
    return result('deadline_passed', 'Registration closed', 'neutral');
  }
  return result('open', 'Open', 'success', { canJoin: true });
}
