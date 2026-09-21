import { makePlayerRegistration, NOW } from '@/test/fixtures';

import { getHistoryLabel, splitRegistrations } from '../api';

describe('splitRegistrations', () => {
  const later = makePlayerRegistration({
    lesson: { start_time: '2026-10-01T23:00:00.000Z', end_time: '2026-10-02T00:30:00.000Z' },
  });
  const sooner = makePlayerRegistration();
  const cancelledByMe = makePlayerRegistration({
    status: 'cancelled',
    cancelled_at: '2026-09-20T15:00:00.000Z',
    cancellation_reason: 'Work meeting',
  });
  const lessonCancelled = makePlayerRegistration({ lesson: { status: 'cancelled' } });
  const past = makePlayerRegistration({
    lesson: { start_time: '2026-09-14T22:00:00.000Z', end_time: '2026-09-14T23:30:00.000Z' },
  });

  it('puts active future registrations in Upcoming, soonest first', () => {
    const { upcoming } = splitRegistrations(
      [later, cancelledByMe, sooner, past, lessonCancelled],
      NOW,
    );
    expect(upcoming.map((r) => r.id)).toEqual([sooner.id, later.id]);
  });

  it('puts past lessons, own cancellations and cancelled lessons in History', () => {
    const { history } = splitRegistrations(
      [later, cancelledByMe, sooner, past, lessonCancelled],
      NOW,
    );
    expect(history.map((r) => r.id).sort()).toEqual(
      [cancelledByMe.id, lessonCancelled.id, past.id].sort(),
    );
    expect(history[history.length - 1].id).toBe(past.id);
  });

  it('labels history entries without inventing attendance', () => {
    expect(getHistoryLabel(past)).toBe('Registered');
    expect(getHistoryLabel(cancelledByMe)).toBe('Cancelled');
    expect(getHistoryLabel(lessonCancelled)).toBe('Lesson cancelled');
  });
});
