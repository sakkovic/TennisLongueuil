import Ionicons from '@expo/vector-icons/Ionicons';
import type { ComponentProps } from 'react';
import { ActivityIndicator, Pressable, StyleSheet, View, type ViewStyle } from 'react-native';

import { colors, radius, shadow, spacing, touchTarget, typography } from '@/constants/theme';

import { AppText } from './AppText';

export type ButtonVariant = 'primary' | 'secondary' | 'danger' | 'ghost' | 'accent';
type IconName = ComponentProps<typeof Ionicons>['name'];

interface ButtonProps {
  label: string;
  onPress: () => void;
  variant?: ButtonVariant;
  icon?: IconName;
  loading?: boolean;
  disabled?: boolean;
  /** Stretch to the container width (default). */
  fullWidth?: boolean;
  size?: 'md' | 'lg';
  style?: ViewStyle;
  accessibilityHint?: string;
  testID?: string;
}

const variants: Record<
  ButtonVariant,
  { background: string; pressed: string; text: string; border: string }
> = {
  primary: {
    background: colors.primary,
    pressed: colors.primaryPressed,
    text: colors.onPrimary,
    border: colors.primary,
  },
  secondary: {
    background: 'transparent',
    pressed: colors.surfacePressed,
    text: colors.primary,
    border: colors.borderStrong,
  },
  danger: {
    background: 'transparent',
    pressed: colors.dangerSoft,
    text: colors.danger,
    border: colors.dangerBorder,
  },
  ghost: {
    background: 'transparent',
    pressed: colors.surfacePressed,
    text: colors.primary,
    border: 'transparent',
  },
  accent: {
    background: colors.accent,
    pressed: colors.accentPressed,
    text: colors.onAccent,
    border: colors.accent,
  },
};

/**
 * The app's button. While `loading` it shows a spinner and ignores presses,
 * so an action (join, cancel, save…) can never be sent twice.
 */
export function Button({
  label,
  onPress,
  variant = 'primary',
  icon,
  loading = false,
  disabled = false,
  fullWidth = true,
  size = 'lg',
  style,
  accessibilityHint,
  testID,
}: ButtonProps) {
  const palette = variants[variant];
  const inactive = disabled || loading;

  return (
    <Pressable
      testID={testID}
      accessibilityRole="button"
      accessibilityLabel={label}
      accessibilityHint={accessibilityHint}
      accessibilityState={{ disabled: inactive, busy: loading }}
      disabled={inactive}
      onPress={onPress}
      style={({ pressed }) => [
        styles.base,
        size === 'md' ? styles.md : styles.lg,
        fullWidth && styles.fullWidth,
        {
          backgroundColor: pressed ? palette.pressed : palette.background,
          borderColor: palette.border,
        },
        variant === 'primary' && !inactive && shadow.glow,
        disabled && !loading && styles.disabled,
        style,
      ]}
    >
      <View style={styles.content}>
        {loading ? (
          <ActivityIndicator color={palette.text} size="small" />
        ) : icon ? (
          <Ionicons name={icon} size={20} color={palette.text} />
        ) : null}
        <AppText
          style={[typography.bodyStrong, styles.label, { color: palette.text }]}
          numberOfLines={1}
        >
          {label}
        </AppText>
      </View>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  base: {
    borderRadius: radius.md,
    borderWidth: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: spacing.lg,
  },
  lg: { minHeight: 52 },
  md: { minHeight: touchTarget - 4 },
  fullWidth: { alignSelf: 'stretch' },
  disabled: { opacity: 0.45 },
  content: { flexDirection: 'row', alignItems: 'center', gap: spacing.sm },
  label: { letterSpacing: 0.2 },
});
