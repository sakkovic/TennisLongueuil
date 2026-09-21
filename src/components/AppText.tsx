import { Text, type TextProps } from 'react-native';

import { colors, typography } from '@/constants/theme';

export type TextVariant = keyof typeof typography;
export type TextTone =
  'default' | 'muted' | 'subtle' | 'primary' | 'danger' | 'success' | 'warning' | 'inverse';

const toneColors: Record<TextTone, string> = {
  default: colors.text,
  muted: colors.textMuted,
  subtle: colors.textSubtle,
  primary: colors.primary,
  danger: colors.danger,
  success: colors.success,
  warning: colors.warning,
  inverse: colors.onPrimary,
};

interface AppTextProps extends TextProps {
  variant?: TextVariant;
  tone?: TextTone;
}

export function AppText({ variant = 'body', tone = 'default', style, ...rest }: AppTextProps) {
  return (
    <Text
      maxFontSizeMultiplier={1.4}
      style={[typography[variant], { color: toneColors[tone] }, style]}
      {...rest}
    />
  );
}
