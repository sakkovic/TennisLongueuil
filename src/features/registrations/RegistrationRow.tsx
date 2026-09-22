import Ionicons from '@expo/vector-icons/Ionicons';
import { StyleSheet, View } from 'react-native';

import { AppText } from '@/components/AppText';
import { StatusBadge, type BadgeTone } from '@/components/Badges';
import { Card } from '@/components/Card';
import { colors, spacing } from '@/constants/theme';
import { useT } from '@/i18n';
import type { TranslationKey } from '@/i18n/strings';
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
        <View style={styles.text}>
          <AppText variant="bodyStrong">{formatShortDate(lesson.start_time)}</AppText>
          <AppText tone="muted">{formatTimeRange(lesson.start_time, lesson.end_time)}</AppText>
          <View style={styles.location}>
            <Ionicons name="location-outline" size={14} color={colors.textMuted} />
            <AppText variant="caption" tone="muted" numberOfLines={1} style={styles.flex}>
              {lesson.location}
            </AppText>
          </View>
        </View>
        <StatusBadge
          label={t(badge.key)}
          tone={badge.tone}
          icon={badge.tone === 'success' ? 'checkmark' : undefined}
        />
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
  row: { flexDirection: 'row', alignItems: 'flex-start', gap: spacing.md },
  text: { flex: 1, gap: spacing.xxs },
  location: { flexDirection: 'row', alignItems: 'center', gap: spacing.xs, marginTop: spacing.xxs },
  flex: { flex: 1 },
});
