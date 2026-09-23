import Ionicons from '@expo/vector-icons/Ionicons';
import type { ComponentProps, ReactNode } from 'react';
import { Pressable, StyleSheet, View } from 'react-native';

import { AppText } from '@/components/AppText';
import { StatusBadge } from '@/components/Badges';
import { CapacityIndicator } from '@/components/CapacityIndicator';
import { Card } from '@/components/Card';
import { PlayerAvatar } from '@/components/PlayerAvatar';
import { colors, radius, spacing, stroke } from '@/constants/theme';
import { useT } from '@/i18n';
import { formatDayHeader, formatTimeRange } from '@/utils/date';
import { firstName, formatNameList } from '@/utils/names';

import { findMyRegistration, getActiveRegistrations, type Lesson } from './api';
import { DateBadge } from './DateBadge';
import { AVAILABILITY_LABEL_KEYS, getLessonAvailability } from './lessonState';

interface LessonCardProps {
  lesson: Lesson;
  currentUserId?: string;
  /** Opens the lesson screen. */
  onPress: () => void;
  /** Buttons shown at the bottom of the card (players: join, cancel…). */
  actions?: ReactNode;
  now?: Date;
  /** Keep who was signed up visible after a lesson is cancelled or finished. */
  archive?: boolean;
}

const MAX_AVATARS = 4;

export function LessonCard({
  lesson,
  currentUserId,
  onPress,
  actions,
  now,
  archive = false,
}: LessonCardProps) {
  const t = useT();
  const active = getActiveRegistrations(lesson);
  const mine = findMyRegistration(lesson, currentUserId);
  const availability = getLessonAvailability(lesson, mine?.status, now);
  const cancelled = availability.state === 'cancelled';
  const registered = availability.state === 'registered';
  // Open and full are already shown by the capacity bar.
  const showBadge = availability.state !== 'open' && availability.state !== 'full';
  const names = active.map((r) => firstName(r.player.full_name));
  const marked = active.filter((r) => r.attendance);
  const present = marked.filter((r) => r.attendance?.status === 'present').length;
  const time = formatTimeRange(lesson.start_time, lesson.end_time);
  const detailsLabel = `${lesson.title}, ${formatDayHeader(lesson.start_time, now)}, ${time}`;

  const details = (
    <>
      <View style={styles.header}>
        <DateBadge date={lesson.start_time} muted={cancelled} />
        <View style={styles.headerText}>
          <View style={styles.topLine}>
            <AppText
              variant="heading"
              style={[styles.time, cancelled && styles.struck]}
              numberOfLines={1}
            >
              {time}
            </AppText>
            {lesson.is_private ? (
              <StatusBadge label={t('privateBadge')} tone="accent" icon="lock-closed" />
            ) : null}
            {showBadge ? (
              <StatusBadge
                label={t(AVAILABILITY_LABEL_KEYS[availability.state])}
                tone={availability.tone}
                icon={registered ? 'checkmark' : undefined}
              />
            ) : null}
          </View>
          <AppText variant="bodyStrong" numberOfLines={1} style={cancelled && styles.struck}>
            {lesson.title}
          </AppText>
          <Meta icon="location-outline" text={lesson.location} />
          <Meta icon="tennisball-outline" text={lesson.level?.name ?? t('allLevels')} />
        </View>
      </View>

      {cancelled && !archive ? (
        <AppText tone="muted">{t('lessonCancelledNote')}</AppText>
      ) : (
        <View style={styles.body}>
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
              <AppText variant="caption" tone="muted" style={styles.flex} numberOfLines={1}>
                {formatNameList(names)}
              </AppText>
            </View>
          ) : null}
        </View>
      )}
    </>
  );

  const cardStyle = registered ? styles.registered : cancelled ? styles.cancelled : undefined;

  if (!actions) {
    return (
      <Card
        onPress={onPress}
        accessibilityLabel={detailsLabel}
        style={cardStyle}
        testID={`lesson-card-${lesson.id}`}
      >
        {details}
      </Card>
    );
  }

  // The buttons live outside the pressable area, so web never nests <button>s.
  return (
    <Card style={cardStyle} testID={`lesson-card-${lesson.id}`}>
      <Pressable
        onPress={onPress}
        accessibilityRole="button"
        accessibilityLabel={detailsLabel}
        style={({ pressed }) => [styles.details, pressed && styles.pressed]}
      >
        {details}
      </Pressable>
      <View style={styles.divider} />
      {actions}
    </Card>
  );
}

function Meta({ icon, text }: { icon: ComponentProps<typeof Ionicons>['name']; text: string }) {
  return (
    <View style={styles.meta}>
      <Ionicons name={icon} size={14} color={colors.textMuted} />
      <AppText variant="caption" tone="muted" numberOfLines={1} style={styles.flex}>
        {text}
      </AppText>
    </View>
  );
}

const styles = StyleSheet.create({
  registered: { borderColor: colors.success },
  cancelled: { backgroundColor: colors.surfaceMuted },
  details: { gap: spacing.md, borderRadius: radius.md },
  pressed: { opacity: 0.7 },
  header: { flexDirection: 'row', gap: spacing.md, alignItems: 'flex-start' },
  headerText: { flex: 1, gap: spacing.xxs + 1 },
  topLine: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    alignItems: 'center',
    justifyContent: 'space-between',
    columnGap: spacing.sm,
    rowGap: spacing.xs,
  },
  time: { flexShrink: 1 },
  struck: { color: colors.textMuted, textDecorationLine: 'line-through' },
  meta: { flexDirection: 'row', alignItems: 'center', gap: spacing.xs },
  body: { gap: spacing.sm },
  participants: { flexDirection: 'row', alignItems: 'center', gap: spacing.sm },
  avatars: { flexDirection: 'row' },
  avatar: { borderRadius: 16, borderWidth: 2, borderColor: colors.surface },
  overlap: { marginLeft: -10 },
  flex: { flex: 1 },
  divider: { height: stroke, backgroundColor: colors.border },
});
