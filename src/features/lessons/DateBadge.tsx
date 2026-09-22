import { StyleSheet, View } from 'react-native';

import { AppText } from '@/components/AppText';
import { colors, fonts, radius, spacing, stroke } from '@/constants/theme';
import { formatMonthShort, formatWeekdayShort, toDate, type DateInput } from '@/utils/date';

/**
 * Calendar-style date block ("LUN / 28 / SEPT."), so the day of a lesson reads
 * at a glance in a list. Decorative: the card's own label says the date.
 */
export function DateBadge({ date, muted = false }: { date: DateInput; muted?: boolean }) {
  const value = toDate(date);
  return (
    <View
      style={[styles.badge, muted && styles.mutedBadge]}
      accessibilityElementsHidden
      importantForAccessibility="no-hide-descendants"
    >
      <AppText style={[styles.small, muted && styles.mutedText]} maxFontSizeMultiplier={1.2}>
        {formatWeekdayShort(value).replace('.', '').toUpperCase()}
      </AppText>
      <AppText style={[styles.day, muted && styles.mutedText]} maxFontSizeMultiplier={1.2}>
        {value.getDate()}
      </AppText>
      <AppText style={[styles.small, muted && styles.mutedText]} maxFontSizeMultiplier={1.2}>
        {formatMonthShort(value).replace('.', '').toUpperCase()}
      </AppText>
    </View>
  );
}

const styles = StyleSheet.create({
  badge: {
    width: 62,
    alignItems: 'center',
    paddingVertical: spacing.sm,
    borderRadius: radius.md,
    borderWidth: stroke,
    borderColor: colors.lime,
    backgroundColor: colors.lime,
  },
  mutedBadge: { borderColor: colors.border, backgroundColor: colors.surfaceMuted },
  small: {
    fontFamily: fonts.bold,
    fontSize: 11,
    lineHeight: 14,
    letterSpacing: 1,
    color: colors.onLime,
  },
  day: { fontFamily: fonts.extraBold, fontSize: 26, lineHeight: 30, color: colors.onLime },
  mutedText: { color: colors.textSubtle },
});
