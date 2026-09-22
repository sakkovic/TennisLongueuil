import { router } from 'expo-router';
import { useMemo, useState } from 'react';

import { Banner } from '@/components/Banner';
import { ScreenContainer } from '@/components/ScreenContainer';
import { ScreenHeader } from '@/components/ScreenHeader';
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
import { useJoinLesson, useJoinWaitlist } from '@/features/registrations/hooks';
import { useT } from '@/i18n';
import { getErrorMessage, logError } from '@/utils/errors';

export default function PlayerLessonsScreen() {
  const t = useT();
  const member = useCurrentMember();
  const [weekKey, setWeekKey] = useState<string | null>(null);
  const [feedback, setFeedback] = useState<{ tone: 'success' | 'danger'; text: string } | null>(
    null,
  );
  const upcoming = useUpcomingLessons();
  const join = useJoinLesson();
  const waitlist = useJoinWaitlist();
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
      <ScreenHeader title={t('tabLessons')} />
      {feedback ? <Banner tone={feedback.tone} message={feedback.text} /> : null}
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
            joining={join.isPending && join.variables?.lessonId === lesson.id}
            onPress={() => router.push({ pathname: '/lesson/[id]', params: { id: lesson.id } })}
            onJoin={() => {
              setFeedback(null);
              join.mutate(
                { lessonId: lesson.id, title: lesson.title, startTime: lesson.start_time },
                {
                  onSuccess: () => setFeedback({ tone: 'success', text: t('youreIn') }),
                  onError: (error) => {
                    logError('joinLesson', error);
                    setFeedback({ tone: 'danger', text: getErrorMessage(error) });
                  },
                },
              );
            }}
            joiningWaitlist={waitlist.isPending && waitlist.variables?.lessonId === lesson.id}
            onJoinWaitlist={() => {
              setFeedback(null);
              waitlist.mutate(
                { lessonId: lesson.id, title: lesson.title, startTime: lesson.start_time },
                {
                  onSuccess: (result) =>
                    setFeedback({
                      tone: 'success',
                      text:
                        result.status === 'joined'
                          ? t('youreIn')
                          : t('waitlistJoined', { position: result.waitlist_position ?? 1 }),
                    }),
                  onError: (error) => {
                    logError('joinWaitlist', error);
                    setFeedback({ tone: 'danger', text: getErrorMessage(error) });
                  },
                },
              );
            }}
          />
        ))
      )}
    </ScreenContainer>
  );
}
