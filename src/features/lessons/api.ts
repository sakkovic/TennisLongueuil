import type { QueryData } from '@supabase/supabase-js';

import { supabase } from '@/lib/supabase';
import type { LessonStatus } from '@/types/models';

/**
 * One query shape for every lesson screen. RLS decides which registrations
 * are included: players get their own rows plus other players' ACTIVE rows
 * (never other players' cancellation reasons); admins get everything.
 */
const LESSON_COLUMNS = `
  id, title, description, start_time, end_time, location, court_count, capacity,
  registered_count, registration_open, registration_deadline, status, player_level_id,
  level:player_levels ( id, name, rank ),
  registrations:lesson_registrations (
    id, player_id, status, joined_at, cancelled_at, cancellation_reason,
    player:profiles ( id, full_name, avatar_path, updated_at )
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

/** Admin only (enforced by RLS). Capacity is derived by the database. */
export async function createLesson(input: LessonInput): Promise<string> {
  const { data, error } = await supabase.from('lessons').insert(input).select('id').single();
  if (error) throw error;
  return data.id;
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

const byJoinedAt = (a: LessonRegistration, b: LessonRegistration) =>
  a.joined_at.localeCompare(b.joined_at);

export function getActiveRegistrations(lesson: Lesson): LessonRegistration[] {
  return lesson.registrations.filter((r) => r.status === 'joined').sort(byJoinedAt);
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
