import { Image } from 'expo-image';
import { StyleSheet, View } from 'react-native';

import { APP_NAME } from '@/constants/brand';
import { spacing } from '@/constants/theme';

import { AppText } from './AppText';

const emblem = require('../../assets/brand/emblem.png');

interface BrandMarkProps {
  /** "inline": emblem beside the name (headers). "stacked": emblem above (login). */
  layout?: 'inline' | 'stacked';
  size?: 'sm' | 'md' | 'lg';
  subtitle?: string;
}

const sizes = {
  sm: { emblem: 30, font: 20, line: 26 },
  md: { emblem: 46, font: 28, line: 34 },
  lg: { emblem: 88, font: 36, line: 44 },
} as const;

/** The SaKKa.Tennis emblem and serif wordmark. */
export function BrandMark({ layout = 'inline', size = 'md', subtitle }: BrandMarkProps) {
  const dims = sizes[size];
  const stacked = layout === 'stacked';

  return (
    <View
      style={[styles.base, stacked ? styles.stacked : styles.inline]}
      accessible
      accessibilityRole="header"
      accessibilityLabel={subtitle ? `${APP_NAME}. ${subtitle}` : APP_NAME}
    >
      <Image
        source={emblem}
        style={{ width: dims.emblem, height: dims.emblem }}
        contentFit="contain"
        accessibilityIgnoresInvertColors
      />
      <View style={stacked ? styles.stackedText : styles.inlineText}>
        <AppText
          variant="display"
          tone="primary"
          style={{ fontSize: dims.font, lineHeight: dims.line }}
          maxFontSizeMultiplier={1.2}
          numberOfLines={1}
        >
          {APP_NAME}
        </AppText>
        {subtitle ? (
          <AppText
            variant="caption"
            tone="muted"
            style={stacked ? styles.centered : undefined}
            numberOfLines={2}
          >
            {subtitle}
          </AppText>
        ) : null}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  base: { gap: spacing.md },
  inline: { flexDirection: 'row', alignItems: 'center' },
  stacked: { alignItems: 'center' },
  inlineText: { flex: 1, gap: spacing.xxs },
  stackedText: { alignItems: 'center', gap: spacing.xs },
  centered: { textAlign: 'center' },
});
