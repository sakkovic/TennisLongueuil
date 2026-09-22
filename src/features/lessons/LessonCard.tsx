import { Pressable, StyleSheet, View } from 'react-native';

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
  /** Show "Join the waitlist" when the lesson is full (players). */
  onJoinWaitlist?: () => void;
  joiningWaitlist?: boolean;
  now?: Date;
  /** Date, time and capacity only — for "later" lists. */
  compact?: boolean;
  /** Keep who was signed up visible after a lesson is cancelled or finished. */
  archive?: boolean;
}

const MAX_AVATARS = 4;

export function LessonCard({
  lesson,
  currentUserId,
  onPress,
  onJoin,
  joining,
  onJoinWaitlist,
  joiningWaitlist,
  now,
  compact = false,
  archive = false,
}: LessonCardProps) {
  const t = useT();
  const active = getActiveRegistrations(lesson);
  const mine = findMyRegistration(lesson, currentUserId);
  const isRegistered = mine?.status === 'joined';
  const isWaitlisted = mine?.status === 'waitlisted';
  const availability = getLessonAvailability(lesson, mine?.status, now);
  const statusLabel = t(AVAILABILITY_LABEL_KEYS[availability.state]);
  const cancelled = availability.state === 'cancelled';
  const showBadge = availability.state !== 'open' && availability.state !== 'full';
  const names = active.map((r) => firstName(r.player.full_name));
  const marked = active.filter((r) => r.attendance);
  const present = marked.filter((r) => r.attendance?.status === 'present').length;

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
          ) : isWaitlisted ? (
            <StatusBadge label={t('onWaitlist')} tone="info" />
          ) : (
            <AppText variant="caption" tone="muted">
              {lesson.registered_count}/{lesson.capacity}
            </AppText>
          )}
        </View>
      </Card>
    );
  }

  const detailsLabel = `${lesson.title}, ${formatDayHeader(lesson.start_time)}`;
  const details = (
    <>
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

      {cancelled && !archive ? (
        <AppText tone="muted">{t('lessonCancelledNote')}</AppText>
      ) : (
        <>
          {cancelled ? <AppText tone="muted">{t('lessonCancelledNote')}</AppText> : null}
          <CapacityIndicator registered={lesson.registered_count} capacity={lesson.capacity} />
          {lesson.waitlist_count > 0 && !cancelled && !archive ? (
            <AppText variant="caption" tone="muted">
              {`${t('waitlist')} · ${t('waitingCount', { count: lesson.waitlist_count })}`}
            </AppText>
          ) : null}
          {archive && marked.length > 0 ? (
            <AppText variant="caption" tone="muted">
              {t('attendanceCount', { present, total: active.length })}
            </AppText>
          ) : null}
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
    </>
  );

  const actions = (
    <>
      {onJoin && availability.canJoin ? (
        <Button
          label={t('joinLesson')}
          icon="add-circle-outline"
          onPress={onJoin}
          loading={joining}
          testID={`join-${lesson.id}`}
        />
      ) : null}
      {onJoinWaitlist && availability.canJoinWaitlist ? (
        <Button
          label={t('joinWaitlist')}
          icon="hourglass-outline"
          variant="secondary"
          onPress={onJoinWaitlist}
          loading={joiningWaitlist}
          testID={`waitlist-${lesson.id}`}
        />
      ) : null}
      {onJoin && (isRegistered || isWaitlisted) && !cancelled ? (
        <Button label={t('viewLesson')} variant="secondary" size="md" onPress={onPress} />
      ) : null}
    </>
  );

  // Join/view live outside the card press target so web does not nest <button>s.
  return (
    <Card
      onPress={onJoin ? undefined : onPress}
      accessibilityLabel={onJoin ? undefined : detailsLabel}
      style={isRegistered && !cancelled ? styles.registered : undefined}
      testID={`lesson-card-${lesson.id}`}
    >
      {onJoin ? (
        <Pressable
          onPress={onPress}
          accessibilityRole="button"
          accessibilityLabel={detailsLabel}
          style={styles.details}
        >
          {details}
        </Pressable>
      ) : (
        details
      )}
      {actions}
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
  details: { gap: spacing.md },
});
