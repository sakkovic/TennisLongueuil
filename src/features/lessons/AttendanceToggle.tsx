import Ionicons from '@expo/vector-icons/Ionicons';
import { ActivityIndicator, Pressable, StyleSheet, View } from 'react-native';

import { AppText } from '@/components/AppText';
import { colors, radius, spacing, stroke } from '@/constants/theme';
import { useT } from '@/i18n';
import type { AttendanceStatus } from '@/types/models';

interface AttendanceToggleProps {
  playerName: string;
  value: AttendanceStatus | null;
  /** Tapping the selected choice again clears it (null). */
  onChange: (value: AttendanceStatus | null) => void;
  saving?: boolean;
}

const choices = [
  { value: 'present', icon: 'checkmark', color: colors.success, soft: colors.successSoft },
  { value: 'absent', icon: 'close', color: colors.warning, soft: colors.warningSoft },
] as const;

/** Present / Absent pills next to a player on the coach's lesson screen. */
export function AttendanceToggle({ playerName, value, onChange, saving }: AttendanceToggleProps) {
  const t = useT();
  return (
    <View style={styles.row}>
      {saving ? <ActivityIndicator size="small" color={colors.primary} /> : null}
      {choices.map((choice) => {
        const selected = value === choice.value;
        return (
          <Pressable
            key={choice.value}
            onPress={() => onChange(selected ? null : choice.value)}
            disabled={saving}
            accessibilityRole="checkbox"
            accessibilityState={{ checked: selected, disabled: saving }}
            accessibilityLabel={t(choice.value === 'present' ? 'markPresent' : 'markAbsent', {
              name: playerName,
            })}
            hitSlop={4}
            style={({ pressed }) => [
              styles.pill,
              selected && { backgroundColor: choice.soft, borderColor: choice.color },
              pressed && styles.pressed,
            ]}
          >
            <Ionicons
              name={choice.icon}
              size={16}
              color={selected ? choice.color : colors.textSubtle}
            />
            <AppText
              variant="caption"
              style={[styles.label, { color: selected ? choice.color : colors.textMuted }]}
            >
              {t(choice.value)}
            </AppText>
          </Pressable>
        );
      })}
    </View>
  );
}

const styles = StyleSheet.create({
  row: { flexDirection: 'row', alignItems: 'center', gap: spacing.xs },
  pill: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.xxs,
    minHeight: 36,
    paddingHorizontal: spacing.sm,
    borderRadius: radius.pill,
    borderWidth: stroke,
    borderColor: colors.border,
    backgroundColor: colors.surface,
  },
  pressed: { opacity: 0.7 },
  label: { fontWeight: '700' },
});
