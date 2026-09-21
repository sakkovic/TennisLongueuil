import Ionicons from '@expo/vector-icons/Ionicons';
import { Pressable, StyleSheet, Switch, View } from 'react-native';

import { colors, radius, spacing, touchTarget } from '@/constants/theme';

import { AppText } from './AppText';

interface SwitchRowProps {
  label: string;
  description?: string;
  value: boolean;
  onValueChange: (value: boolean) => void;
}

export function SwitchRow({ label, description, value, onValueChange }: SwitchRowProps) {
  return (
    <View style={styles.switchRow}>
      <View style={styles.flex}>
        <AppText variant="bodyStrong">{label}</AppText>
        {description ? (
          <AppText variant="caption" tone="muted">
            {description}
          </AppText>
        ) : null}
      </View>
      <Switch
        value={value}
        onValueChange={onValueChange}
        accessibilityLabel={label}
        trackColor={{ true: colors.primary, false: colors.borderStrong }}
        thumbColor={colors.text}
      />
    </View>
  );
}

interface StepperProps {
  label: string;
  value: number;
  min: number;
  max: number;
  onChange: (value: number) => void;
  /** e.g. "2 courts" */
  formatValue?: (value: number) => string;
}

export function Stepper({ label, value, min, max, onChange, formatValue }: StepperProps) {
  const display = formatValue ? formatValue(value) : String(value);
  return (
    <View style={styles.stepperRow}>
      <AppText variant="label" tone="muted" style={styles.flex}>
        {label}
      </AppText>
      <View
        style={styles.stepper}
        accessibilityRole="adjustable"
        accessibilityValue={{ text: display }}
      >
        <StepButton
          icon="remove"
          label={`Decrease ${label}`}
          disabled={value <= min}
          onPress={() => onChange(Math.max(min, value - 1))}
        />
        <AppText variant="heading" style={styles.stepValue}>
          {value}
        </AppText>
        <StepButton
          icon="add"
          label={`Increase ${label}`}
          disabled={value >= max}
          onPress={() => onChange(Math.min(max, value + 1))}
        />
      </View>
    </View>
  );
}

function StepButton({
  icon,
  label,
  disabled,
  onPress,
}: {
  icon: 'add' | 'remove';
  label: string;
  disabled: boolean;
  onPress: () => void;
}) {
  return (
    <Pressable
      onPress={onPress}
      disabled={disabled}
      accessibilityRole="button"
      accessibilityLabel={label}
      accessibilityState={{ disabled }}
      style={({ pressed }) => [
        styles.stepButton,
        pressed && styles.stepButtonPressed,
        disabled && styles.disabled,
      ]}
    >
      <Ionicons name={icon} size={22} color={colors.primary} />
    </Pressable>
  );
}

interface ChipOption<T> {
  value: T;
  label: string;
}

interface ChipGroupProps<T> {
  label?: string;
  options: ChipOption<T>[];
  value: T;
  onChange: (value: T) => void;
  disabled?: boolean;
}

export function ChipGroup<T extends string | number | null>({
  label,
  options,
  value,
  onChange,
  disabled = false,
}: ChipGroupProps<T>) {
  return (
    <View style={styles.chipGroup}>
      {label ? (
        <AppText variant="label" tone="muted">
          {label}
        </AppText>
      ) : null}
      <View style={styles.chips} accessibilityRole="radiogroup">
        {options.map((option) => {
          const selected = option.value === value;
          return (
            <Pressable
              key={String(option.value)}
              onPress={() => onChange(option.value)}
              disabled={disabled}
              accessibilityRole="radio"
              accessibilityState={{ selected, disabled }}
              style={[styles.chip, selected && styles.chipSelected, disabled && styles.disabled]}
            >
              {selected ? <Ionicons name="checkmark" size={16} color={colors.onPrimary} /> : null}
              <AppText variant="label" tone={selected ? 'inverse' : 'default'}>
                {option.label}
              </AppText>
            </Pressable>
          );
        })}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  flex: { flex: 1, gap: spacing.xxs },
  switchRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
    minHeight: touchTarget,
  },
  stepperRow: { flexDirection: 'row', alignItems: 'center', gap: spacing.md },
  stepper: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.surface,
    borderRadius: radius.md,
    borderWidth: 1,
    borderColor: colors.border,
  },
  stepButton: {
    width: touchTarget,
    height: touchTarget,
    alignItems: 'center',
    justifyContent: 'center',
  },
  stepButtonPressed: { backgroundColor: colors.surfaceMuted },
  stepValue: { minWidth: 36, textAlign: 'center' },
  disabled: { opacity: 0.35 },
  chipGroup: { gap: spacing.sm },
  chips: { flexDirection: 'row', flexWrap: 'wrap', gap: spacing.sm },
  chip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.xs,
    minHeight: 40,
    paddingHorizontal: spacing.md + 2,
    borderRadius: radius.pill,
    borderWidth: 1,
    borderColor: colors.borderStrong,
    backgroundColor: colors.surface,
  },
  chipSelected: { backgroundColor: colors.primary, borderColor: colors.primary },
});
