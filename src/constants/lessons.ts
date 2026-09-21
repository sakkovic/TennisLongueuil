/**
 * Lesson business constants.
 *
 * The database is the source of truth and enforces all of these rules
 * (capacity is a generated column, limits are CHECK constraints). The values
 * here mirror them so forms can give instant feedback.
 */

/** Maximum number of players per court. Capacity = courts × 4. */
export const PLAYERS_PER_COURT = 4;

export const MIN_COURTS = 1;
export const MAX_COURTS = 20;

/** Pre-filled in the lesson form; the database uses the same defaults. */
export const DEFAULT_LESSON_TITLE = 'Tennis Lesson';
export const DEFAULT_LESSON_LOCATION = 'Complexe Sportif Longueuil';
export const DEFAULT_LESSON_DURATION_MINUTES = 90;

/** Quick choices in the lesson form; any other value is kept when editing. */
export const LESSON_DURATION_CHOICES = [45, 60, 90, 120, 180];

/**
 * Club rules, enforced by the database (migration 20260921000600_lesson_rules):
 * registration closes at least 4 hours before a lesson, and players can cancel
 * their registration until 24 hours before it.
 */
export const REGISTRATION_LEAD_MINUTES = 4 * 60;
export const CANCELLATION_LEAD_MINUTES = 24 * 60;

/** How long before the start registration closes (never later than the 4-hour rule). */
export const DEFAULT_DEADLINE_OFFSET_MINUTES = REGISTRATION_LEAD_MINUTES;
export const DEADLINE_OFFSET_CHOICES = [4 * 60, 6 * 60, 12 * 60, 24 * 60, 48 * 60, 72 * 60];

/**
 * Weekly repeat. Lessons normally run every week, so the form defaults to a
 * block of DEFAULT_REPEAT_WEEKS occurrences; the coach can switch it off for a
 * one-off. Each week becomes an independent lesson row.
 */
export const DEFAULT_REPEAT_WEEKS = 8;
export const MIN_REPEAT_WEEKS = 2;
export const MAX_REPEAT_WEEKS = 26;

/** Nearby days shown as a strip. Any other day is picked from the calendar. */
export const DATE_PICKER_DAYS = 21;

/**
 * Usual evening starts at Complexe Sportif Longueuil. Any other time is
 * picked from the clock; the form keeps that value when editing.
 */
export const QUICK_START_MINUTES = [
  17 * 60,
  17 * 60 + 30,
  18 * 60,
  18 * 60 + 30,
  19 * 60,
  19 * 60 + 30,
  20 * 60,
];

export const MAX_TITLE_LENGTH = 80;
export const MAX_LOCATION_LENGTH = 120;
export const MAX_DESCRIPTION_LENGTH = 1000;
export const MAX_LESSON_DURATION_HOURS = 12;
export const MAX_CANCELLATION_REASON_LENGTH = 500;
