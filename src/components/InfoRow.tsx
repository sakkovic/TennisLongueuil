import Ionicons from '@expo/vector-icons/Ionicons';
import type { ComponentProps } from 'react';
import { StyleSheet, View } from 'react-native';

import { colors, spacing } from '@/constants/theme';

import { AppText, type TextVariant } from './AppText';

interface InfoRowProps {
  icon: ComponentProps<typeof Ionicons>['name'];
  text: string;
  variant?: TextVariant;
}

export function InfoRow({ icon, text, variant = 'body' }: InfoRowProps) {
  return (
    <View style={styles.row}>
      <Ionicons name={icon} size={18} color={colors.textMuted} />
      <AppText variant={variant} style={styles.text}>
        {text}
      </AppText>
    </View>
  );
}

const styles = StyleSheet.create({
  row: { flexDirection: 'row', alignItems: 'center', gap: spacing.sm },
  text: { flex: 1 },
});
