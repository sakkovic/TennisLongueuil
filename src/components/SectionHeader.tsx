import type { ReactNode } from 'react';
import { StyleSheet, View } from 'react-native';

import { spacing } from '@/constants/theme';

import { AppText } from './AppText';

interface SectionHeaderProps {
  title: string;
  count?: number;
  action?: ReactNode;
}

export function SectionHeader({ title, count, action }: SectionHeaderProps) {
  return (
    <View style={styles.row}>
      <AppText variant="overline" tone="muted" accessibilityRole="header">
        {title}
        {count !== undefined ? `  ·  ${count}` : ''}
      </AppText>
      {action}
    </View>
  );
}

const styles = StyleSheet.create({
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginTop: spacing.sm,
  },
});
