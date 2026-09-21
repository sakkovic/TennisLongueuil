import Ionicons from '@expo/vector-icons/Ionicons';
import type { ComponentProps, ReactNode } from 'react';
import { Pressable, StyleSheet, View } from 'react-native';

import { colors, spacing, touchTarget } from '@/constants/theme';

import { AppText } from './AppText';

interface ListRowProps {
  label: string;
  onPress: () => void;
  icon?: ComponentProps<typeof Ionicons>['name'];
  description?: string;
  tone?: 'default' | 'danger';
  trailing?: ReactNode;
}

export function ListRow({
  label,
  onPress,
  icon,
  description,
  tone = 'default',
  trailing,
}: ListRowProps) {
  const color = tone === 'danger' ? colors.danger : colors.text;
  return (
    <Pressable
      onPress={onPress}
      accessibilityRole="button"
      accessibilityLabel={label}
      style={({ pressed }) => [styles.row, pressed && styles.pressed]}
    >
      {icon ? <Ionicons name={icon} size={22} color={color} /> : null}
      <View style={styles.text}>
        <AppText variant="bodyStrong" style={{ color }}>
          {label}
        </AppText>
        {description ? (
          <AppText variant="caption" tone="muted">
            {description}
          </AppText>
        ) : null}
      </View>
      {trailing ?? <Ionicons name="chevron-forward" size={18} color={colors.textSubtle} />}
    </Pressable>
  );
}

const styles = StyleSheet.create({
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
    minHeight: touchTarget + 8,
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.sm,
  },
  pressed: { backgroundColor: colors.surfaceMuted },
  text: { flex: 1, gap: spacing.xxs },
});
