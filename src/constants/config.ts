/**
 * Client-safe runtime configuration.
 *
 * EXPO_PUBLIC_* variables are inlined into the bundle at build time, so only
 * public values may be used here. The Supabase service-role key must never
 * appear anywhere in the app.
 */
const supabaseUrl = process.env.EXPO_PUBLIC_SUPABASE_URL ?? '';
const supabaseKey =
  process.env.EXPO_PUBLIC_SUPABASE_PUBLISHABLE_KEY ??
  process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY ??
  '';

export const config = {
  supabaseUrl,
  supabaseKey,
  isSupabaseConfigured: supabaseUrl.startsWith('http') && supabaseKey.length > 0,
} as const;
