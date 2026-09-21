import type { ReactNode } from 'react';
import { StyleSheet, View } from 'react-native';

import { spacing } from '@/constants/theme';

import { AppText } from './AppText';

interface ScreenHeaderProps {
  title: string;
  subtitle?: string;
  overline?: string;
  action?: ReactNode;
}

/** Large title used at the top of tab screens. */
export function ScreenHeader({ title, subtitle, overline, action }: ScreenHeaderProps) {
  return (
    <View style={styles.row}>
      <View style={styles.text}>
        {overline ? (
          <AppText variant="overline" tone="primary">
            {overline}
          </AppText>
        ) : null}
        <AppText variant="display" accessibilityRole="header">
          {title}
        </AppText>
        {subtitle ? <AppText tone="muted">{subtitle}</AppText> : null}
      </View>
      {action}
    </View>
  );
}

const styles = StyleSheet.create({
  row: { flexDirection: 'row', alignItems: 'flex-end', gap: spacing.md, paddingTop: spacing.sm },
  text: { flex: 1, gap: spacing.xs },
});
