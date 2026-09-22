import type { QueryData } from '@supabase/supabase-js';

import { supabase } from '@/lib/supabase';
import type { Json } from '@/types/database';
import type { AttendanceStatus, LessonStatus } from '@/types/models';

/**
 * One query shape for every lesson screen. RLS decides which rows are
 * included: players get their own registrations plus other players' joined
 * and waitlisted ones (never other players' cancellation reasons), and only
 * their own attendance; admins get everything.
 */
const LESSON_COLUMNS = `
  id, title, description, start_time, end_time, location, court_count, capacity,
  registered_count, waitlist_count, registration_open, registration_deadline, status,
  player_level_id, series_id,
  level:player_levels ( id, name, rank ),
  registrations:lesson_registrations (
    id, player_id, status, joined_at, cancelled_at, cancellation_reason, promoted_at,
    player:profiles ( id, full_name, avatar_path, updated_at ),
    attendance:lesson_attendance ( status )
  )
`;

const lessonsQuery = () => supabase.from('lessons').select(LESSON_COLUMNS);

export type Lesson = QueryData<ReturnType<typeof lessonsQuery>>[number];
export type LessonRegistration = Lesson['registrations'][number];

/** Lessons that have not ended yet (including cancelled ones, shown with a badge). */
export async function fetchUpcomingLessons(): Promise<Lesson[]> {
  const { data, error } = await lessonsQuery()
    .gt('end_time', new Date().toISOString())
    .order('start_time', { ascending: true })
    .limit(100);
  if (error) throw error;
  return data;
}

export async function fetchPastLessons(): Promise<Lesson[]> {
  const { data, error } = await lessonsQuery()
    .lte('end_time', new Date().toISOString())
    .order('start_time', { ascending: false })
    .limit(50);
  if (error) throw error;
  return data;
}

export async function fetchLesson(lessonId: string): Promise<Lesson | null> {
  const { data, error } = await lessonsQuery().eq('id', lessonId).maybeSingle();
  if (error) throw error;
  return data;
}

export interface LessonInput {
  title: string;
  description: string | null;
  start_time: string;
  end_time: string;
  location: string;
  court_count: number;
  player_level_id: number | null;
  registration_open: boolean;
  registration_deadline: string | null;
}

/**
 * Admin only (enforced by RLS). Capacity is derived by the database.
 *
 * A weekly series is a single multi-row insert, so the whole block either
 * appears or it doesn't — the coach never ends up with half a series. The
 * occurrences share a series_id, so the coach can later change "this lesson
 * and the following ones" together; otherwise each one is an ordinary lesson.
 */
export async function createLessons(inputs: LessonInput[]): Promise<string[]> {
  const seriesId = inputs.length > 1 ? newSeriesId() : null;
  const { data, error } = await supabase
    .from('lessons')
    .insert(inputs.map((input) => ({ ...input, series_id: seriesId })))
    .select('id, start_time')
    .order('start_time', { ascending: true });
  if (error) throw error;
  return data.map((row) => row.id);
}

async function updateLessonColumns(
  lessonId: string,
  changes: Partial<LessonInput> & { status?: LessonStatus },
): Promise<void> {
  const { data, error } = await supabase
    .from('lessons')
    .update(changes)
    .eq('id', lessonId)
    .select('id');
  if (error) throw error;
  // RLS silently filters rows a non-admin may not update.
  if (!data || data.length === 0) throw new Error('NOT_AUTHORIZED');
}

export function updateLesson(lessonId: string, input: LessonInput): Promise<void> {
  return updateLessonColumns(lessonId, input);
}

/** Lessons are cancelled (kept as history), never deleted. */
export function setLessonStatus(lessonId: string, status: LessonStatus): Promise<void> {
  return updateLessonColumns(lessonId, { status });
}

/** Cancels or reinstates several lessons in one statement (all or none). */
export async function setLessonsStatus(lessonIds: string[], status: LessonStatus): Promise<void> {
  const { data, error } = await supabase
    .from('lessons')
    .update({ status })
    .in('id', lessonIds)
    .select('id');
  if (error) throw error;
  if (!data || data.length !== lessonIds.length) throw new Error('NOT_AUTHORIZED');
}

/** Saves several lessons at once; the database applies all of them or none. */
export async function updateLessons(lessons: (LessonInput & { id: string })[]): Promise<void> {
  const { error } = await supabase.rpc('admin_update_lessons', {
    p_lessons: lessons as unknown as Json,
  });
  if (error) throw error;
}

const SERIES_COLUMNS =
  'id, title, description, start_time, end_time, location, court_count, player_level_id, registration_open, registration_deadline, registered_count';

export interface SeriesLesson extends LessonInput {
  id: string;
  registered_count: number;
}

/**
 * The given lesson and the later lessons of its series that are still
 * scheduled and have not started — what "this and following" applies to.
 */
export async function fetchFollowingInSeries(lesson: {
  series_id: string | null;
  start_time: string;
}): Promise<SeriesLesson[]> {
  if (!lesson.series_id) return [];
  const { data, error } = await supabase
    .from('lessons')
    .select(SERIES_COLUMNS)
    .eq('series_id', lesson.series_id)
    .eq('status', 'scheduled')
    .gte('start_time', lesson.start_time)
    .gt('start_time', new Date().toISOString())
    .order('start_time', { ascending: true });
  if (error) throw error;
  return data;
}

/** RFC 4122 version 4 id; only groups lessons, so it needs no crypto strength. */
function newSeriesId(): string {
  const random = globalThis.crypto?.randomUUID?.();
  if (random) return random;
  return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, (char) => {
    const value = Math.floor(Math.random() * 16);
    return (char === 'x' ? value : (value & 0x3) | 0x8).toString(16);
  });
}

const byJoinedAt = (a: LessonRegistration, b: LessonRegistration) =>
  a.joined_at.localeCompare(b.joined_at);

export function getActiveRegistrations(lesson: Lesson): LessonRegistration[] {
  return lesson.registrations.filter((r) => r.status === 'joined').sort(byJoinedAt);
}

/**
 * Coach only (checked by the database): mark a registered player present or
 * absent, or clear the mark with null. Opens 30 minutes before the lesson.
 */
export async function setAttendance(
  registrationId: string,
  status: AttendanceStatus | null,
): Promise<void> {
  const { error } = await supabase.rpc('admin_set_attendance', {
    p_registration_id: registrationId,
    ...(status ? { p_status: status } : {}),
  });
  if (error) throw error;
}

/** Players waiting for a spot, first in line first. */
export function getWaitlist(lesson: Lesson): LessonRegistration[] {
  return lesson.registrations.filter((r) => r.status === 'waitlisted').sort(byJoinedAt);
}

/** 1 for the first player in line; null when the user is not waiting. */
export function getWaitlistPosition(lesson: Lesson, userId: string | undefined): number | null {
  const index = getWaitlist(lesson).findIndex((r) => r.player_id === userId);
  return index === -1 ? null : index + 1;
}

export function getCancelledRegistrations(lesson: Lesson): LessonRegistration[] {
  return lesson.registrations
    .filter((r) => r.status === 'cancelled')
    .sort((a, b) => (b.cancelled_at ?? '').localeCompare(a.cancelled_at ?? ''));
}

export function findMyRegistration(
  lesson: Lesson,
  userId: string | undefined,
): LessonRegistration | undefined {
  return userId ? lesson.registrations.find((r) => r.player_id === userId) : undefined;
}
