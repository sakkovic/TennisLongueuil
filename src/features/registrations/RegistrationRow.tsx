import Ionicons from '@expo/vector-icons/Ionicons';
import { StyleSheet, View } from 'react-native';

import { AppText } from '@/components/AppText';
import { StatusBadge, type BadgeTone } from '@/components/Badges';
import { Card } from '@/components/Card';
import { colors, spacing } from '@/constants/theme';
import { useT } from '@/i18n';
import type { TranslationKey } from '@/i18n/strings';
import { DateBadge } from '@/features/lessons/DateBadge';
import { formatShortDate, formatTimeRange } from '@/utils/date';

import { getHistoryLabel, type HistoryLabel, type PlayerRegistration } from './api';

const historyBadges: Record<HistoryLabel, { key: TranslationKey; tone: BadgeTone }> = {
  registered: { key: 'registered', tone: 'neutral' },
  present: { key: 'present', tone: 'success' },
  absent: { key: 'absent', tone: 'warning' },
  cancelled: { key: 'cancelled', tone: 'warning' },
  lessonCancelled: { key: 'lessonCancelled', tone: 'danger' },
  missedWaitlist: { key: 'stayedOnWaitlist', tone: 'neutral' },
};

interface RegistrationRowProps {
  registration: PlayerRegistration;
  variant: 'upcoming' | 'history';
  onPress: () => void;
  /** Show the cancellation reason (own history, or admins). */
  showReason?: boolean;
}

export function RegistrationRow({
  registration,
  variant,
  onPress,
  showReason = false,
}: RegistrationRowProps) {
  const t = useT();
  const { lesson } = registration;
  const badge =
    variant === 'history'
      ? historyBadges[getHistoryLabel(registration)]
      : registration.status === 'waitlisted'
        ? ({ key: 'onWaitlist', tone: 'info' } as const)
        : ({ key: 'registered', tone: 'success' } as const);

  return (
    <Card
      onPress={onPress}
      accessibilityLabel={`${lesson.title}, ${formatShortDate(lesson.start_time)}`}
    >
      <View style={styles.row}>
        <DateBadge date={lesson.start_time} muted={variant === 'history'} />
        <View style={styles.text}>
          <View style={styles.topLine}>
            <AppText variant="heading" numberOfLines={1} style={styles.time}>
              {formatTimeRange(lesson.start_time, lesson.end_time)}
            </AppText>
            <StatusBadge
              label={t(badge.key)}
              tone={badge.tone}
              icon={badge.tone === 'success' ? 'checkmark' : undefined}
            />
          </View>
          <AppText variant="label" tone="muted" numberOfLines={1}>
            {lesson.title}
          </AppText>
          <View style={styles.location}>
            <Ionicons name="location-outline" size={14} color={colors.textMuted} />
            <AppText variant="caption" tone="muted" numberOfLines={1} style={styles.flex}>
              {lesson.location}
            </AppText>
          </View>
        </View>
      </View>
      {variant === 'upcoming' && registration.status === 'joined' && registration.promoted_at ? (
        <AppText variant="caption" tone="muted">
          {t('movedUp')}
        </AppText>
      ) : null}
      {showReason && registration.status === 'cancelled' && registration.cancellation_reason ? (
        <AppText variant="caption" tone="muted">
          {t('reasonLabel', { reason: registration.cancellation_reason })}
        </AppText>
      ) : null}
    </Card>
  );
}

const styles = StyleSheet.create({
  row: { flexDirection: 'row', alignItems: 'center', gap: spacing.md },
  topLine: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    alignItems: 'center',
    justifyContent: 'space-between',
    columnGap: spacing.sm,
    rowGap: spacing.xs,
  },
  time: { flexShrink: 1 },
  text: { flex: 1, gap: spacing.xxs },
  location: { flexDirection: 'row', alignItems: 'center', gap: spacing.xs, marginTop: spacing.xxs },
  flex: { flex: 1 },
});
