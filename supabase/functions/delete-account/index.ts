/**
 * Deletes the signed-in member's own account, for real.
 *
 * The App Store (guideline 5.1.1(v)) and Google Play both require an app with
 * sign-up to offer account deletion from inside the app. Removing an auth user
 * needs the service-role key, which must never reach the phone, so it happens
 * here: the function trusts nothing but the caller's own access token.
 *
 * Deleting the auth user cascades to the profile, which cascades to the
 * member's registrations and invitations; lesson counts are recomputed by the
 * database triggers, and a freed spot goes to the next player on the waitlist.
 * The lessons themselves are kept (created_by becomes NULL).
 *
 * Deploy with:  npx supabase functions deploy delete-account
 */
import { createClient } from 'jsr:@supabase/supabase-js@2';

const CORS = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, content-type',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
};

const json = (body: unknown, status: number) =>
  new Response(JSON.stringify(body), {
    status,
    headers: { ...CORS, 'Content-Type': 'application/json' },
  });

Deno.serve(async (request) => {
  if (request.method === 'OPTIONS') return new Response('ok', { headers: CORS });
  if (request.method !== 'POST') return json({ error: 'METHOD_NOT_ALLOWED' }, 405);

  const token = request.headers.get('Authorization')?.replace(/^Bearer\s+/i, '') ?? '';
  if (!token) return json({ error: 'NOT_AUTHENTICATED' }, 401);

  const admin = createClient(
    Deno.env.get('SUPABASE_URL') ?? '',
    Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? '',
    { auth: { persistSession: false, autoRefreshToken: false } },
  );

  // The caller is whoever the token says they are — never a value from the body.
  const { data: caller, error: authError } = await admin.auth.getUser(token);
  const user = caller?.user;
  if (authError || !user) return json({ error: 'NOT_AUTHENTICATED' }, 401);

  // The club would lose its coach (and every lesson's owner), so an admin
  // account is removed from the Supabase dashboard instead.
  const { data: profile } = await admin
    .from('profiles')
    .select('role')
    .eq('id', user.id)
    .maybeSingle();
  if (profile?.role === 'admin') return json({ error: 'ADMIN_CANNOT_DELETE' }, 403);

  const { error: deleteError } = await admin.auth.admin.deleteUser(user.id);
  if (deleteError) {
    console.error('deleteUser failed', deleteError);
    return json({ error: 'DELETE_FAILED' }, 500);
  }

  return json({ success: true }, 200);
});
