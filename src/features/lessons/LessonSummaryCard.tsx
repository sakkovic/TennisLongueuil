import type { ReactNode } from 'react';
import { StyleSheet, View } from 'react-native';

import { AppText } from '@/components/AppText';
import { StatusBadge } from '@/components/Badges';
import { CapacityIndicator } from '@/components/CapacityIndicator';
import { Card } from '@/components/Card';
import { InfoRow } from '@/components/InfoRow';
import { colors, spacing, stroke } from '@/constants/theme';
import { useT } from '@/i18n';
import { formatDateTime, formatLongDate, formatTimeRange } from '@/utils/date';

import type { Lesson } from './api';
import { DateBadge } from './DateBadge';
import { AVAILABILITY_LABEL_KEYS, type LessonAvailability } from './lessonState';

interface LessonSummaryCardProps {
  lesson: Lesson;
  availability: LessonAvailability;
  /** Shown at the bottom of the card: the player's actions, or coach notes. */
  children?: ReactNode;
}

/**
 * The lesson at a glance, in one box: date, time, place, level, courts,
 * places taken, and what can be done. Shared by the player and coach screens.
 */
export function LessonSummaryCard({ lesson, availability, children }: LessonSummaryCardProps) {
  const t = useT();
  const cancelled = availability.state === 'cancelled';
  const upcoming =
    availability.state === 'open' ||
    availability.state === 'full' ||
    availability.state === 'registered' ||
    availability.state === 'waitlisted' ||
    availability.state === 'deadline_passed';
  const courts = t(lesson.court_count === 1 ? 'courtOne' : 'courtOther', {
    count: lesson.court_count,
  });
  const players = t(lesson.capacity === 1 ? 'playerOne' : 'playerOther', {
    count: lesson.capacity,
  });

  return (
    <Card style={availability.state === 'registered' ? styles.registered : undefined}>
      <View style={styles.header}>
        <DateBadge date={lesson.start_time} muted={cancelled} />
        <View style={styles.headerText}>
          {/* Open and full are already shown by the capacity bar. */}
          {availability.state !== 'open' && availability.state !== 'full' ? (
            <View style={styles.badge}>
              <StatusBadge
                label={t(AVAILABILITY_LABEL_KEYS[availability.state])}
                tone={availability.tone}
                icon={availability.state === 'registered' ? 'checkmark' : undefined}
              />
            </View>
          ) : null}
          <AppText
            variant="title"
            accessibilityRole="header"
            style={cancelled ? styles.struck : undefined}
          >
            {lesson.title}
          </AppText>
          <AppText variant="heading">{formatTimeRange(lesson.start_time, lesson.end_time)}</AppText>
        </View>
      </View>

      <View style={styles.meta}>
        <InfoRow icon="calendar-outline" text={formatLongDate(lesson.start_time)} />
        <InfoRow icon="location-outline" text={lesson.location} />
        <InfoRow icon="tennisball-outline" text={lesson.level?.name ?? t('allLevels')} />
        <InfoRow icon="grid-outline" text={`${courts} · ${players}`} />
        {/* Only worth showing when the coach closes registration before the start. */}
        {upcoming && availability.registrationClosesAt < new Date(lesson.start_time) ? (
          <InfoRow
            icon="hourglass-outline"
            text={t('registrationClosesAt', {
              when: formatDateTime(availability.registrationClosesAt),
            })}
          />
        ) : null}
      </View>
      {lesson.description ? <AppText tone="muted">{lesson.description}</AppText> : null}

      <View style={styles.divider} />
      <CapacityIndicator
        registered={lesson.registered_count}
        capacity={lesson.capacity}
        size="large"
        hideAvailability={cancelled}
      />
      {children}
    </Card>
  );
}

const styles = StyleSheet.create({
  registered: { borderColor: colors.success },
  header: { flexDirection: 'row', gap: spacing.md, alignItems: 'flex-start' },
  headerText: { flex: 1, gap: spacing.xs },
  badge: { alignSelf: 'flex-start' },
  struck: { color: colors.textMuted, textDecorationLine: 'line-through' },
  meta: { gap: spacing.sm },
  divider: { height: stroke, backgroundColor: colors.border },
});
