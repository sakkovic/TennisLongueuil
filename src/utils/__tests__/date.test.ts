import {
  addWeeks,
  atMinutesOfDay,
  combineDateAndTime,
  formatDateTime,
  formatDayHeader,
  formatDuration,
  formatLeadTime,
  formatLongDate,
  formatShortDate,
  formatTime,
  formatTimeRange,
  formatWeekRange,
  getGreeting,
  minutesOfDay,
  setDateLocale,
  startOfWeek,
  toDateKey,
  toWeekKey,
} from '../date';

// Tests run in America/Toronto (see jest.globalSetup.js).
const now = new Date(2026, 8, 21, 9, 0);

describe('date formatting', () => {
  beforeEach(() => setDateLocale('en'));

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

  it('keeps the same weekday and clock time when adding weeks across the DST change', () => {
    const monday = new Date(2026, 9, 26, 18, 0);
    const nextMonday = addWeeks(monday, 1);

    expect(nextMonday.getDay()).toBe(monday.getDay());
    expect(nextMonday.getHours()).toBe(18);
    expect(nextMonday.toISOString()).toBe('2026-11-02T23:00:00.000Z');
    // A naive +7 days of milliseconds would have landed an hour earlier.
    expect(new Date(monday.getTime() + 7 * 24 * 3_600_000).getHours()).toBe(17);
  });

  it('converts between a date and minutes past midnight', () => {
    expect(minutesOfDay(new Date(2026, 8, 21, 18, 30))).toBe(18 * 60 + 30);
    expect(atMinutesOfDay(new Date(2026, 8, 21), 18 * 60 + 30).getHours()).toBe(18);
    expect(toDateKey(new Date(2026, 8, 5))).toBe('2026-09-05');
  });

  it('formats lesson lengths and deadline lead times', () => {
    expect(formatDuration(45)).toBe('45 min');
    expect(formatDuration(60)).toBe('1h');
    expect(formatDuration(90)).toBe('1h30');
    expect(formatDuration(120)).toBe('2h');

    expect(formatLeadTime(120)).toBe('2 hours');
    expect(formatLeadTime(60)).toBe('1 hour');
    expect(formatLeadTime(24 * 60)).toBe('1 day');
    expect(formatLeadTime(72 * 60)).toBe('3 days');
  });

  it('greets according to the time of day', () => {
    expect(getGreeting(new Date(2026, 8, 21, 8))).toBe('Good morning');
    expect(getGreeting(new Date(2026, 8, 21, 14))).toBe('Good afternoon');
    expect(getGreeting(new Date(2026, 8, 21, 20))).toBe('Good evening');
  });

  it('starts weeks on Monday and keeps Sunday in the previous week', () => {
    expect(toDateKey(startOfWeek(new Date(2026, 8, 21, 18, 0)))).toBe('2026-09-21');
    expect(toDateKey(startOfWeek(new Date(2026, 8, 23, 9, 0)))).toBe('2026-09-21');
    expect(toDateKey(startOfWeek(new Date(2026, 8, 20, 18, 0)))).toBe('2026-09-14');
    expect(toWeekKey(new Date(2026, 8, 27, 23, 0))).toBe('2026-09-21');
  });

  it('formats a Monday–Sunday week span', () => {
    expect(formatWeekRange(new Date(2026, 8, 22), now)).toBe('Sep 21–27');
    expect(formatWeekRange(new Date(2026, 8, 28), now)).toBe('Sep 28 – Oct 4');
    setDateLocale('fr');
    expect(formatWeekRange(new Date(2026, 8, 22), now)).toBe('21–27 sept.');
    expect(formatWeekRange(new Date(2026, 8, 28), now)).toBe('28 sept. – 4 oct.');
  });

  it('formats French dates and times', () => {
    setDateLocale('fr');
    const lesson = new Date(2026, 8, 21, 18, 0);
    expect(formatTime(lesson)).toBe('18 h 00');
    expect(formatLongDate(lesson, now)).toBe('lundi 21 septembre');
    expect(getGreeting(new Date(2026, 8, 21, 8))).toBe('Bonjour');
  });
});
