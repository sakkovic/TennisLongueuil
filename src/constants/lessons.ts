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

export const MAX_TITLE_LENGTH = 80;
export const MAX_LOCATION_LENGTH = 120;
export const MAX_DESCRIPTION_LENGTH = 1000;
export const MAX_LESSON_DURATION_HOURS = 12;
export const MAX_CANCELLATION_REASON_LENGTH = 500;
