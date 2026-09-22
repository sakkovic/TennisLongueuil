import { Image } from 'expo-image';
import { StyleSheet, View } from 'react-native';

import { colors } from '@/constants/theme';
import { useT } from '@/i18n';
import { getAvatarUrl } from '@/lib/supabase';

import { AppText } from './AppText';

interface PlayerAvatarProps {
  name: string;
  avatarPath?: string | null;
  /** Cache-busting version, typically the profile's updated_at. */
  version?: string | null;
  size?: number;
}

// Deep tones that sit well on the dark UI, with light initials.
const fallbackColors = ['#0F3E40', '#1A3558', '#352A5E', '#4D311C', '#15443A', '#43401A'];

export function getInitials(name: string): string {
  const parts = name.trim().split(/\s+/).filter(Boolean);
  if (parts.length === 0) return '?';
  const first = parts[0][0] ?? '';
  const last = parts.length > 1 ? (parts[parts.length - 1][0] ?? '') : '';
  return (first + last).toUpperCase();
}

function colorFor(name: string): string {
  let hash = 0;
  for (const char of name) hash = (hash * 31 + char.charCodeAt(0)) >>> 0;
  return fallbackColors[hash % fallbackColors.length];
}

export function PlayerAvatar({ name, avatarPath, version, size = 40 }: PlayerAvatarProps) {
  const t = useT();
  const uri = getAvatarUrl(avatarPath, version);
  const dimension = { width: size, height: size, borderRadius: size / 2 };

  if (uri) {
    return (
      <Image
        source={{ uri }}
        style={[styles.image, dimension]}
        contentFit="cover"
        transition={150}
        cachePolicy="memory-disk"
        accessibilityLabel={t('photoOf', { name })}
      />
    );
  }

  return (
    <View
      style={[styles.fallback, dimension, { backgroundColor: colorFor(name) }]}
      accessibilityLabel={name}
    >
      <AppText
        style={[styles.initials, { fontSize: Math.round(size * 0.38) }]}
        maxFontSizeMultiplier={1}
      >
        {getInitials(name)}
      </AppText>
    </View>
  );
}

const styles = StyleSheet.create({
  image: { backgroundColor: colors.surfaceMuted },
  fallback: { alignItems: 'center', justifyContent: 'center' },
  initials: { color: colors.text, fontWeight: '700' },
});
