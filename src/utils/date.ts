/**
 * Date and time formatting.
 *
 * Timestamps are stored as timestamptz (absolute instants) and are always
 * displayed in the device's local time zone through the Date local getters,
 * which apply daylight-saving rules correctly. Formatting is done by hand so
 * the output is identical on iOS, Android and web, e.g.
 *   "Monday, September 21"   "6:00 PM – 7:30 PM"   "MONDAY · SEP 21"
 */

export type DateLocale = 'en' | 'fr';

let dateLocale: DateLocale = 'en';

export function setDateLocale(locale: DateLocale): void {
  dateLocale = locale;
}

export function getDateLocale(): DateLocale {
  return dateLocale;
}

const WEEKDAYS = {
  en: ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'],
  fr: ['dimanche', 'lundi', 'mardi', 'mercredi', 'jeudi', 'vendredi', 'samedi'],
} as const;

const MONTHS = {
  en: [
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
  ],
  fr: [
    'janvier',
    'février',
    'mars',
    'avril',
    'mai',
    'juin',
    'juillet',
    'août',
    'septembre',
    'octobre',
    'novembre',
    'décembre',
  ],
} as const;

const MONTHS_SHORT_FR = [
  'janv.',
  'févr.',
  'mars',
  'avr.',
  'mai',
  'juin',
  'juill.',
  'août',
  'sept.',
  'oct.',
  'nov.',
  'déc.',
] as const;

export type DateInput = Date | string;

export function toDate(value: DateInput): Date {
  return value instanceof Date ? value : new Date(value);
}

const weekday = (date: Date) => WEEKDAYS[dateLocale][date.getDay()];
const month = (date: Date) => MONTHS[dateLocale][date.getMonth()];
const shortWeekday = (date: Date) => weekday(date).slice(0, 3);
const shortMonth = (date: Date) =>
  dateLocale === 'fr' ? MONTHS_SHORT_FR[date.getMonth()] : MONTHS.en[date.getMonth()].slice(0, 3);

function yearSuffix(date: Date, now: Date): string {
  if (date.getFullYear() === now.getFullYear()) return '';
  return dateLocale === 'fr' ? ` ${date.getFullYear()}` : `, ${date.getFullYear()}`;
}

/** "6:00 PM" / "18 h 00" */
export function formatTime(value: DateInput): string {
  const date = toDate(value);
  const hours = date.getHours();
  const minutes = String(date.getMinutes()).padStart(2, '0');
  if (dateLocale === 'fr') return `${hours} h ${minutes}`;
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
  return `${weekday(date)} · ${shortMonth(date)} ${date.getDate()}${yearSuffix(date, now)}`.toUpperCase();
}

/** "Monday, September 21" / "lundi 21 septembre" */
export function formatLongDate(value: DateInput, now: Date = new Date()): string {
  const date = toDate(value);
  return dateLocale === 'fr'
    ? `${weekday(date)} ${date.getDate()} ${month(date)}${yearSuffix(date, now)}`
    : `${weekday(date)}, ${month(date)} ${date.getDate()}${yearSuffix(date, now)}`;
}

/** "Mon" */
export function formatWeekdayShort(value: DateInput): string {
  return shortWeekday(toDate(value));
}

/** "Sep 21" */
export function formatMonthDayShort(value: DateInput): string {
  const date = toDate(value);
  return `${shortMonth(date)} ${date.getDate()}`;
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
  if (hour < 12) return dateLocale === 'fr' ? 'Bonjour' : 'Good morning';
  if (hour < 18) return dateLocale === 'fr' ? 'Bon après-midi' : 'Good afternoon';
  return dateLocale === 'fr' ? 'Bonsoir' : 'Good evening';
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

/**
 * Same weekday and same wall-clock time, `weeks` later. Rebuilt from local
 * components on purpose: adding 7 × 24 h would drift by an hour across a
 * daylight-saving change, so a 6:00 PM lesson would become 5:00 PM or 7:00 PM.
 */
export function addWeeks(date: Date, weeks: number): Date {
  return new Date(
    date.getFullYear(),
    date.getMonth(),
    date.getDate() + weeks * 7,
    date.getHours(),
    date.getMinutes(),
    0,
    0,
  );
}

/** "2026-09-28" — a stable key for a local calendar day. */
export function toDateKey(date: Date): string {
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  return `${date.getFullYear()}-${month}-${day}`;
}

/** Local midnight of the given day, stripping any clock time. */
export function startOfDay(date: Date): Date {
  return new Date(date.getFullYear(), date.getMonth(), date.getDate());
}

/** Minutes since local midnight, e.g. 6:00 PM → 1080. */
export function minutesOfDay(date: Date): number {
  return date.getHours() * 60 + date.getMinutes();
}

/** The same calendar day at `minutes` past local midnight. */
export function atMinutesOfDay(day: Date, minutes: number): Date {
  return new Date(day.getFullYear(), day.getMonth(), day.getDate(), 0, minutes, 0, 0);
}

/** A lesson length: "45 min", "1h", "1h30", "2h". */
export function formatDuration(minutes: number): string {
  if (minutes < 60) return `${minutes} min`;
  const hours = Math.floor(minutes / 60);
  const rest = minutes % 60;
  return rest === 0 ? `${hours}h` : `${hours}h${String(rest).padStart(2, '0')}`;
}

/** How long before a lesson something happens: "2 hours", "1 day", "3 days". */
export function formatLeadTime(minutes: number): string {
  const fr = dateLocale === 'fr';
  if (minutes === 0) return fr ? 'au début' : 'at the start';
  if (minutes < 60) return fr ? `${minutes} minutes` : `${minutes} minutes`;
  if (minutes < 1440) {
    const hours = minutes / 60;
    const rounded = Number.isInteger(hours) ? hours : Math.round(hours * 10) / 10;
    if (fr) return `${rounded} ${rounded === 1 ? 'heure' : 'heures'}`;
    return `${rounded} ${rounded === 1 ? 'hour' : 'hours'}`;
  }
  const days = minutes / 1440;
  const rounded = Number.isInteger(days) ? days : Math.round(days * 10) / 10;
  if (fr) return `${rounded} ${rounded === 1 ? 'jour' : 'jours'}`;
  return `${rounded} ${rounded === 1 ? 'day' : 'days'}`;
}

export function isSameLocalDay(a: Date, b: Date): boolean {
  return (
    a.getFullYear() === b.getFullYear() &&
    a.getMonth() === b.getMonth() &&
    a.getDate() === b.getDate()
  );
}
