import { router } from 'expo-router';
import { useEffect } from 'react';
import { Pressable } from 'react-native';

import { Banner } from '@/components/Banner';
import { ScreenContainer } from '@/components/ScreenContainer';
import { ErrorState } from '@/components/States';
import { useCurrentMember } from '@/features/auth/AuthProvider';
import { slotsFromLessons } from '@/features/home/posterSessions';
import { SessionPoster } from '@/features/home/SessionPoster';
import { findMyRegistration } from '@/features/lessons/api';
import { useLessonsRealtime, useUpcomingLessons } from '@/features/lessons/hooks';
import { scheduleLessonReminder } from '@/features/notifications/reminders';
import { useT } from '@/i18n';
import { formatDateTime } from '@/utils/date';
import { firstName } from '@/utils/names';

const PROMOTION_NOTICE_MS = 3 * 24 * 60 * 60 * 1000;

export default function HomeScreen() {
  const t = useT();
  const member = useCurrentMember();
  const lessons = useUpcomingLessons();
  useLessonsRealtime();

  const now = new Date();
  const upcoming = lessons.data ?? [];
  const openLesson = (lessonId: string) =>
    router.push({ pathname: '/lesson/[id]', params: { id: lessonId } });

  // Lessons the member was moved into from the waitlist while away.
  const promoted = upcoming.filter((lesson) => {
    const mine = findMyRegistration(lesson, member.id);
    return (
      lesson.status === 'scheduled' &&
      mine?.status === 'joined' &&
      mine.promoted_at !== null &&
      new Date(lesson.start_time) > now
    );
  });
  const promotedKey = promoted.map((lesson) => `${lesson.id}@${lesson.start_time}`).join(',');
  // The good news stays on the home screen for a few days, then just shows as "registered".
  const recentPromotion = promoted.find((lesson) => {
    const promotedAt = findMyRegistration(lesson, member.id)?.promoted_at;
    return promotedAt && now.getTime() - Date.parse(promotedAt) < PROMOTION_NOTICE_MS;
  });

  // Reminders are scheduled on the device that joins. A promotion happens on
  // the server, so schedule the reminder here once the app sees it.
  useEffect(() => {
    for (const lesson of promoted) {
      void scheduleLessonReminder({
        lessonId: lesson.id,
        title: lesson.title,
        startTime: lesson.start_time,
      });
    }
    // promotedKey captures every lesson id and start time in `promoted`.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [promotedKey]);

  // The two tiles already open the next lessons. The CTA goes to the full list.
  const primaryAction = upcoming.length
    ? {
        label: t('bookYourSpot'),
        onPress: () => router.navigate('/lessons'),
      }
    : { label: t('newSessionsSoon'), onPress: () => undefined, disabled: true };

  return (
    <ScreenContainer
      edges={['top']}
      onRefresh={() => void lessons.refetch()}
      refreshing={lessons.isRefetching}
    >
      {recentPromotion ? (
        <Pressable
          onPress={() => openLesson(recentPromotion.id)}
          accessibilityRole="button"
          accessibilityLabel={t('spotOpenedHome', {
            when: formatDateTime(recentPromotion.start_time),
          })}
        >
          <Banner
            tone="success"
            message={t('spotOpenedHome', { when: formatDateTime(recentPromotion.start_time) })}
          />
        </Pressable>
      ) : null}

      <SessionPoster
        playerName={firstName(member.full_name)}
        slots={slotsFromLessons(upcoming, member.id, now)}
        loading={lessons.isPending}
        onPressSlot={openLesson}
        primaryAction={primaryAction}
      />

      {lessons.isError ? (
        <ErrorState
          error={lessons.error}
          onRetry={() => void lessons.refetch()}
          retrying={lessons.isRefetching}
        />
      ) : null}
    </ScreenContainer>
  );
}
