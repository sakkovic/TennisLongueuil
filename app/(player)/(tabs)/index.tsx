import { router } from 'expo-router';
import { Alert } from 'react-native';

import { BrandMark } from '@/components/BrandMark';
import { SectionHeader } from '@/components/SectionHeader';
import { ScreenContainer } from '@/components/ScreenContainer';
import { EmptyState, ErrorState, LoadingState } from '@/components/States';
import { useCurrentMember } from '@/features/auth/AuthProvider';
import { ClubOffer } from '@/features/home/ClubOffer';
import { useLessonsRealtime, useUpcomingLessons } from '@/features/lessons/hooks';
import { LessonCard } from '@/features/lessons/LessonCard';
import type { Lesson } from '@/features/lessons/api';
import { useJoinLesson } from '@/features/registrations/hooks';
import { useT } from '@/i18n';
import { getGreeting } from '@/utils/date';
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

  return (
    <ScreenContainer
      edges={['top']}
      onRefresh={() => void lessons.refetch()}
      refreshing={lessons.isRefetching}
    >
      <BrandMark subtitle={`${getGreeting()}, ${firstName(member.full_name)}`} />
      <ClubOffer />

      {lessons.isPending ? (
        <LoadingState label={t('loadingLessons')} />
      ) : lessons.isError ? (
        <ErrorState
          error={lessons.error}
          onRetry={() => void lessons.refetch()}
          retrying={lessons.isRefetching}
        />
      ) : lessons.data.length === 0 ? (
        <EmptyState
          icon="calendar-outline"
          title={t('noUpcomingTitle')}
          message={t('noUpcomingPlayer')}
        />
      ) : (
        <UpcomingLessons
          lessons={lessons.data}
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
