import Ionicons from '@expo/vector-icons/Ionicons';
import type { ComponentProps } from 'react';
import { StyleSheet, View } from 'react-native';

import { colors, radius, spacing } from '@/constants/theme';

import { AppText } from './AppText';

type BannerTone = 'success' | 'danger' | 'info' | 'warning';

const tones: Record<
  BannerTone,
  { background: string; text: string; icon: ComponentProps<typeof Ionicons>['name'] }
> = {
  success: { background: colors.successSoft, text: colors.success, icon: 'checkmark-circle' },
  danger: { background: colors.dangerSoft, text: colors.danger, icon: 'alert-circle' },
  info: { background: colors.infoSoft, text: colors.info, icon: 'information-circle' },
  warning: { background: colors.warningSoft, text: colors.warning, icon: 'warning' },
};

/** Inline feedback message (form errors, confirmations). */
export function Banner({ tone, message }: { tone: BannerTone; message: string }) {
  const palette = tones[tone];
  return (
    <View
      style={[styles.banner, { backgroundColor: palette.background }]}
      accessibilityRole={tone === 'danger' ? 'alert' : 'text'}
      accessibilityLiveRegion="polite"
    >
      <Ionicons name={palette.icon} size={20} color={palette.text} />
      <AppText variant="label" style={[styles.text, { color: palette.text }]}>
        {message}
      </AppText>
    </View>
  );
}

const styles = StyleSheet.create({
  banner: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: spacing.sm,
    padding: spacing.md,
    borderRadius: radius.md,
  },
  text: { flex: 1 },
});
