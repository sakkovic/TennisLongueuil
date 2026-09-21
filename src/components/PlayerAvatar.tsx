import { Image } from 'expo-image';
import { StyleSheet, View } from 'react-native';

import { colors } from '@/constants/theme';
import { getAvatarUrl } from '@/lib/supabase';

import { AppText } from './AppText';

interface PlayerAvatarProps {
  name: string;
  avatarPath?: string | null;
  /** Cache-busting version, typically the profile's updated_at. */
  version?: string | null;
  size?: number;
}

const fallbackColors = ['#0E4D2E', '#1D4E89', '#5B2A9D', '#9A3412', '#0F6E6E', '#7A5A00'];

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
        accessibilityLabel={`${name}'s photo`}
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
  initials: { color: colors.onPrimary, fontWeight: '700' },
});
