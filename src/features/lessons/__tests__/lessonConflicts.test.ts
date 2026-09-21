import { conflictMessage, findConflictingInputs, slotsOverlap } from '../lessonConflicts';
import type { LessonInput } from '../api';

const slot = (
  start: string,
  end: string,
  location = 'Complexe Sportif Longueuil',
  status = 'scheduled',
) => ({ start_time: start, end_time: end, location, status });

const input = (start: string, end: string): LessonInput => ({
  title: 'Tennis Lesson',
  description: null,
  start_time: start,
  end_time: end,
  location: 'Complexe Sportif Longueuil',
  court_count: 1,
  player_level_id: null,
  registration_open: true,
  registration_deadline: null,
});

describe('slotsOverlap', () => {
  it('detects the same start time at the same location', () => {
    expect(
      slotsOverlap(
        input('2026-09-22T22:00:00.000Z', '2026-09-22T23:30:00.000Z'),
        slot('2026-09-22T22:00:00.000Z', '2026-09-22T23:30:00.000Z'),
      ),
    ).toBe(true);
  });

  it('detects a partial overlap', () => {
    expect(
      slotsOverlap(
        input('2026-09-22T22:30:00.000Z', '2026-09-23T00:00:00.000Z'),
        slot('2026-09-22T22:00:00.000Z', '2026-09-22T23:30:00.000Z'),
      ),
    ).toBe(true);
  });

  it('allows back-to-back lessons that only touch at the edge', () => {
    expect(
      slotsOverlap(
        input('2026-09-22T23:30:00.000Z', '2026-09-23T01:00:00.000Z'),
        slot('2026-09-22T22:00:00.000Z', '2026-09-22T23:30:00.000Z'),
      ),
    ).toBe(false);
  });

  it('ignores a cancelled lesson and a different location', () => {
    const proposed = input('2026-09-22T22:00:00.000Z', '2026-09-22T23:30:00.000Z');
    expect(
      slotsOverlap(
        proposed,
        slot('2026-09-22T22:00:00.000Z', '2026-09-22T23:30:00.000Z', 'CSL', 'cancelled'),
      ),
    ).toBe(false);
    expect(
      slotsOverlap(
        proposed,
        slot('2026-09-22T22:00:00.000Z', '2026-09-22T23:30:00.000Z', 'Another club'),
      ),
    ).toBe(false);
  });
});

describe('findConflictingInputs', () => {
  it('returns only the weeks that collide', () => {
    const proposed = [
      input('2026-09-22T22:00:00.000Z', '2026-09-22T23:30:00.000Z'),
      input('2026-09-29T22:00:00.000Z', '2026-09-29T23:30:00.000Z'),
      input('2026-10-06T22:00:00.000Z', '2026-10-06T23:30:00.000Z'),
    ];
    const existing = [slot('2026-09-22T22:00:00.000Z', '2026-09-22T23:30:00.000Z')];

    expect(findConflictingInputs(proposed, existing).map((row) => row.start_time)).toEqual([
      '2026-09-22T22:00:00.000Z',
    ]);
  });

  it('explains a partial series collision', () => {
    const conflicts = [input('2026-09-22T22:00:00.000Z', '2026-09-22T23:30:00.000Z')];
    expect(conflictMessage(conflicts, 8)).toContain('skip that week');
    expect(conflictMessage(conflicts, 1)).toContain('already has a lesson');
  });
});
