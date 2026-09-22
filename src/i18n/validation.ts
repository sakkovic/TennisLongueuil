import { useCallback } from 'react';

import { useI18n } from '.';
import type { Locale } from './strings';

/**
 * French for the validation messages written in the form schemas (zod) and a
 * few other messages produced outside React. The schemas stay in English, so
 * their tests read naturally; screens pass messages through
 * useValidationMessage() before showing them.
 */
const FRENCH: Record<string, string> = {
  'Please enter your full name.': 'Veuillez saisir votre nom complet.',
  'Please enter your name.': 'Veuillez saisir votre nom.',
  'Keep your name under 80 characters.': 'Votre nom doit faire moins de 80 caractères.',
  'Use at most 80 characters.': 'Utilisez au plus 80 caractères.',
  'Please enter a valid email address.': 'Veuillez saisir une adresse courriel valide.',
  'Please enter a valid phone number.': 'Veuillez saisir un numéro de téléphone valide.',
  'Please enter your password.': 'Veuillez saisir votre mot de passe.',
  'Enter your current password.': 'Saisissez votre mot de passe actuel.',
  'The passwords do not match.': 'Les mots de passe ne correspondent pas.',
  'Use at least 8 characters.': 'Utilisez au moins 8 caractères.',
  'Use at most 72 characters.': 'Utilisez au plus 72 caractères.',
  'Add a lowercase letter.': 'Ajoutez une lettre minuscule.',
  'Add an uppercase letter.': 'Ajoutez une lettre majuscule.',
  'Add a number.': 'Ajoutez un chiffre.',
  'Please enter a title.': 'Veuillez saisir un titre.',
  'Please enter a location.': 'Veuillez saisir un lieu.',
  'A lesson lasts at least 15 minutes.': 'Une leçon dure au moins 15 minutes.',
  'A lesson needs at least 1 court.': 'Une leçon a besoin d’au moins 1 terrain.',
  'Registration must close at least 4 hours before the lesson.':
    'Les inscriptions doivent fermer au moins 4 heures avant la leçon.',
  'The lesson must start in the future.': 'La leçon doit commencer dans le futur.',
  'This reset link is invalid or has expired. Please request a new one.':
    'Ce lien de réinitialisation est invalide ou a expiré. Demandez-en un nouveau.',
};

/** Messages with numbers in them. */
const FRENCH_PATTERNS: [RegExp, string][] = [
  [/^Keep the title under (\d+) characters\.$/, 'Le titre doit faire moins de $1 caractères.'],
  [/^Keep the location under (\d+) characters\.$/, 'Le lieu doit faire moins de $1 caractères.'],
  [
    /^Keep the description under (\d+) characters\.$/,
    'La description doit faire moins de $1 caractères.',
  ],
  [
    /^A lesson cannot last more than (\d+) hours\.$/,
    'Une leçon ne peut pas durer plus de $1 heures.',
  ],
  [/^A lesson can use at most (\d+) courts\.$/, 'Une leçon peut utiliser au plus $1 terrains.'],
  [
    /^A weekly series runs for (\d+) to (\d+) weeks\.$/,
    'Une série hebdomadaire dure de $1 à $2 semaines.',
  ],
];

export function translateValidation(message: string, locale: Locale): string;
export function translateValidation(
  message: string | undefined,
  locale: Locale,
): string | undefined;
export function translateValidation(
  message: string | undefined,
  locale: Locale,
): string | undefined {
  if (!message || locale === 'en') return message;
  if (message in FRENCH) return FRENCH[message];
  for (const [pattern, replacement] of FRENCH_PATTERNS) {
    if (pattern.test(message)) return message.replace(pattern, replacement);
  }
  return message;
}

/** `(message) => message in the app language`, for form errors. */
export function useValidationMessage() {
  const { locale } = useI18n();
  return useCallback(
    <T extends string | undefined>(message: T) => translateValidation(message, locale) as T,
    [locale],
  );
}
