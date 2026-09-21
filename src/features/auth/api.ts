import { supabase } from '@/lib/supabase';

import { getPasswordResetRedirectUrl } from './recoveryLink';

export async function signIn(email: string, password: string): Promise<void> {
  const { error } = await supabase.auth.signInWithPassword({ email: email.trim(), password });
  if (error) throw error;
}

/**
 * Creates an account. The database trigger always makes it pending (inactive,
 * role 'player'), so signing up grants no access to club data until the coach
 * approves the member.
 *
 * Returns true when Supabase did not open a session, which means the project
 * requires the member to confirm their email address first.
 */
export async function signUp(
  email: string,
  password: string,
  fullName: string,
): Promise<{ needsEmailConfirmation: boolean }> {
  const { data, error } = await supabase.auth.signUp({
    email: email.trim(),
    password,
    // Only used for the profile name; the trigger ignores everything else.
    options: { data: { full_name: fullName.trim() } },
  });
  if (error) throw error;
  return { needsEmailConfirmation: data.session === null };
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
