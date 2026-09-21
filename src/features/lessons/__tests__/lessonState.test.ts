import { makeLesson, NOW } from '@/test/fixtures';

import { getLessonAvailability } from '../lessonState';

describe('getLessonAvailability', () => {
  it('lets a player join an open lesson with spots left', () => {
    const result = getLessonAvailability(makeLesson({ registered_count: 3 }), false, NOW);
    expect(result).toMatchObject({ state: 'open', canJoin: true, canCancel: false });
  });

  it('shows a registered player their status and lets them cancel', () => {
    const result = getLessonAvailability(makeLesson({ registered_count: 4 }), true, NOW);
    expect(result).toMatchObject({
      state: 'registered',
      label: "You're registered",
      canJoin: false,
      canCancel: true,
    });
  });

  it('marks a lesson full at capacity', () => {
    const result = getLessonAvailability(makeLesson({ registered_count: 4 }), false, NOW);
    expect(result).toMatchObject({ state: 'full', label: 'Full', canJoin: false });
  });

  it('never allows joining a cancelled lesson, even with spots left', () => {
    const result = getLessonAvailability(makeLesson({ status: 'cancelled' }), true, NOW);
    expect(result).toMatchObject({ state: 'cancelled', canJoin: false, canCancel: false });
  });

  it('respects closed registration and deadlines', () => {
    expect(getLessonAvailability(makeLesson({ registration_open: false }), false, NOW).state).toBe(
      'closed',
    );
    expect(
      getLessonAvailability(
        makeLesson({ registration_deadline: '2026-09-21T12:00:00.000Z' }),
        false,
        NOW,
      ),
    ).toMatchObject({ state: 'deadline_passed', canJoin: false });
    expect(
      getLessonAvailability(
        makeLesson({ registration_deadline: '2026-09-28T20:00:00.000Z' }),
        false,
        NOW,
      ).canJoin,
    ).toBe(true);
  });

  it('handles lessons in progress and in the past', () => {
    const inProgress = new Date('2026-09-28T22:30:00.000Z');
    expect(getLessonAvailability(makeLesson(), true, inProgress)).toMatchObject({
      state: 'in_progress',
      canCancel: false,
    });
    const after = new Date('2026-09-29T00:00:00.000Z');
    expect(getLessonAvailability(makeLesson(), false, after).state).toBe('completed');
  });
});
