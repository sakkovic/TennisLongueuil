import * as Linking from 'expo-linking';

/**
 * Where Supabase sends members after they tap the link in a password-reset
 * email: tennislongueuil://reset-password in store builds, an exp:// URL in
 * Expo Go. The URL must be in Supabase Auth > URL Configuration > Redirect URLs.
 */
export function getPasswordResetRedirectUrl(): string {
  return Linking.createURL('reset-password');
}

export type RecoveryLinkResult =
  | { kind: 'session'; accessToken: string; refreshToken: string }
  | { kind: 'error'; message: string };

const EXPIRED_MESSAGE = 'This reset link is invalid or has expired. Please request a new one.';

/**
 * Reads the redirect Supabase appends to a password-reset link, e.g.
 *   …/reset-password#access_token=…&refresh_token=…&type=recovery
 *   …/reset-password#error=access_denied&error_code=otp_expired&error_description=…
 * Returns null for any other URL, so normal deep links are left alone.
 */
export function parseRecoveryLink(url: string): RecoveryLinkResult | null {
  const params = new URLSearchParams();
  const queryStart = url.indexOf('?');
  const hashStart = url.indexOf('#');
  if (queryStart !== -1) {
    const end = hashStart > queryStart ? hashStart : url.length;
    new URLSearchParams(url.slice(queryStart + 1, end)).forEach((v, k) => params.set(k, v));
  }
  if (hashStart !== -1) {
    new URLSearchParams(url.slice(hashStart + 1)).forEach((v, k) => params.set(k, v));
  }

  if (params.has('error') || params.has('error_code')) {
    // Only react to errors coming back from a reset link.
    return url.includes('reset-password') ? { kind: 'error', message: EXPIRED_MESSAGE } : null;
  }

  const accessToken = params.get('access_token');
  const refreshToken = params.get('refresh_token');
  if (params.get('type') !== 'recovery' || !accessToken || !refreshToken) return null;
  return { kind: 'session', accessToken, refreshToken };
}
