import { makeLesson, makeRegistration, NOW } from '@/test/fixtures';

import {
  slotLabel,
  slotsFromLessons,
  slotsFromPublicSessions,
  type PublicSession,
} from '../posterSessions';

const ME = 'player-me';

describe('slotsFromLessons', () => {
  it('shows the next two scheduled sessions with the right state', () => {
    const open = makeLesson({ registrations: [makeRegistration()] });
    const mine = makeLesson({
      start_time: '2026-09-30T22:00:00.000Z',
      end_time: '2026-10-01T00:00:00.000Z',
      registrations: [makeRegistration({ player_id: ME })],
    });
    const later = makeLesson({ start_time: '2026-10-05T22:00:00.000Z' });

    const slots = slotsFromLessons([open, mine, later], ME, NOW);

    expect(slots).toEqual([
      { id: open.id, startTime: open.start_time, tone: 'open', spotsLeft: 3 },
      { id: mine.id, startTime: mine.start_time, tone: 'registered', spotsLeft: 3 },
    ]);
  });

  it('marks full lessons and skips cancelled or past ones', () => {
    const cancelled = makeLesson({ status: 'cancelled' });
    const past = makeLesson({
      start_time: '2026-09-20T22:00:00.000Z',
      end_time: '2026-09-21T00:00:00.000Z',
    });
    const full = makeLesson({
      registrations: [1, 2, 3, 4].map(() => makeRegistration()),
    });

    expect(slotsFromLessons([cancelled, past, full], ME, NOW)).toEqual([
      { id: full.id, startTime: full.start_time, tone: 'full', spotsLeft: 0 },
    ]);
  });
});

describe('slotsFromPublicSessions', () => {
  const session = (overrides: Partial<PublicSession>): PublicSession => ({
    id: 'session',
    start_time: '2026-09-28T22:00:00.000Z',
    end_time: '2026-09-29T00:00:00.000Z',
    location: 'Complexe Sportif Longueuil',
    capacity: 4,
    registered_count: 1,
    registration_closes_at: '2026-09-28T18:00:00.000Z',
    ...overrides,
  });

  it('turns public sessions into tiles with spots left', () => {
    expect(slotsFromPublicSessions([session({ id: 'a' })], NOW)).toEqual([
      { id: 'a', startTime: '2026-09-28T22:00:00.000Z', tone: 'open', spotsLeft: 3 },
    ]);
  });

  it('shows full and closed sessions honestly', () => {
    const [full, closed] = slotsFromPublicSessions(
      [
        session({ id: 'full', registered_count: 4 }),
        session({ id: 'closed', registration_closes_at: '2026-09-21T12:00:00.000Z' }),
      ],
      NOW,
    );
    expect(full.tone).toBe('full');
    expect(closed.tone).toBe('closed');
  });
});

describe('slotLabel', () => {
  it('uses the right wording for each state', () => {
    const base = { id: 'x', startTime: '2026-09-28T22:00:00.000Z' };
    expect(slotLabel({ ...base, tone: 'open', spotsLeft: 3 })).toEqual({
      key: 'spotsLeftOther',
      vars: { count: 3 },
    });
    expect(slotLabel({ ...base, tone: 'open', spotsLeft: 1 })).toEqual({ key: 'spotsLeftOne' });
    expect(slotLabel({ ...base, tone: 'full', spotsLeft: 0 }).key).toBe('full');
    expect(slotLabel({ ...base, tone: 'registered', spotsLeft: 2 }).key).toBe('posterYoureIn');
    expect(slotLabel({ ...base, tone: 'closed', spotsLeft: 2 }).key).toBe('registrationClosed');
  });
});
