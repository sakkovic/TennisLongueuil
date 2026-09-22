import Ionicons from '@expo/vector-icons/Ionicons';
import type { ComponentProps } from 'react';
import { ActivityIndicator, Pressable, StyleSheet, View, type ViewStyle } from 'react-native';

import {
  colors,
  radius,
  shadow,
  spacing,
  stroke,
  touchTarget,
  typography,
} from '@/constants/theme';

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
    pressed: colors.navySoft,
    text: colors.navy,
    border: colors.navy,
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
    text: colors.navy,
    border: 'transparent',
  },
  accent: {
    background: colors.navy,
    pressed: colors.header,
    text: colors.onNavy,
    border: colors.navy,
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
  const idleDisabled = disabled && !loading;
  const textColor = idleDisabled ? colors.disabledText : palette.text;

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
        idleDisabled && styles.disabled,
        style,
      ]}
    >
      <View style={styles.content}>
        {loading ? (
          <ActivityIndicator color={textColor} size="small" />
        ) : icon ? (
          <Ionicons name={icon} size={20} color={textColor} />
        ) : null}
        <AppText
          style={[typography.bodyStrong, styles.label, { color: textColor }]}
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
    borderRadius: radius.xl,
    borderWidth: stroke,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: spacing.lg,
  },
  lg: { minHeight: 52 },
  md: { minHeight: touchTarget - 4 },
  fullWidth: { alignSelf: 'stretch' },
  disabled: { backgroundColor: colors.disabled, borderColor: colors.disabled },
  content: { flexDirection: 'row', alignItems: 'center', gap: spacing.sm },
  label: { letterSpacing: 0.2 },
});
