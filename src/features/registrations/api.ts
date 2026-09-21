import type { QueryData } from '@supabase/supabase-js';

import { supabase } from '@/lib/supabase';
import type { RegistrationResult } from '@/types/models';

/**
 * Join a lesson. Capacity, duplicates, deadlines and account status are all
 * checked atomically by the join_lesson database function; the player is
 * taken from the session (auth.uid()), never from the app.
 */
export async function joinLesson(lessonId: string): Promise<RegistrationResult> {
  const { data, error } = await supabase.rpc('join_lesson', { p_lesson_id: lessonId });
  if (error) throw error;
  // Shape guaranteed by the SQL function (jsonb_build_object).
  return data as unknown as RegistrationResult;
}

/** Cancel the signed-in player's own registration. The row is kept as history. */
export async function cancelRegistration(
  lessonId: string,
  reason: string,
): Promise<RegistrationResult> {
  const trimmed = reason.trim();
  const { data, error } = await supabase.rpc('cancel_registration', {
    p_lesson_id: lessonId,
    ...(trimmed ? { p_reason: trimmed } : {}),
  });
  if (error) throw error;
  return data as unknown as RegistrationResult;
}

const PLAYER_REGISTRATION_COLUMNS = `
  id, status, joined_at, cancelled_at, cancellation_reason,
  lesson:lessons ( id, title, start_time, end_time, location, status, capacity, registered_count )
`;

const playerRegistrationsQuery = () =>
  supabase.from('lesson_registrations').select(PLAYER_REGISTRATION_COLUMNS);

export type PlayerRegistration = QueryData<ReturnType<typeof playerRegistrationsQuery>>[number];

/** A player's registrations (their own, or any member's for admins). */
export async function fetchPlayerRegistrations(playerId: string): Promise<PlayerRegistration[]> {
  const { data, error } = await playerRegistrationsQuery().eq('player_id', playerId);
  if (error) throw error;
  return data;
}

export type HistoryLabel = 'Registered' | 'Cancelled' | 'Lesson cancelled';

export interface SplitRegistrations {
  upcoming: PlayerRegistration[];
  history: PlayerRegistration[];
}

/**
 * Upcoming: active registrations for scheduled lessons that have not ended.
 * History: everything else (past lessons, own cancellations, cancelled lessons).
 */
export function splitRegistrations(
  registrations: PlayerRegistration[],
  now: Date = new Date(),
): SplitRegistrations {
  const upcoming: PlayerRegistration[] = [];
  const history: PlayerRegistration[] = [];
  for (const registration of registrations) {
    const isUpcoming =
      registration.status === 'joined' &&
      registration.lesson.status === 'scheduled' &&
      new Date(registration.lesson.end_time) > now;
    (isUpcoming ? upcoming : history).push(registration);
  }
  upcoming.sort((a, b) => a.lesson.start_time.localeCompare(b.lesson.start_time));
  history.sort((a, b) => b.lesson.start_time.localeCompare(a.lesson.start_time));
  return { upcoming, history };
}

export function getHistoryLabel(registration: PlayerRegistration): HistoryLabel {
  if (registration.lesson.status === 'cancelled') return 'Lesson cancelled';
  if (registration.status === 'cancelled') return 'Cancelled';
  return 'Registered';
}
