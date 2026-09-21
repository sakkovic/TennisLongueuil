import {
  combineDateAndTime,
  formatDateTime,
  formatDayHeader,
  formatLongDate,
  formatShortDate,
  formatTime,
  formatTimeRange,
  getGreeting,
} from '../date';

// Tests run in America/Toronto (see jest.globalSetup.js).
const now = new Date(2026, 8, 21, 9, 0);

describe('date formatting', () => {
  it('formats times in 12-hour clock', () => {
    expect(formatTime(new Date(2026, 8, 21, 18, 0))).toBe('6:00 PM');
    expect(formatTime(new Date(2026, 8, 21, 0, 5))).toBe('12:05 AM');
    expect(formatTime(new Date(2026, 8, 21, 12, 30))).toBe('12:30 PM');
    expect(formatTimeRange(new Date(2026, 8, 21, 18, 0), new Date(2026, 8, 21, 19, 30))).toBe(
      '6:00 PM – 7:30 PM',
    );
  });

  it('formats dates like the design', () => {
    const lesson = new Date(2026, 8, 21, 18, 0);
    expect(formatLongDate(lesson, now)).toBe('Monday, September 21');
    expect(formatDayHeader(lesson, now)).toBe('MONDAY · SEP 21');
    expect(formatShortDate(lesson, now)).toBe('Mon · Sep 21');
    expect(formatDateTime(lesson, now)).toBe('Mon, Sep 21 · 6:00 PM');
  });

  it('adds the year only for other years', () => {
    expect(formatLongDate(new Date(2027, 0, 4, 18, 0), now)).toBe('Monday, January 4, 2027');
  });

  it('displays stored UTC instants in local Québec time', () => {
    // 22:00 UTC in September (EDT, UTC-4) is 6:00 PM in Longueuil.
    expect(formatTime('2026-09-21T22:00:00Z')).toBe('6:00 PM');
    // 23:00 UTC in December (EST, UTC-5) is also 6:00 PM.
    expect(formatTime('2026-12-07T23:00:00Z')).toBe('6:00 PM');
  });

  it('keeps wall-clock times correct across the daylight-saving change', () => {
    const time = new Date(2026, 0, 1, 18, 0);
    // DST ends on Sunday, November 1, 2026.
    const beforeChange = combineDateAndTime(new Date(2026, 9, 31), time);
    const afterChange = combineDateAndTime(new Date(2026, 10, 2), time);

    expect(beforeChange.toISOString()).toBe('2026-10-31T22:00:00.000Z');
    expect(afterChange.toISOString()).toBe('2026-11-02T23:00:00.000Z');
    expect(formatTime(beforeChange)).toBe('6:00 PM');
    expect(formatTime(afterChange)).toBe('6:00 PM');
  });

  it('greets according to the time of day', () => {
    expect(getGreeting(new Date(2026, 8, 21, 8))).toBe('Good morning');
    expect(getGreeting(new Date(2026, 8, 21, 14))).toBe('Good afternoon');
    expect(getGreeting(new Date(2026, 8, 21, 20))).toBe('Good evening');
  });
});
