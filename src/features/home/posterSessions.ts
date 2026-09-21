import { useQuery } from '@tanstack/react-query';

import { findMyRegistration, type Lesson } from '@/features/lessons/api';
import { getLessonAvailability } from '@/features/lessons/lessonState';
import type { TranslationKey } from '@/i18n/strings';
import { queryKeys } from '@/lib/queryClient';
import { supabase } from '@/lib/supabase';
import type { Database } from '@/types/database';

export type PosterSlotTone = 'open' | 'full' | 'registered' | 'closed';

/** One session tile on the home poster: when, and whether a spot is available. */
export interface PosterSlot {
  id: string;
  startTime: string;
  tone: PosterSlotTone;
  spotsLeft: number;
}

export type PublicSession = Database['public']['Functions']['upcoming_sessions']['Returns'][number];

/** Tiles for signed-in members, from the lessons they can already see. */
export function slotsFromLessons(
  lessons: Lesson[],
  userId: string | undefined,
  now: Date = new Date(),
  limit = 2,
): PosterSlot[] {
  return lessons
    .filter((lesson) => lesson.status === 'scheduled' && new Date(lesson.start_time) > now)
    .slice(0, limit)
    .map((lesson) => {
      const registered = findMyRegistration(lesson, userId)?.status === 'joined';
      const availability = getLessonAvailability(lesson, registered, now);
      const tone: PosterSlotTone = registered
        ? 'registered'
        : availability.state === 'full'
          ? 'full'
          : availability.canJoin
            ? 'open'
            : 'closed';
      return {
        id: lesson.id,
        startTime: lesson.start_time,
        tone,
        spotsLeft: Math.max(0, lesson.capacity - lesson.registered_count),
      };
    });
}

/** Tiles for visitors before sign-in, from the public upcoming_sessions() function. */
export function slotsFromPublicSessions(
  sessions: PublicSession[],
  now: Date = new Date(),
  limit = 2,
): PosterSlot[] {
  return sessions.slice(0, limit).map((session) => {
    const spotsLeft = Math.max(0, session.capacity - session.registered_count);
    const tone: PosterSlotTone =
      spotsLeft === 0 ? 'full' : now > new Date(session.registration_closes_at) ? 'closed' : 'open';
    return { id: session.id, startTime: session.start_time, tone, spotsLeft };
  });
}

/** The label on a tile's pill, e.g. "3 spots left", "Full", "You're in". */
export function slotLabel(slot: PosterSlot): {
  key: TranslationKey;
  vars?: Record<string, number>;
} {
  switch (slot.tone) {
    case 'registered':
      return { key: 'posterYoureIn' };
    case 'full':
      return { key: 'full' };
    case 'closed':
      return { key: 'registrationClosed' };
    default:
      return slot.spotsLeft === 1
        ? { key: 'spotsLeftOne' }
        : { key: 'spotsLeftOther', vars: { count: slot.spotsLeft } };
  }
}

async function fetchPublicSessions(): Promise<PublicSession[]> {
  const { data, error } = await supabase.rpc('upcoming_sessions', { p_limit: 3 });
  if (error) throw error;
  return data ?? [];
}

/** Next sessions for the welcome screen (works without signing in). */
export function usePublicSessions() {
  return useQuery({
    queryKey: queryKeys.publicSessions,
    queryFn: fetchPublicSessions,
    staleTime: 60_000,
  });
}
