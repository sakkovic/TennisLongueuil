import { router } from 'expo-router';
import { useMemo, useState } from 'react';
import { StyleSheet, View } from 'react-native';

import { Button } from '@/components/Button';
import { ScreenContainer } from '@/components/ScreenContainer';
import { ScreenHeader } from '@/components/ScreenHeader';
import { EmptyState, ErrorState, LoadingState } from '@/components/States';
import { spacing } from '@/constants/theme';
import { useLessonsRealtime, useUpcomingLessons } from '@/features/lessons/hooks';
import { LessonCard } from '@/features/lessons/LessonCard';
import {
  liveUpcomingLessons,
  resolveWeekKey,
  weeksFromItems,
} from '@/features/lessons/lessonWeeks';
import { WeekSelector } from '@/features/lessons/WeekSelector';
import { useT } from '@/i18n';

export default function AdminLessonsScreen() {
  const t = useT();
  const [weekKey, setWeekKey] = useState<string | null>(null);
  const upcoming = useUpcomingLessons();
  useLessonsRealtime();

  const live = useMemo(() => liveUpcomingLessons(upcoming.data), [upcoming.data]);
  const weeks = useMemo(() => weeksFromItems(live, (lesson) => lesson.start_time), [live]);
  const selectedWeek = resolveWeekKey(weeks, weekKey, 'soonest');
  const visible = weeks.find((week) => week.key === selectedWeek)?.items ?? [];

  return (
    <ScreenContainer
      edges={['top']}
      onRefresh={() => void upcoming.refetch()}
      refreshing={upcoming.isRefetching}
    >
      <ScreenHeader
        title={t('tabLessons')}
        action={
          <View style={styles.actions}>
            <Button
              label={t('history')}
              variant="secondary"
              size="md"
              fullWidth={false}
              onPress={() => router.push('/admin/history')}
            />
            <Button
              label={t('newLabel')}
              icon="add"
              size="md"
              fullWidth={false}
              onPress={() => router.push('/admin/lesson/new')}
            />
          </View>
        }
      />
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
          message={t('noUpcomingCoachCreate')}
          action={
            <Button
              label={t('createLesson')}
              onPress={() => router.push('/admin/lesson/new')}
              fullWidth={false}
            />
          }
        />
      ) : visible.length === 0 ? (
        <EmptyState icon="calendar-outline" title={t('noLessonsThisWeek')} />
      ) : (
        visible.map((lesson) => (
          <LessonCard
            key={lesson.id}
            lesson={lesson}
            onPress={() =>
              router.push({ pathname: '/admin/lesson/[id]', params: { id: lesson.id } })
            }
          />
        ))
      )}
    </ScreenContainer>
  );
}

const styles = StyleSheet.create({
  actions: { flexDirection: 'row', alignItems: 'center', gap: spacing.sm },
});
