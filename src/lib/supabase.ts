import { createClient } from '@supabase/supabase-js';
import { AppState, Platform } from 'react-native';

import { config } from '@/constants/config';
import type { Database } from '@/types/database';

import { authStorage } from './secureStorage';

// Placeholder values keep the module importable when the app is not configured;
// the root layout then shows a configuration message instead of crashing.
export const supabase = createClient<Database>(
  config.supabaseUrl || 'http://localhost',
  config.supabaseKey || 'not-configured',
  {
    auth: {
      storage: authStorage,
      storageKey: 'tennis-longueuil-auth',
      autoRefreshToken: true,
      persistSession: true,
      detectSessionInUrl: false,
    },
  },
);

// Refresh tokens only while the app is in the foreground.
if (Platform.OS !== 'web') {
  AppState.addEventListener('change', (state) => {
    if (state === 'active') {
      supabase.auth.startAutoRefresh();
    } else {
      supabase.auth.stopAutoRefresh();
    }
  });
}

export const AVATAR_BUCKET = 'avatars';

/**
 * Public URL of a member's avatar. `version` (the profile's updated_at) busts
 * image caches after the member uploads a new photo to the same path.
 */
export function getAvatarUrl(
  avatarPath: string | null | undefined,
  version?: string | null,
): string | null {
  if (!avatarPath) return null;
  const { publicUrl } = supabase.storage.from(AVATAR_BUCKET).getPublicUrl(avatarPath).data;
  return version ? `${publicUrl}?v=${encodeURIComponent(version)}` : publicUrl;
}
