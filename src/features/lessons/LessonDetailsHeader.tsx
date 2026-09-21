import { StyleSheet, View } from 'react-native';

import { AppText } from '@/components/AppText';
import { StatusBadge } from '@/components/Badges';
import { InfoRow } from '@/components/InfoRow';
import { spacing } from '@/constants/theme';
import { useT } from '@/i18n';
import { formatDateTime, formatLongDate, formatTimeRange } from '@/utils/date';

import type { Lesson } from './api';
import { AVAILABILITY_LABEL_KEYS, type LessonAvailability } from './lessonState';

interface LessonDetailsHeaderProps {
  lesson: Lesson;
  availability: LessonAvailability;
}

/** Title, date, time, location, level and courts, shared by player and admin details. */
export function LessonDetailsHeader({ lesson, availability }: LessonDetailsHeaderProps) {
  const t = useT();
  const upcoming =
    availability.state === 'open' ||
    availability.state === 'full' ||
    availability.state === 'registered' ||
    availability.state === 'deadline_passed';
  const courts = t(lesson.court_count === 1 ? 'courtOne' : 'courtOther', {
    count: lesson.court_count,
  });
  const players = t(lesson.capacity === 1 ? 'playerOne' : 'playerOther', {
    count: lesson.capacity,
  });

  return (
    <View style={styles.container}>
      {availability.state !== 'open' ? (
        <StatusBadge
          label={t(AVAILABILITY_LABEL_KEYS[availability.state])}
          tone={availability.tone}
          icon={availability.state === 'registered' ? 'checkmark' : undefined}
        />
      ) : null}
      <AppText variant="display" accessibilityRole="header">
        {lesson.title}
      </AppText>
      <View style={styles.meta}>
        <InfoRow
          icon="calendar-outline"
          text={formatLongDate(lesson.start_time)}
          variant="bodyStrong"
        />
        <InfoRow icon="time-outline" text={formatTimeRange(lesson.start_time, lesson.end_time)} />
        <InfoRow icon="location-outline" text={lesson.location} />
        <InfoRow icon="tennisball-outline" text={lesson.level?.name ?? t('allLevels')} />
        <InfoRow icon="grid-outline" text={`${courts} · ${players}`} />
        {upcoming ? (
          <InfoRow
            icon="hourglass-outline"
            text={t('registrationClosesAt', {
              when: formatDateTime(availability.registrationClosesAt),
            })}
          />
        ) : null}
      </View>
      {lesson.description ? <AppText tone="muted">{lesson.description}</AppText> : null}
    </View>
  );
}

const styles = StyleSheet.create({
  container: { gap: spacing.md },
  meta: { gap: spacing.sm },
});
