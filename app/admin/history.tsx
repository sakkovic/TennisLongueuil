import { router } from 'expo-router';
import { useMemo, useState } from 'react';

import { AppText } from '@/components/AppText';
import { ScreenContainer } from '@/components/ScreenContainer';
import { EmptyState, ErrorState, LoadingState } from '@/components/States';
import { useLessonsRealtime, usePastLessons, useUpcomingLessons } from '@/features/lessons/hooks';
import { LessonCard } from '@/features/lessons/LessonCard';
import { archiveLessons, resolveWeekKey, weeksFromItems } from '@/features/lessons/lessonWeeks';
import { WeekSelector } from '@/features/lessons/WeekSelector';
import { useT } from '@/i18n';

export default function AdminHistoryScreen() {
  const t = useT();
  const [weekKey, setWeekKey] = useState<string | null>(null);
  const upcoming = useUpcomingLessons();
  const past = usePastLessons();
  useLessonsRealtime();

  const archive = useMemo(
    () => archiveLessons(upcoming.data, past.data),
    [upcoming.data, past.data],
  );
  const weeks = useMemo(() => weeksFromItems(archive, (lesson) => lesson.start_time), [archive]);
  const selectedWeek = resolveWeekKey(weeks, weekKey, 'latest');
  const visible = weeks.find((week) => week.key === selectedWeek)?.items ?? [];
  const loading = upcoming.isPending || past.isPending;
  const error = upcoming.error ?? past.error;
  const refetch = () => {
    void upcoming.refetch();
    void past.refetch();
  };

  return (
    <ScreenContainer onRefresh={refetch} refreshing={upcoming.isRefetching || past.isRefetching}>
      <AppText tone="muted">{t('historyHint')}</AppText>
      {weeks.length > 1 && selectedWeek ? (
        <WeekSelector weeks={weeks} value={selectedWeek} onChange={setWeekKey} />
      ) : null}

      {loading ? (
        <LoadingState />
      ) : error ? (
        <ErrorState
          error={error}
          onRetry={refetch}
          retrying={upcoming.isRefetching || past.isRefetching}
        />
      ) : archive.length === 0 ? (
        <EmptyState icon="time-outline" title={t('noLessonHistory')} />
      ) : visible.length === 0 ? (
        <EmptyState icon="calendar-outline" title={t('noLessonsThisWeek')} />
      ) : (
        visible.map((lesson) => (
          <LessonCard
            key={lesson.id}
            lesson={lesson}
            archive
            onPress={() =>
              router.push({ pathname: '/admin/lesson/[id]', params: { id: lesson.id } })
            }
          />
        ))
      )}
    </ScreenContainer>
  );
}
