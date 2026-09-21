import { supabase } from '@/lib/supabase';

import { getPasswordResetRedirectUrl } from './recoveryLink';

export async function signIn(email: string, password: string): Promise<void> {
  const { error } = await supabase.auth.signInWithPassword({ email: email.trim(), password });
  if (error) throw error;
}

export async function signOut(): Promise<void> {
  const { error } = await supabase.auth.signOut();
  if (error) throw error;
}

/**
 * Emails a password-reset link that opens the app (the default Supabase email).
 * A custom email template can also include a code (see supabase/templates/recovery.html).
 */
export async function requestPasswordReset(email: string): Promise<void> {
  const { error } = await supabase.auth.resetPasswordForEmail(email.trim(), {
    redirectTo: getPasswordResetRedirectUrl(),
  });
  if (error) throw error;
}

/**
 * Verifies the emailed code. On success the member is signed in and Supabase
 * emits PASSWORD_RECOVERY, which routes them to the "new password" screen.
 */
export async function verifyResetCode(email: string, token: string): Promise<void> {
  const { error } = await supabase.auth.verifyOtp({
    email: email.trim(),
    token: token.trim(),
    type: 'recovery',
  });
  if (error) throw error;
}
