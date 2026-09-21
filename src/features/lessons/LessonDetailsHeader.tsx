import { StyleSheet, View } from 'react-native';

import { AppText } from '@/components/AppText';
import { StatusBadge } from '@/components/Badges';
import { InfoRow } from '@/components/InfoRow';
import { spacing } from '@/constants/theme';
import { formatCourts } from '@/utils/capacity';
import { formatDateTime, formatLongDate, formatTimeRange } from '@/utils/date';

import type { Lesson } from './api';
import type { LessonAvailability } from './lessonState';

interface LessonDetailsHeaderProps {
  lesson: Lesson;
  availability: LessonAvailability;
}

/** Title, date, time, location, level and courts, shared by player and admin details. */
export function LessonDetailsHeader({ lesson, availability }: LessonDetailsHeaderProps) {
  const deadline = lesson.registration_deadline;
  const showDeadline =
    deadline !== null && availability.state !== 'cancelled' && availability.state !== 'completed';

  return (
    <View style={styles.container}>
      {availability.state !== 'open' ? (
        <StatusBadge
          label={availability.label}
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
        <InfoRow icon="tennisball-outline" text={lesson.level?.name ?? 'All levels'} />
        <InfoRow icon="grid-outline" text={formatCourts(lesson.court_count, lesson.capacity)} />
        {showDeadline ? (
          <InfoRow
            icon="hourglass-outline"
            text={`Registration closes ${formatDateTime(deadline)}`}
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
