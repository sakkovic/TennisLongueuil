import type { ReactNode } from 'react';
import { StyleSheet, View } from 'react-native';

import { fonts, spacing } from '@/constants/theme';

import { AppText } from './AppText';

interface ScreenHeaderProps {
  title: string;
  subtitle?: string;
  overline?: string;
  action?: ReactNode;
}

/** Same page title on every tab: size, weight and placement stay identical. */
export function ScreenHeader({ title, subtitle, overline, action }: ScreenHeaderProps) {
  return (
    <View style={styles.block}>
      {overline ? (
        <AppText variant="overline" tone="navy">
          {overline}
        </AppText>
      ) : null}
      <AppText
        variant="display"
        accessibilityRole="header"
        numberOfLines={1}
        maxFontSizeMultiplier={1.2}
        style={styles.title}
      >
        {title}
      </AppText>
      {subtitle ? <AppText tone="muted">{subtitle}</AppText> : null}
      {action ? <View style={styles.action}>{action}</View> : null}
    </View>
  );
}

const styles = StyleSheet.create({
  block: { gap: spacing.sm },
  title: {
    fontFamily: fonts.extraBold,
    fontSize: 28,
    lineHeight: 34,
    letterSpacing: -0.4,
  },
  action: { alignSelf: 'flex-start' },
});
