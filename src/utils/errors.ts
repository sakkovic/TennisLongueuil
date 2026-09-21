/**
 * Translate backend errors into friendly, non-technical messages.
 *
 * RPC functions raise stable codes such as LESSON_FULL (SQLSTATE P0001).
 * CHECK constraints are recognised by name. Raw database or network errors
 * are never shown to users; technical details are only logged in development.
 */

export const FALLBACK_ERROR_MESSAGE = 'Something went wrong. Please try again.';

const BUSINESS_MESSAGES: Record<string, string> = {
  LESSON_FULL: 'Sorry, this lesson has just become full.',
  ALREADY_REGISTERED: "You're already registered for this lesson.",
  REGISTRATION_CLOSED: 'Registration is closed for this lesson.',
  REGISTRATION_DEADLINE_PASSED: 'The registration deadline for this lesson has passed.',
  LESSON_CANCELLED: 'This lesson has been cancelled.',
  LESSON_STARTED: 'This lesson has already started.',
  LESSON_NOT_FOUND: 'This lesson no longer exists.',
  NOT_REGISTERED: "You're not registered for this lesson.",
  REASON_TOO_LONG: 'Please keep the reason under 500 characters.',
  ACCOUNT_INACTIVE: 'Your account is inactive. Please contact your coach.',
  PROFILE_NOT_FOUND: 'Your member profile could not be found. Please contact your coach.',
  NOT_AUTHENTICATED: 'Your session has expired. Please sign in again.',
  NOT_AUTHORIZED: "You don't have permission to do that.",
  MEMBER_NOT_FOUND: 'This member could not be found.',
  INVALID_LEVEL: 'Please choose a valid level.',
  CANNOT_DEACTIVATE_SELF: "You can't deactivate your own account.",
};

const CONSTRAINT_MESSAGES: Record<string, string> = {
  lessons_registered_count_range:
    "You can't reduce the number of courts below the players already registered.",
  lessons_time_order: 'The end time must be after the start time.',
  lessons_max_duration: 'A lesson cannot last more than 12 hours.',
  lessons_deadline_before_start: 'The registration deadline must be before the lesson starts.',
  lessons_court_count_range: 'A lesson needs between 1 and 20 courts.',
  lessons_title_length: 'Please enter a title (80 characters max).',
  lessons_location_length: 'Please enter a location (120 characters max).',
  lessons_description_length: 'The description is too long (1000 characters max).',
  profiles_full_name_length: 'Please enter your name (80 characters max).',
  profiles_phone_format: 'Please enter a valid phone number.',
  lesson_registrations_lesson_player_key: "You're already registered for this lesson.",
};

const AUTH_MESSAGES: Record<string, string> = {
  invalid_credentials: 'Incorrect email or password.',
  email_not_confirmed: 'Your email address has not been confirmed yet.',
  user_banned: 'Your account is inactive. Please contact your coach.',
  otp_expired: 'This code is invalid or has expired. Request a new one.',
  weak_password: 'Please choose a stronger password (at least 8 characters).',
  same_password: 'Your new password must be different from your current one.',
  over_request_rate_limit: 'Too many attempts. Please wait a moment and try again.',
  over_email_send_rate_limit: 'Too many emails sent. Please wait a few minutes and try again.',
  signup_disabled: 'New accounts are created by your coach.',
  user_not_found: 'Incorrect email or password.',
  session_not_found: 'Your session has expired. Please sign in again.',
};

const NETWORK_MESSAGE = "Can't reach the server. Check your connection and try again.";

interface ErrorLike {
  message?: unknown;
  code?: unknown;
  details?: unknown;
  name?: unknown;
  status?: unknown;
  statusCode?: unknown;
}

function asErrorLike(error: unknown): ErrorLike {
  return typeof error === 'object' && error !== null ? (error as ErrorLike) : {};
}

function text(value: unknown): string {
  return typeof value === 'string' ? value : '';
}

/** Stable machine-readable code for an error, when one is recognised. */
export function getErrorCode(error: unknown): string | null {
  const { message, code } = asErrorLike(error);
  const msg = text(message);
  if (msg in BUSINESS_MESSAGES) return msg;
  const codeText = text(code);
  if (codeText in AUTH_MESSAGES) return codeText;
  return codeText || null;
}

/** True for errors that reflect a business rule, which retrying cannot fix. */
export function isBusinessError(error: unknown): boolean {
  const { message, code } = asErrorLike(error);
  return text(message) in BUSINESS_MESSAGES || text(code) === '42501' || text(code) === 'P0001';
}

/** A user-facing message for any error thrown by Supabase or the app. */
export function getErrorMessage(error: unknown): string {
  const { message, code, details, name, status, statusCode } = asErrorLike(error);
  const msg = text(message);
  const codeText = text(code);

  if (msg in BUSINESS_MESSAGES) return BUSINESS_MESSAGES[msg];
  if (codeText in AUTH_MESSAGES) return AUTH_MESSAGES[codeText];

  const haystack = `${msg} ${text(details)}`;
  for (const [constraint, friendly] of Object.entries(CONSTRAINT_MESSAGES)) {
    if (haystack.includes(constraint)) return friendly;
  }

  if (codeText === '42501' || /row-level security|permission denied/i.test(msg)) {
    return BUSINESS_MESSAGES.NOT_AUTHORIZED;
  }
  if (codeText === '23505') return 'This already exists.';

  const statusNumber = Number(status ?? statusCode);
  if (statusNumber === 413 || /maximum allowed size|too large/i.test(msg)) {
    return 'This photo is too large. Please choose a smaller one.';
  }
  if (/mime type|invalid_mime_type/i.test(msg)) {
    return 'Please choose a JPEG, PNG or WebP image.';
  }
  if (
    text(name) === 'AuthRetryableFetchError' ||
    /network request failed|failed to fetch|network error|load failed/i.test(msg)
  ) {
    return NETWORK_MESSAGE;
  }

  return FALLBACK_ERROR_MESSAGE;
}

/** Log technical details during development only. Never shown to the user. */
export function logError(context: string, error: unknown): void {
  if (__DEV__) {
    console.warn(`[${context}]`, error);
  }
}
