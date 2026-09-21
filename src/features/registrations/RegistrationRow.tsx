import Ionicons from '@expo/vector-icons/Ionicons';
import { StyleSheet, View } from 'react-native';

import { AppText } from '@/components/AppText';
import { StatusBadge, type BadgeTone } from '@/components/Badges';
import { Card } from '@/components/Card';
import { colors, spacing } from '@/constants/theme';
import { formatShortDate, formatTimeRange } from '@/utils/date';

import { getHistoryLabel, type HistoryLabel, type PlayerRegistration } from './api';

const historyTones: Record<HistoryLabel, BadgeTone> = {
  Registered: 'neutral',
  Cancelled: 'warning',
  'Lesson cancelled': 'danger',
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
  const { lesson } = registration;
  const label = variant === 'upcoming' ? null : getHistoryLabel(registration);

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
        {label ? (
          <StatusBadge label={label} tone={historyTones[label]} />
        ) : (
          <StatusBadge label="Registered" tone="success" icon="checkmark" />
        )}
      </View>
      {showReason && registration.status === 'cancelled' && registration.cancellation_reason ? (
        <AppText variant="caption" tone="muted">
          Reason: {registration.cancellation_reason}
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
