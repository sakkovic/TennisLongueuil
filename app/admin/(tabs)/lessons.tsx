import { router } from 'expo-router';
import { useState } from 'react';

import { Button } from '@/components/Button';
import { ScreenContainer } from '@/components/ScreenContainer';
import { ScreenHeader } from '@/components/ScreenHeader';
import { SegmentedControl } from '@/components/SegmentedControl';
import { EmptyState, ErrorState, LoadingState } from '@/components/States';
import { useLessonsRealtime, usePastLessons, useUpcomingLessons } from '@/features/lessons/hooks';
import { LessonCard } from '@/features/lessons/LessonCard';
import { useT } from '@/i18n';

type Tab = 'upcoming' | 'past';

export default function AdminLessonsScreen() {
  const t = useT();
  const [tab, setTab] = useState<Tab>('upcoming');
  const upcoming = useUpcomingLessons();
  const past = usePastLessons(tab === 'past');
  useLessonsRealtime();

  const query = tab === 'upcoming' ? upcoming : past;

  return (
    <ScreenContainer
      edges={['top']}
      onRefresh={() => void query.refetch()}
      refreshing={query.isRefetching}
    >
      <ScreenHeader
        title={t('tabLessons')}
        action={
          <Button
            label={t('newLabel')}
            icon="add"
            size="md"
            fullWidth={false}
            onPress={() => router.push('/admin/lesson/new')}
          />
        }
      />
      <SegmentedControl
        options={[
          { value: 'upcoming', label: t('upcoming') },
          { value: 'past', label: t('past') },
        ]}
        value={tab}
        onChange={setTab}
      />

      {query.isPending ? (
        <LoadingState />
      ) : query.isError ? (
        <ErrorState
          error={query.error}
          onRetry={() => void query.refetch()}
          retrying={query.isRefetching}
        />
      ) : query.data.length === 0 ? (
        tab === 'upcoming' ? (
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
        ) : (
          <EmptyState icon="time-outline" title={t('noPastLessons')} />
        )
      ) : (
        query.data.map((lesson) => (
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
