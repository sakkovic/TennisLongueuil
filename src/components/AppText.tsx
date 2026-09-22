import { Text, type TextProps } from 'react-native';

import { colors, typography } from '@/constants/theme';

export type TextVariant = keyof typeof typography;
export type TextTone =
  | 'default'
  | 'muted'
  | 'subtle'
  | 'primary'
  | 'navy'
  | 'danger'
  | 'success'
  | 'warning'
  | 'inverse';

const HEADING_VARIANTS = new Set<TextVariant>(['display', 'title', 'heading']);

const toneColors: Record<TextTone, string> = {
  default: colors.text,
  muted: colors.textMuted,
  subtle: colors.textSubtle,
  primary: colors.primary,
  navy: colors.navy,
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
      style={[
        typography[variant],
        {
          color:
            tone === 'default' && HEADING_VARIANTS.has(variant) ? colors.navy : toneColors[tone],
        },
        style,
      ]}
      {...rest}
    />
  );
}
