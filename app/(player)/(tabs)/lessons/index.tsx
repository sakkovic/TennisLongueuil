import { router } from 'expo-router';
import { useMemo, useState } from 'react';

import { ScreenContainer } from '@/components/ScreenContainer';
import { EmptyState, ErrorState, LoadingState } from '@/components/States';
import { useCurrentMember } from '@/features/auth/AuthProvider';
import { useLessonsRealtime, useUpcomingLessons } from '@/features/lessons/hooks';
import { LessonCard } from '@/features/lessons/LessonCard';
import {
  liveUpcomingLessons,
  resolveWeekKey,
  weeksFromItems,
} from '@/features/lessons/lessonWeeks';
import { WeekSelector } from '@/features/lessons/WeekSelector';
import { getLessonAvailability } from '@/features/lessons/lessonState';
import { findMyRegistration } from '@/features/lessons/api';
import { hasLessonActions, LessonActions } from '@/features/registrations/LessonActions';
import { useT } from '@/i18n';

export default function PlayerLessonsScreen() {
  const t = useT();
  const member = useCurrentMember();
  const [weekKey, setWeekKey] = useState<string | null>(null);
  const upcoming = useUpcomingLessons();
  useLessonsRealtime();

  const live = useMemo(() => liveUpcomingLessons(upcoming.data), [upcoming.data]);
  const weeks = useMemo(() => weeksFromItems(live, (lesson) => lesson.start_time), [live]);
  const selectedWeek = resolveWeekKey(weeks, weekKey, 'soonest');
  const visible = weeks.find((week) => week.key === selectedWeek)?.items ?? [];

  return (
    <ScreenContainer onRefresh={() => void upcoming.refetch()} refreshing={upcoming.isRefetching}>
      {weeks.length > 1 && selectedWeek ? (
        <WeekSelector weeks={weeks} value={selectedWeek} onChange={setWeekKey} />
      ) : null}

      {upcoming.isPending ? (
        <LoadingState />
      ) : upcoming.isError ? (
        <ErrorState
          error={upcoming.error}
          onRetry={() => void upcoming.refetch()}
          retrying={upcoming.isRefetching}
        />
      ) : live.length === 0 ? (
        <EmptyState
          icon="calendar-outline"
          title={t('noUpcomingTitleShort')}
          message={t('noUpcomingPlayer')}
        />
      ) : visible.length === 0 ? (
        <EmptyState icon="calendar-outline" title={t('noLessonsThisWeek')} />
      ) : (
        visible.map((lesson) => (
          <LessonCard
            key={lesson.id}
            lesson={lesson}
            currentUserId={member.id}
            onPress={() => router.push({ pathname: '/lessons/[id]', params: { id: lesson.id } })}
            actions={
              hasLessonActions(
                getLessonAvailability(lesson, findMyRegistration(lesson, member.id)?.status),
              ) ? (
                <LessonActions lesson={lesson} userId={member.id} />
              ) : undefined
            }
          />
        ))
      )}
    </ScreenContainer>
  );
}
