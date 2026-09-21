import type { Lesson, LessonRegistration } from '@/features/lessons/api';
import type { PlayerRegistration } from '@/features/registrations/api';
import type { Member } from '@/types/models';

let sequence = 0;
const nextId = (prefix: string) => `${prefix}-${++sequence}`;

export function makeRegistration(
  overrides: Partial<LessonRegistration> & { name?: string } = {},
): LessonRegistration {
  const { name = 'Player', ...rest } = overrides;
  const playerId = rest.player_id ?? nextId('player');
  return {
    id: nextId('registration'),
    player_id: playerId,
    status: 'joined',
    joined_at: '2026-09-20T12:00:00.000Z',
    cancelled_at: null,
    cancellation_reason: null,
    player: {
      id: playerId,
      full_name: name,
      avatar_path: null,
      updated_at: '2026-09-01T00:00:00Z',
    },
    ...rest,
  };
}

/** A 1-court lesson on Monday September 28, 2026, 6:00–7:30 PM (Québec time). */
export function makeLesson(overrides: Partial<Lesson> = {}): Lesson {
  const registrations = overrides.registrations ?? [];
  return {
    id: nextId('lesson'),
    title: 'Group Tennis Lesson',
    description: null,
    start_time: '2026-09-28T22:00:00.000Z',
    end_time: '2026-09-28T23:30:00.000Z',
    location: 'Complexe Sportif Longueuil',
    court_count: 1,
    capacity: 4,
    registered_count: registrations.filter((r) => r.status === 'joined').length,
    registration_open: true,
    registration_deadline: null,
    status: 'scheduled',
    player_level_id: 2,
    level: { id: 2, name: 'Intermediate', rank: 20 },
    registrations,
    ...overrides,
  };
}

export function makePlayerRegistration(
  overrides: Partial<Omit<PlayerRegistration, 'lesson'>> & {
    lesson?: Partial<PlayerRegistration['lesson']>;
  } = {},
): PlayerRegistration {
  const { lesson, ...rest } = overrides;
  return {
    id: nextId('registration'),
    status: 'joined',
    joined_at: '2026-09-20T12:00:00.000Z',
    cancelled_at: null,
    cancellation_reason: null,
    ...rest,
    lesson: {
      id: nextId('lesson'),
      title: 'Tennis Lesson',
      start_time: '2026-09-28T22:00:00.000Z',
      end_time: '2026-09-28T23:30:00.000Z',
      location: 'Complexe Sportif Longueuil',
      status: 'scheduled',
      capacity: 4,
      registered_count: 1,
      ...lesson,
    },
  };
}

/** An approved, active player. Pass `active`/`approved_at` for other states. */
export function makeMember(overrides: Partial<Member> = {}): Member {
  const id = overrides.id ?? nextId('member');
  return {
    id,
    full_name: 'Player',
    email: `${id}@test.local`,
    phone: null,
    avatar_path: null,
    role: 'player',
    player_level_id: 2,
    player_level_name: 'Intermediate',
    active: true,
    approved_at: '2026-09-01T00:00:00.000Z',
    created_at: '2026-09-01T00:00:00.000Z',
    updated_at: '2026-09-01T00:00:00.000Z',
    upcoming_lessons_count: 0,
    ...overrides,
  };
}

/** "Now" for tests: Monday September 21, 2026, 9:00 AM in Québec. */
export const NOW = new Date('2026-09-21T13:00:00.000Z');
