import { router } from 'expo-router';
import { Alert } from 'react-native';

import { AppText } from '@/components/AppText';
import { SectionHeader } from '@/components/SectionHeader';
import { ScreenContainer } from '@/components/ScreenContainer';
import { ErrorState } from '@/components/States';
import { useCurrentMember } from '@/features/auth/AuthProvider';
import { slotsFromLessons } from '@/features/home/posterSessions';
import { SessionPoster } from '@/features/home/SessionPoster';
import { findMyRegistration } from '@/features/lessons/api';
import { useLessonsRealtime, useUpcomingLessons } from '@/features/lessons/hooks';
import { LessonCard } from '@/features/lessons/LessonCard';
import { getLessonAvailability } from '@/features/lessons/lessonState';
import type { Lesson } from '@/features/lessons/api';
import { useJoinLesson } from '@/features/registrations/hooks';
import { useT } from '@/i18n';
import { formatDateTime, getGreeting } from '@/utils/date';
import { getErrorMessage, logError } from '@/utils/errors';
import { firstName } from '@/utils/names';

export default function HomeScreen() {
  const t = useT();
  const member = useCurrentMember();
  const lessons = useUpcomingLessons();
  const join = useJoinLesson();
  useLessonsRealtime();

  const handleJoin = (lesson: Lesson) => {
    join.mutate(
      { lessonId: lesson.id, title: lesson.title, startTime: lesson.start_time },
      {
        onError: (error) => {
          logError('joinLesson', error);
          Alert.alert(t('couldntJoin'), getErrorMessage(error));
        },
      },
    );
  };

  const now = new Date();
  const upcoming = lessons.data ?? [];
  const isMine = (lesson: Lesson) => findMyRegistration(lesson, member.id)?.status === 'joined';
  const nextOpen = upcoming.find(
    (lesson) => getLessonAvailability(lesson, isMine(lesson), now).canJoin,
  );
  const nextMine = upcoming.find(
    (lesson) => lesson.status === 'scheduled' && isMine(lesson) && new Date(lesson.end_time) > now,
  );
  const openLesson = (lessonId: string) =>
    router.push({ pathname: '/lesson/[id]', params: { id: lessonId } });

  // The poster's big button books the next open session, or opens the member's own.
  const primaryAction = nextOpen
    ? {
        label: t('bookYourSpot'),
        sublabel: t('nextSessionAt', { when: formatDateTime(nextOpen.start_time) }),
        onPress: () => openLesson(nextOpen.id),
      }
    : nextMine
      ? {
          label: t('viewMyNextLesson'),
          sublabel: formatDateTime(nextMine.start_time),
          icon: 'calendar' as const,
          onPress: () => openLesson(nextMine.id),
        }
      : { label: t('newSessionsSoon'), onPress: () => undefined, disabled: true };

  return (
    <ScreenContainer
      edges={['top']}
      onRefresh={() => void lessons.refetch()}
      refreshing={lessons.isRefetching}
    >
      <AppText variant="overline" tone="muted">
        {`${getGreeting()}, ${firstName(member.full_name)}`}
      </AppText>
      <SessionPoster
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
      ) : upcoming.length === 0 ? null : (
        <UpcomingLessons
          lessons={upcoming}
          currentUserId={member.id}
          joiningId={join.isPending ? join.variables?.lessonId : undefined}
          onJoin={handleJoin}
        />
      )}
    </ScreenContainer>
  );
}

function UpcomingLessons({
  lessons,
  currentUserId,
  joiningId,
  onJoin,
}: {
  lessons: Lesson[];
  currentUserId: string;
  joiningId?: string;
  onJoin: (lesson: Lesson) => void;
}) {
  const t = useT();
  const next = lessons.find((lesson) => lesson.status === 'scheduled') ?? lessons[0];
  const later = lessons.filter((lesson) => lesson.id !== next.id);
  const open = (lessonId: string) =>
    router.push({ pathname: '/lesson/[id]', params: { id: lessonId } });

  return (
    <>
      <SectionHeader title={t('nextLesson')} />
      <LessonCard
        lesson={next}
        currentUserId={currentUserId}
        onPress={() => open(next.id)}
        onJoin={() => onJoin(next)}
        joining={joiningId === next.id}
      />
      {later.length > 0 ? (
        <>
          <SectionHeader title={t('later')} count={later.length} />
          {later.map((lesson) => (
            <LessonCard
              key={lesson.id}
              lesson={lesson}
              currentUserId={currentUserId}
              compact
              onPress={() => open(lesson.id)}
            />
          ))}
        </>
      ) : null}
    </>
  );
}
