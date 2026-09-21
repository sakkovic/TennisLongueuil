import { ImageManipulator, SaveFormat } from 'expo-image-manipulator';

import { AVATAR_BUCKET, supabase } from '@/lib/supabase';
import { toMember, type Member } from '@/types/models';

/** The signed-in member's full profile (including private contact details). */
export async function fetchMyProfile(): Promise<Member | null> {
  const { data, error } = await supabase.rpc('get_my_profile');
  if (error) throw error;
  const row = data?.[0];
  return row ? toMember(row) : null;
}

export interface ProfileUpdate {
  full_name: string;
  phone: string | null;
}

/**
 * Members may only change their name, phone and avatar. The database grants
 * UPDATE on exactly those columns, so role / level / active cannot be sent.
 */
export async function updateMyProfile(userId: string, update: ProfileUpdate): Promise<void> {
  const { error } = await supabase.from('profiles').update(update).eq('id', userId);
  if (error) throw error;
}

const AVATAR_SIZE = 512;

/** Resize the picked photo to a small JPEG, upload it, and point the profile at it. */
export async function uploadMyAvatar(userId: string, localUri: string): Promise<void> {
  const context = ImageManipulator.manipulate(localUri);
  context.resize({ width: AVATAR_SIZE });
  const image = await context.renderAsync();
  const resized = await image.saveAsync({ format: SaveFormat.JPEG, compress: 0.8 });

  const body = await fetch(resized.uri).then((response) => response.arrayBuffer());
  // Storage policies only allow this exact path for the signed-in member.
  const path = `${userId}/profile.jpg`;

  const { error: uploadError } = await supabase.storage.from(AVATAR_BUCKET).upload(path, body, {
    contentType: 'image/jpeg',
    upsert: true,
    cacheControl: '3600',
  });
  if (uploadError) throw uploadError;

  // Setting the path (even to the same value) bumps updated_at, which busts image caches.
  const { error } = await supabase.from('profiles').update({ avatar_path: path }).eq('id', userId);
  if (error) throw error;
}

export async function updatePassword(password: string): Promise<void> {
  const { error } = await supabase.auth.updateUser({ password });
  if (error) throw error;
}
