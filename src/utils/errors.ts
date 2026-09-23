/**
 * Translate backend errors into friendly, non-technical messages, in the
 * app's language (French or English).
 *
 * RPC functions raise stable codes such as LESSON_FULL (SQLSTATE P0001).
 * CHECK constraints are recognised by name. Raw database or network errors
 * are never shown to users; technical details are only logged in development.
 */

import { getDateLocale, type DateLocale } from './date';

type Localized = Record<DateLocale, string>;

export const FALLBACK_ERROR_MESSAGE = 'Something went wrong. Please try again.';

const FALLBACK: Localized = {
  en: FALLBACK_ERROR_MESSAGE,
  fr: 'Une erreur est survenue. Veuillez réessayer.',
};

const BUSINESS_MESSAGES: Record<string, Localized> = {
  LESSON_FULL: {
    en: 'Sorry, this lesson has just become full.',
    fr: 'Désolé, cette leçon vient d’être complète.',
  },
  ALREADY_REGISTERED: {
    en: "You're already registered for this lesson.",
    fr: 'Vous êtes déjà inscrit à cette leçon.',
  },
  ALREADY_WAITLISTED: {
    en: "You're already on the waitlist for this lesson.",
    fr: 'Vous êtes déjà sur la liste d’attente de cette leçon.',
  },
  REGISTRATION_CLOSED: {
    en: 'Registration is closed for this lesson.',
    fr: 'Les inscriptions sont fermées pour cette leçon.',
  },
  REGISTRATION_DEADLINE_PASSED: {
    en: 'The registration deadline for this lesson has passed.',
    fr: 'La date limite d’inscription à cette leçon est passée.',
  },
  LESSON_CANCELLED: {
    en: 'This lesson has been cancelled.',
    fr: 'Cette leçon a été annulée.',
  },
  LESSON_STARTED: {
    en: 'This lesson has already started.',
    fr: 'Cette leçon a déjà commencé.',
  },
  LESSON_NOT_FOUND: {
    en: 'This lesson no longer exists.',
    fr: 'Cette leçon n’existe plus.',
  },
  NOT_REGISTERED: {
    en: "You're not registered for this lesson.",
    fr: 'Vous n’êtes pas inscrit à cette leçon.',
  },
  NOT_INVITED: {
    en: 'This lesson is private. Ask your coach to add you.',
    fr: 'Cette leçon est privée. Demandez à votre coach de vous ajouter.',
  },
  NO_PLAYERS_INVITED: {
    en: 'Choose at least one player for a private lesson.',
    fr: 'Choisissez au moins un joueur pour une leçon privée.',
  },
  TOO_MANY_PLAYERS: {
    en: 'There are more players than spots. Add a court or remove players.',
    fr: 'Il y a plus de joueurs que de places. Ajoutez un terrain ou retirez des joueurs.',
  },
  INVALID_PLAYER: {
    en: 'Only active players can be invited.',
    fr: 'Seuls les joueurs actifs peuvent être invités.',
  },
  REGISTRATION_NOT_FOUND: {
    en: 'This registration no longer exists.',
    fr: 'Cette inscription n’existe plus.',
  },
  CANCELLATION_DEADLINE_PASSED: {
    en: "Cancellations close 24 hours before the lesson. Contact your coach if you can't make it.",
    fr: 'Les annulations ferment 24 heures avant la leçon. Contactez votre coach si vous ne pouvez pas venir.',
  },
  ATTENDANCE_NOT_OPEN: {
    en: 'You can take attendance from 30 minutes before the lesson.',
    fr: 'Vous pourrez prendre les présences à partir de 30 minutes avant la leçon.',
  },
  REASON_TOO_LONG: {
    en: 'Please keep the reason under 500 characters.',
    fr: 'La raison doit faire moins de 500 caractères.',
  },
  ACCOUNT_INACTIVE: {
    en: 'Your account is inactive. Please contact your coach.',
    fr: 'Votre compte est inactif. Veuillez contacter votre coach.',
  },
  PROFILE_NOT_FOUND: {
    en: 'Your member profile could not be found. Please contact your coach.',
    fr: 'Votre profil de membre est introuvable. Veuillez contacter votre coach.',
  },
  NOT_AUTHENTICATED: {
    en: 'Your session has expired. Please sign in again.',
    fr: 'Votre session a expiré. Veuillez vous reconnecter.',
  },
  NOT_AUTHORIZED: {
    en: "You don't have permission to do that.",
    fr: 'Vous n’avez pas la permission de faire cela.',
  },
  MEMBER_NOT_FOUND: {
    en: 'This member could not be found.',
    fr: 'Ce membre est introuvable.',
  },
  INVALID_LEVEL: {
    en: 'Please choose a valid level.',
    fr: 'Veuillez choisir un niveau valide.',
  },
  INVALID_INPUT: {
    en: 'Some of the information is not valid. Please check it and try again.',
    fr: 'Certaines informations ne sont pas valides. Vérifiez-les et réessayez.',
  },
  CANNOT_DEACTIVATE_SELF: {
    en: "You can't deactivate your own account.",
    fr: 'Vous ne pouvez pas désactiver votre propre compte.',
  },
  CURRENT_PASSWORD_INVALID: {
    en: 'Your current password is incorrect.',
    fr: 'Votre mot de passe actuel est incorrect.',
  },
};

const CONSTRAINT_MESSAGES: Record<string, Localized> = {
  lessons_registered_count_range: {
    en: "You can't reduce the number of courts below the players already registered.",
    fr: 'Vous ne pouvez pas réduire le nombre de terrains sous le nombre de joueurs déjà inscrits.',
  },
  lessons_time_order: {
    en: 'The end time must be after the start time.',
    fr: 'L’heure de fin doit être après l’heure de début.',
  },
  lessons_max_duration: {
    en: 'A lesson cannot last more than 12 hours.',
    fr: 'Une leçon ne peut pas durer plus de 12 heures.',
  },
  lessons_deadline_before_start: {
    en: 'The registration deadline must be before the lesson starts.',
    fr: 'La date limite d’inscription doit être avant le début de la leçon.',
  },
  lessons_court_count_range: {
    en: 'A lesson needs between 1 and 20 courts.',
    fr: 'Une leçon compte entre 1 et 20 terrains.',
  },
  lessons_title_length: {
    en: 'Please enter a title (80 characters max).',
    fr: 'Veuillez saisir un titre (80 caractères max.).',
  },
  lessons_location_length: {
    en: 'Please enter a location (120 characters max).',
    fr: 'Veuillez saisir un lieu (120 caractères max.).',
  },
  lessons_description_length: {
    en: 'The description is too long (1000 characters max).',
    fr: 'La description est trop longue (1000 caractères max.).',
  },
  profiles_full_name_length: {
    en: 'Please enter your name (80 characters max).',
    fr: 'Veuillez saisir votre nom (80 caractères max.).',
  },
  profiles_phone_format: {
    en: 'Please enter a valid phone number.',
    fr: 'Veuillez saisir un numéro de téléphone valide.',
  },
  lesson_registrations_lesson_player_key: {
    en: "You're already registered for this lesson.",
    fr: 'Vous êtes déjà inscrit à cette leçon.',
  },
};

const AUTH_MESSAGES: Record<string, Localized> = {
  invalid_credentials: {
    en: 'Incorrect email or password.',
    fr: 'Courriel ou mot de passe incorrect.',
  },
  email_not_confirmed: {
    en: 'Your email address has not been confirmed yet.',
    fr: 'Votre adresse courriel n’a pas encore été confirmée.',
  },
  user_banned: {
    en: 'Your account is inactive. Please contact your coach.',
    fr: 'Votre compte est inactif. Veuillez contacter votre coach.',
  },
  otp_expired: {
    en: 'This code is invalid or has expired. Request a new one.',
    fr: 'Ce code est invalide ou a expiré. Demandez-en un nouveau.',
  },
  weak_password: {
    en: 'Please choose a stronger password: at least 8 characters, with uppercase and lowercase letters and a number.',
    fr: 'Choisissez un mot de passe plus sûr : au moins 8 caractères, avec des majuscules, des minuscules et un chiffre.',
  },
  current_password_invalid: {
    en: 'Your current password is incorrect.',
    fr: 'Votre mot de passe actuel est incorrect.',
  },
  current_password_required: {
    en: 'Please enter your current password.',
    fr: 'Veuillez saisir votre mot de passe actuel.',
  },
  reauthentication_needed: {
    en: 'For your security, please sign out, sign in again, then retry.',
    fr: 'Pour votre sécurité, déconnectez-vous, reconnectez-vous, puis réessayez.',
  },
  email_address_not_authorized: {
    en: "Reset emails can't be sent to this address yet. Please ask your coach to reset your password.",
    fr: 'Les courriels de réinitialisation ne peuvent pas encore être envoyés à cette adresse. Demandez à votre coach de réinitialiser votre mot de passe.',
  },
  same_password: {
    en: 'Your new password must be different from your current one.',
    fr: 'Le nouveau mot de passe doit être différent de l’actuel.',
  },
  over_request_rate_limit: {
    en: 'Too many attempts. Please wait a moment and try again.',
    fr: 'Trop de tentatives. Patientez un instant et réessayez.',
  },
  over_email_send_rate_limit: {
    en: 'Too many emails sent. Please wait a few minutes and try again.',
    fr: 'Trop de courriels envoyés. Patientez quelques minutes et réessayez.',
  },
  signup_disabled: {
    en: 'New sign-ups are closed right now. Please contact your coach.',
    fr: 'Les nouvelles inscriptions sont fermées pour le moment. Veuillez contacter votre coach.',
  },
  email_address_invalid: {
    en: 'Please enter a valid email address.',
    fr: 'Veuillez saisir une adresse courriel valide.',
  },
  user_already_exists: {
    en: 'An account already exists for this email. Try signing in instead.',
    fr: 'Un compte existe déjà pour ce courriel. Essayez plutôt de vous connecter.',
  },
  email_exists: {
    en: 'An account already exists for this email. Try signing in instead.',
    fr: 'Un compte existe déjà pour ce courriel. Essayez plutôt de vous connecter.',
  },
  user_not_found: {
    en: 'Incorrect email or password.',
    fr: 'Courriel ou mot de passe incorrect.',
  },
  session_not_found: {
    en: 'Your session has expired. Please sign in again.',
    fr: 'Votre session a expiré. Veuillez vous reconnecter.',
  },
};

const NETWORK_MESSAGE: Localized = {
  en: "Can't reach the server. Check your connection and try again.",
  fr: 'Impossible de joindre le serveur. Vérifiez votre connexion et réessayez.',
};

const DUPLICATE_MESSAGE: Localized = { en: 'This already exists.', fr: 'Cela existe déjà.' };

const PHOTO_TOO_LARGE: Localized = {
  en: 'This photo is too large. Please choose a smaller one.',
  fr: 'Cette photo est trop lourde. Choisissez-en une plus petite.',
};

const PHOTO_TYPE: Localized = {
  en: 'Please choose a JPEG, PNG or WebP image.',
  fr: 'Choisissez une image JPEG, PNG ou WebP.',
};

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
  const locale = getDateLocale();
  const { message, code, details, name, status, statusCode } = asErrorLike(error);
  const msg = text(message);
  const codeText = text(code);

  if (msg in BUSINESS_MESSAGES) return BUSINESS_MESSAGES[msg][locale];
  if (codeText in AUTH_MESSAGES) return AUTH_MESSAGES[codeText][locale];

  const haystack = `${msg} ${text(details)}`;
  for (const [constraint, friendly] of Object.entries(CONSTRAINT_MESSAGES)) {
    if (haystack.includes(constraint)) return friendly[locale];
  }

  if (codeText === '42501' || /row-level security|permission denied/i.test(msg)) {
    return BUSINESS_MESSAGES.NOT_AUTHORIZED[locale];
  }
  if (codeText === '23505') return DUPLICATE_MESSAGE[locale];

  const statusNumber = Number(status ?? statusCode);
  if (statusNumber === 413 || /maximum allowed size|too large/i.test(msg)) {
    return PHOTO_TOO_LARGE[locale];
  }
  if (/mime type|invalid_mime_type/i.test(msg)) {
    return PHOTO_TYPE[locale];
  }
  if (
    text(name) === 'AuthRetryableFetchError' ||
    /network request failed|failed to fetch|network error|load failed/i.test(msg)
  ) {
    return NETWORK_MESSAGE[locale];
  }

  return FALLBACK[locale];
}

/** Log technical details during development only. Never shown to the user. */
export function logError(context: string, error: unknown): void {
  if (__DEV__) {
    console.warn(`[${context}]`, error);
  }
}
