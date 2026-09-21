import { reminderAt, reminderIdentifier, LESSON_REMINDER_LEAD_MS } from '../reminderTime';

describe('lesson reminders', () => {
  it('uses a stable identifier per lesson', () => {
    expect(reminderIdentifier('abc')).toBe('lesson-reminder:abc');
  });

  it('fires 24 hours before the lesson', () => {
    const start = new Date(2026, 8, 22, 18, 0);
    const now = new Date(2026, 8, 21, 9, 0);
    const when = reminderAt(start, now);
    expect(when?.getTime()).toBe(start.getTime() - LESSON_REMINDER_LEAD_MS);
  });

  it('skips reminders once the 24-hour window has started', () => {
    const start = new Date(2026, 8, 21, 18, 0);
    const now = new Date(2026, 8, 21, 9, 0);
    expect(reminderAt(start, now)).toBeNull();
  });
});
