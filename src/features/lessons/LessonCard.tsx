import { StyleSheet, View } from 'react-native';

import { AppText } from '@/components/AppText';
import { StatusBadge } from '@/components/Badges';
import { Button } from '@/components/Button';
import { CapacityIndicator } from '@/components/CapacityIndicator';
import { Card } from '@/components/Card';
import { InfoRow } from '@/components/InfoRow';
import { PlayerAvatar } from '@/components/PlayerAvatar';
import { colors, spacing } from '@/constants/theme';
import { useT } from '@/i18n';
import { formatDayHeader, formatTimeRange } from '@/utils/date';
import { firstName, formatNameList } from '@/utils/names';

import { findMyRegistration, getActiveRegistrations, type Lesson } from './api';
import { AVAILABILITY_LABEL_KEYS, getLessonAvailability } from './lessonState';

interface LessonCardProps {
  lesson: Lesson;
  currentUserId?: string;
  onPress: () => void;
  /** Show the Join button (players). Omit for admin lists. */
  onJoin?: () => void;
  joining?: boolean;
  now?: Date;
  /** Date, time and capacity only — for "later" lists. */
  compact?: boolean;
}

const MAX_AVATARS = 4;

export function LessonCard({
  lesson,
  currentUserId,
  onPress,
  onJoin,
  joining,
  now,
  compact = false,
}: LessonCardProps) {
  const t = useT();
  const active = getActiveRegistrations(lesson);
  const mine = findMyRegistration(lesson, currentUserId);
  const isRegistered = mine?.status === 'joined';
  const availability = getLessonAvailability(lesson, isRegistered, now);
  const statusLabel = t(AVAILABILITY_LABEL_KEYS[availability.state]);
  const cancelled = availability.state === 'cancelled';
  const showBadge = availability.state !== 'open' && availability.state !== 'full';
  const names = active.map((r) => firstName(r.player.full_name));

  if (compact) {
    return (
      <Card
        onPress={onPress}
        accessibilityLabel={`${lesson.title}, ${formatDayHeader(lesson.start_time)}`}
        style={isRegistered && !cancelled ? styles.registered : undefined}
      >
        <View style={styles.topRow}>
          <View style={styles.compactText}>
            <AppText variant="overline" tone={cancelled ? 'subtle' : 'primary'}>
              {formatDayHeader(lesson.start_time, now)}
            </AppText>
            <AppText variant="bodyStrong" numberOfLines={1}>
              {formatTimeRange(lesson.start_time, lesson.end_time)}
            </AppText>
          </View>
          {cancelled ? (
            <StatusBadge label={t('cancelled')} tone="danger" />
          ) : isRegistered ? (
            <StatusBadge label={t('registered')} tone="success" icon="checkmark" />
          ) : (
            <AppText variant="caption" tone="muted">
              {lesson.registered_count}/{lesson.capacity}
            </AppText>
          )}
        </View>
      </Card>
    );
  }

  return (
    <Card
      onPress={onPress}
      accessibilityLabel={`${lesson.title}, ${formatDayHeader(lesson.start_time)}`}
      style={isRegistered && !cancelled ? styles.registered : undefined}
      testID={`lesson-card-${lesson.id}`}
    >
      <View style={styles.topRow}>
        <AppText variant="overline" tone={cancelled ? 'subtle' : 'primary'}>
          {formatDayHeader(lesson.start_time, now)}
        </AppText>
        {showBadge ? (
          <StatusBadge
            label={statusLabel}
            tone={availability.tone}
            icon={isRegistered && !cancelled ? 'checkmark' : undefined}
          />
        ) : null}
      </View>

      <AppText variant="heading" style={cancelled && styles.struck} numberOfLines={2}>
        {lesson.title}
      </AppText>

      <View style={styles.meta}>
        <InfoRow icon="time-outline" text={formatTimeRange(lesson.start_time, lesson.end_time)} />
        <InfoRow icon="location-outline" text={lesson.location} />
        <InfoRow icon="tennisball-outline" text={lesson.level?.name ?? t('allLevels')} />
      </View>

      {cancelled ? (
        <AppText tone="muted">{t('lessonCancelledNote')}</AppText>
      ) : (
        <>
          <CapacityIndicator registered={lesson.registered_count} capacity={lesson.capacity} />
          {active.length > 0 ? (
            <View style={styles.participants}>
              <View style={styles.avatars}>
                {active.slice(0, MAX_AVATARS).map((registration, index) => (
                  <View key={registration.id} style={[styles.avatar, index > 0 && styles.overlap]}>
                    <PlayerAvatar
                      name={registration.player.full_name}
                      avatarPath={registration.player.avatar_path}
                      version={registration.player.updated_at}
                      size={28}
                    />
                  </View>
                ))}
              </View>
              <AppText variant="caption" tone="muted" style={styles.names} numberOfLines={1}>
                {formatNameList(names)}
              </AppText>
            </View>
          ) : null}
        </>
      )}

      {onJoin && availability.canJoin ? (
        <Button
          label={t('joinLesson')}
          icon="add-circle-outline"
          onPress={onJoin}
          loading={joining}
          testID={`join-${lesson.id}`}
        />
      ) : null}
      {onJoin && isRegistered && !cancelled ? (
        <Button label={t('viewLesson')} variant="secondary" size="md" onPress={onPress} />
      ) : null}
    </Card>
  );
}

const styles = StyleSheet.create({
  registered: { borderColor: colors.success, borderWidth: 1.5 },
  topRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: spacing.sm,
  },
  struck: { color: colors.textMuted, textDecorationLine: 'line-through' },
  meta: { gap: spacing.xs + 2 },
  participants: { flexDirection: 'row', alignItems: 'center', gap: spacing.sm },
  avatars: { flexDirection: 'row' },
  avatar: { borderRadius: 16, borderWidth: 2, borderColor: colors.surface },
  overlap: { marginLeft: -10 },
  names: { flex: 1 },
  compactText: { flex: 1, gap: spacing.xxs },
});
