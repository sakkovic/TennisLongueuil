import Ionicons from '@expo/vector-icons/Ionicons';
import { StyleSheet, View } from 'react-native';

import { colors, radius, spacing } from '@/constants/theme';
import { useT } from '@/i18n';
import {
  formatCapacity,
  formatSpotsRemaining,
  isLessonFull,
  spotsRemaining,
} from '@/utils/capacity';

import { AppText } from './AppText';

interface CapacityIndicatorProps {
  registered: number;
  capacity: number;
  /** Compact for cards, large for lesson details. */
  size?: 'compact' | 'large';
  /** Hide the "spots remaining" line (e.g. for cancelled lessons). */
  hideAvailability?: boolean;
}

/** "3 / 4" with one segment per spot and "1 spot remaining" or FULL. */
export function CapacityIndicator({
  registered,
  capacity,
  size = 'compact',
  hideAvailability = false,
}: CapacityIndicatorProps) {
  const t = useT();
  const full = isLessonFull(registered, capacity);
  const remaining = spotsRemaining(registered, capacity);
  const large = size === 'large';
  const fillColor = full ? colors.warning : colors.primary;
  // One segment per spot; fall back to a continuous bar for big lessons.
  const segments = capacity <= 12 ? capacity : 0;

  return (
    <View
      style={styles.container}
      accessible
      accessibilityLabel={t('capacityA11y', {
        registered,
        capacity,
        availability: full ? t('lessonFull') : formatSpotsRemaining(registered, capacity),
      })}
    >
      <View style={styles.headerRow}>
        <View style={styles.countRow}>
          <Ionicons name="people" size={large ? 22 : 18} color={colors.textMuted} />
          <AppText variant={large ? 'title' : 'bodyStrong'}>
            {formatCapacity(registered, capacity)}
          </AppText>
          {large ? (
            <AppText tone="muted" variant="label">
              {t('playersWord')}
            </AppText>
          ) : null}
        </View>
        {hideAvailability ? null : full ? (
          <View style={styles.fullBadge}>
            <AppText variant="overline" style={styles.fullText}>
              {t('full')}
            </AppText>
          </View>
        ) : (
          <AppText variant="label" tone={remaining === 1 ? 'warning' : 'success'}>
            {formatSpotsRemaining(registered, capacity)}
          </AppText>
        )}
      </View>

      {segments > 0 ? (
        <View style={styles.segments}>
          {Array.from({ length: segments }, (_, index) => (
            <View
              key={index}
              style={[
                styles.segment,
                large && styles.segmentLarge,
                { backgroundColor: index < registered ? fillColor : colors.surfaceMuted },
              ]}
            />
          ))}
        </View>
      ) : (
        <View style={[styles.track, large && styles.segmentLarge]}>
          <View
            style={[
              styles.fill,
              {
                width: `${Math.min(100, (registered / Math.max(capacity, 1)) * 100)}%`,
                backgroundColor: fillColor,
              },
            ]}
          />
        </View>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: { gap: spacing.sm },
  headerRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  countRow: { flexDirection: 'row', alignItems: 'center', gap: spacing.sm },
  fullBadge: {
    backgroundColor: colors.warning,
    paddingHorizontal: spacing.sm + 2,
    paddingVertical: spacing.xxs + 1,
    borderRadius: radius.pill,
  },
  fullText: { color: colors.onPrimary, fontSize: 11, lineHeight: 14 },
  segments: { flexDirection: 'row', gap: spacing.xs },
  segment: { flex: 1, height: 6, borderRadius: radius.pill },
  segmentLarge: { height: 8 },
  track: {
    height: 6,
    borderRadius: radius.pill,
    backgroundColor: colors.surfaceMuted,
    overflow: 'hidden',
  },
  fill: { height: '100%', borderRadius: radius.pill },
});
