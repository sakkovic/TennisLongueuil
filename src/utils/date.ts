/**
 * Date and time formatting.
 *
 * Timestamps are stored as timestamptz (absolute instants) and are always
 * displayed in the device's local time zone through the Date local getters,
 * which apply daylight-saving rules correctly. Formatting is done by hand so
 * the output is identical on iOS, Android and web, e.g.
 *   "Monday, September 21"   "6:00 PM – 7:30 PM"   "MONDAY · SEP 21"
 */

const WEEKDAYS = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];
const MONTHS = [
  'January',
  'February',
  'March',
  'April',
  'May',
  'June',
  'July',
  'August',
  'September',
  'October',
  'November',
  'December',
];

export type DateInput = Date | string;

export function toDate(value: DateInput): Date {
  return value instanceof Date ? value : new Date(value);
}

const shortWeekday = (date: Date) => WEEKDAYS[date.getDay()].slice(0, 3);
const shortMonth = (date: Date) => MONTHS[date.getMonth()].slice(0, 3);

function yearSuffix(date: Date, now: Date): string {
  return date.getFullYear() === now.getFullYear() ? '' : `, ${date.getFullYear()}`;
}

/** "6:00 PM" */
export function formatTime(value: DateInput): string {
  const date = toDate(value);
  const hours = date.getHours();
  const minutes = String(date.getMinutes()).padStart(2, '0');
  const period = hours < 12 ? 'AM' : 'PM';
  const displayHours = hours % 12 === 0 ? 12 : hours % 12;
  return `${displayHours}:${minutes} ${period}`;
}

/** "6:00 PM – 7:30 PM" */
export function formatTimeRange(start: DateInput, end: DateInput): string {
  return `${formatTime(start)} – ${formatTime(end)}`;
}

/** "MONDAY · SEP 21" (card header) */
export function formatDayHeader(value: DateInput, now: Date = new Date()): string {
  const date = toDate(value);
  return `${WEEKDAYS[date.getDay()]} · ${shortMonth(date)} ${date.getDate()}${yearSuffix(date, now)}`.toUpperCase();
}

/** "Monday, September 21" (with the year when it is not the current year) */
export function formatLongDate(value: DateInput, now: Date = new Date()): string {
  const date = toDate(value);
  return `${WEEKDAYS[date.getDay()]}, ${MONTHS[date.getMonth()]} ${date.getDate()}${yearSuffix(date, now)}`;
}

/** "Mon · Sep 21" */
export function formatShortDate(value: DateInput, now: Date = new Date()): string {
  const date = toDate(value);
  return `${shortWeekday(date)} · ${shortMonth(date)} ${date.getDate()}${yearSuffix(date, now)}`;
}

/** "Mon, Sep 21 · 6:00 PM" */
export function formatDateTime(value: DateInput, now: Date = new Date()): string {
  const date = toDate(value);
  return `${shortWeekday(date)}, ${shortMonth(date)} ${date.getDate()}${yearSuffix(date, now)} · ${formatTime(date)}`;
}

/** "Good morning" / "Good afternoon" / "Good evening" */
export function getGreeting(now: Date = new Date()): string {
  const hour = now.getHours();
  if (hour < 12) return 'Good morning';
  if (hour < 18) return 'Good afternoon';
  return 'Good evening';
}

/**
 * Combine the calendar day of `day` with the clock time of `time`, in local
 * time. Building the Date from local components lets the JS engine apply the
 * correct UTC offset for that specific day (DST-safe).
 */
export function combineDateAndTime(day: Date, time: Date): Date {
  return new Date(
    day.getFullYear(),
    day.getMonth(),
    day.getDate(),
    time.getHours(),
    time.getMinutes(),
    0,
    0,
  );
}

export function addMinutes(date: Date, minutes: number): Date {
  return new Date(date.getTime() + minutes * 60_000);
}

export function isSameLocalDay(a: Date, b: Date): boolean {
  return (
    a.getFullYear() === b.getFullYear() &&
    a.getMonth() === b.getMonth() &&
    a.getDate() === b.getDate()
  );
}
