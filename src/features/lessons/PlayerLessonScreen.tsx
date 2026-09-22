import { Stack, useLocalSearchParams } from 'expo-router';

import { AppText } from '@/components/AppText';
import { Banner } from '@/components/Banner';
import { Card } from '@/components/Card';
import { ParticipantList } from '@/components/ParticipantList';
import { ScreenContainer } from '@/components/ScreenContainer';
import { SectionHeader } from '@/components/SectionHeader';
import { EmptyState, ErrorState, LoadingState } from '@/components/States';
import { useCurrentMember } from '@/features/auth/AuthProvider';
import { LessonActions } from '@/features/registrations/LessonActions';
import { useT } from '@/i18n';
import { formatDateTime } from '@/utils/date';

import { findMyRegistration, getActiveRegistrations, getWaitlist } from './api';
import { useLesson, useLessonsRealtime } from './hooks';
import { getLessonAvailability } from './lessonState';
import { LessonSummaryCard } from './LessonSummaryCard';
import { ShareLessonButton } from './ShareLessonButton';

/**
 * A lesson, for players. Opened inside the Home, Lessons or My Bookings tab
 * (each has its own route file), so the tab bar stays visible; the join and
 * cancel buttons are in the lesson card itself.
 */
export function PlayerLessonScreen() {
  const t = useT();
  const { id } = useLocalSearchParams<{ id: string }>();
  const member = useCurrentMember();
  const lessonQuery = useLesson(id);
  useLessonsRealtime(id);

  if (lessonQuery.isPending) return <LoadingState />;
  if (lessonQuery.isError) {
    return (
      <ErrorState
        error={lessonQuery.error}
        onRetry={() => void lessonQuery.refetch()}
        retrying={lessonQuery.isRefetching}
      />
    );
  }
  const lesson = lessonQuery.data;
  if (!lesson) {
    return (
      <EmptyState icon="search-outline" title={t('lessonNotFound')} message={t('lessonRemoved')} />
    );
  }

  const participants = getActiveRegistrations(lesson).map((registration) => registration.player);
  const waiting = getWaitlist(lesson).map((registration) => registration.player);
  const mine = findMyRegistration(lesson, member.id);
  const availability = getLessonAvailability(lesson, mine?.status);

  return (
    <ScreenContainer
      onRefresh={() => void lessonQuery.refetch()}
      refreshing={lessonQuery.isRefetching}
    >
      <Stack.Screen options={{ headerRight: () => <ShareLessonButton lesson={lesson} /> }} />

      {mine?.status === 'joined' && mine.promoted_at && availability.state === 'registered' ? (
        <Banner tone="success" message={t('spotOpened')} />
      ) : null}

      <LessonSummaryCard lesson={lesson} availability={availability}>
        <LessonActions lesson={lesson} userId={member.id} detailed />
      </LessonSummaryCard>

      <Card>
        <SectionHeader title={t('players')} count={participants.length} />
        <ParticipantList participants={participants} currentUserId={member.id} />
      </Card>

      {waiting.length > 0 && availability.state !== 'cancelled' ? (
        <Card>
          <SectionHeader title={t('waitlist')} count={waiting.length} />
          <ParticipantList participants={waiting} currentUserId={member.id} />
        </Card>
      ) : null}

      {mine?.status === 'cancelled' && mine.cancelled_at ? (
        <Card>
          <AppText variant="label" tone="muted">
            {t('youCancelledOn', { when: formatDateTime(mine.cancelled_at) })}
          </AppText>
          {mine.cancellation_reason ? (
            <AppText tone="muted">
              {t('yourReasonPrivate', { reason: mine.cancellation_reason })}
            </AppText>
          ) : null}
        </Card>
      ) : null}
    </ScreenContainer>
  );
}
