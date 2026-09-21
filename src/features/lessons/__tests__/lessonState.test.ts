import { makeLesson, NOW } from '@/test/fixtures';

import { AVAILABILITY_LABEL_KEYS, getLessonAvailability } from '../lessonState';

// makeLesson(): Monday September 28, 2026, 6:00–7:30 PM (22:00–23:30 UTC).
const hoursBeforeStart = (hours: number) =>
  new Date(Date.parse('2026-09-28T22:00:00.000Z') - hours * 3_600_000);

describe('getLessonAvailability', () => {
  it('lets a player join an open lesson with spots left', () => {
    const result = getLessonAvailability(makeLesson({ registered_count: 3 }), false, NOW);
    expect(result).toMatchObject({ state: 'open', canJoin: true, canCancel: false });
  });

  it('shows a registered player their status and lets them cancel', () => {
    const result = getLessonAvailability(makeLesson({ registered_count: 4 }), true, NOW);
    expect(result).toMatchObject({ state: 'registered', canJoin: false, canCancel: true });
    expect(AVAILABILITY_LABEL_KEYS[result.state]).toBe('youreRegistered');
  });

  it('marks a lesson full at capacity', () => {
    const result = getLessonAvailability(makeLesson({ registered_count: 4 }), false, NOW);
    expect(result).toMatchObject({ state: 'full', canJoin: false });
  });

  it('never allows joining a cancelled lesson, even with spots left', () => {
    const result = getLessonAvailability(makeLesson({ status: 'cancelled' }), true, NOW);
    expect(result).toMatchObject({ state: 'cancelled', canJoin: false, canCancel: false });
  });

  it('respects closed registration and explicit deadlines', () => {
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
  });

  it('closes registration 4 hours before the lesson when no deadline is set', () => {
    const lesson = makeLesson({ registration_deadline: null });
    expect(getLessonAvailability(lesson, false, hoursBeforeStart(5)).canJoin).toBe(true);
    expect(getLessonAvailability(lesson, false, hoursBeforeStart(3))).toMatchObject({
      state: 'deadline_passed',
      canJoin: false,
    });
    expect(getLessonAvailability(lesson, false, NOW).registrationClosesAt.toISOString()).toBe(
      '2026-09-28T18:00:00.000Z',
    );
  });

  it('lets a registered player cancel only until 24 hours before the lesson', () => {
    const lesson = makeLesson();
    expect(getLessonAvailability(lesson, true, hoursBeforeStart(25)).canCancel).toBe(true);

    const late = getLessonAvailability(lesson, true, hoursBeforeStart(23));
    expect(late).toMatchObject({ state: 'registered', canCancel: false });
    expect(late.cancellationClosesAt.toISOString()).toBe('2026-09-27T22:00:00.000Z');
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
