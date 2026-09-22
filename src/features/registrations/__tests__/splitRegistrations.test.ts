import { makePlayerRegistration, NOW } from '@/test/fixtures';

import { attendanceSummary, getHistoryLabel, splitRegistrations } from '../api';

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

  it('keeps a waitlist place in Upcoming until the lesson ends', () => {
    const waiting = makePlayerRegistration({ status: 'waitlisted' });
    const missed = makePlayerRegistration({ ...past, id: 'missed', status: 'waitlisted' });
    const { upcoming, history } = splitRegistrations([waiting, missed], NOW);
    expect(upcoming.map((r) => r.id)).toEqual([waiting.id]);
    expect(history.map((r) => r.id)).toEqual(['missed']);
    expect(getHistoryLabel(missed)).toBe('missedWaitlist');
  });

  it('labels history entries without inventing attendance', () => {
    expect(getHistoryLabel(past)).toBe('registered');
    expect(getHistoryLabel(cancelledByMe)).toBe('cancelled');
    expect(getHistoryLabel(lessonCancelled)).toBe('lessonCancelled');
  });

  it('shows the attendance the coach recorded', () => {
    const attended = makePlayerRegistration({ attendance: { status: 'present' } });
    const noShow = makePlayerRegistration({ attendance: { status: 'absent' } });
    expect(getHistoryLabel(attended)).toBe('present');
    expect(getHistoryLabel(noShow)).toBe('absent');
    expect(attendanceSummary([attended, noShow, past, cancelledByMe])).toEqual({
      present: 1,
      marked: 2,
    });
  });
});
