import { router } from 'expo-router';
import { Alert } from 'react-native';

import { SectionHeader } from '@/components/SectionHeader';
import { ScreenContainer } from '@/components/ScreenContainer';
import { ScreenHeader } from '@/components/ScreenHeader';
import { EmptyState, ErrorState, LoadingState } from '@/components/States';
import { useCurrentMember } from '@/features/auth/AuthProvider';
import { useLessonsRealtime, useUpcomingLessons } from '@/features/lessons/hooks';
import { LessonCard } from '@/features/lessons/LessonCard';
import { useJoinLesson } from '@/features/registrations/hooks';
import { formatLongDate, getGreeting } from '@/utils/date';
import { getErrorMessage, logError } from '@/utils/errors';
import { firstName } from '@/utils/names';

export default function HomeScreen() {
  const member = useCurrentMember();
  const lessons = useUpcomingLessons();
  const join = useJoinLesson();
  useLessonsRealtime();

  const handleJoin = (lessonId: string) => {
    join.mutate(lessonId, {
      onError: (error) => {
        logError('joinLesson', error);
        Alert.alert("Couldn't join", getErrorMessage(error));
      },
    });
  };

  return (
    <ScreenContainer
      edges={['top']}
      onRefresh={() => void lessons.refetch()}
      refreshing={lessons.isRefetching}
    >
      <ScreenHeader
        overline={formatLongDate(new Date())}
        title={`${getGreeting()}, ${firstName(member.full_name)} 🎾`}
      />

      {lessons.isPending ? (
        <LoadingState label="Loading lessons…" />
      ) : lessons.isError ? (
        <ErrorState
          error={lessons.error}
          onRetry={() => void lessons.refetch()}
          retrying={lessons.isRefetching}
        />
      ) : lessons.data.length === 0 ? (
        <EmptyState
          icon="calendar-outline"
          title="No upcoming lessons yet."
          message="New lessons created by your coach will appear here."
        />
      ) : (
        <>
          <SectionHeader title="Upcoming lessons" count={lessons.data.length} />
          {lessons.data.map((lesson) => (
            <LessonCard
              key={lesson.id}
              lesson={lesson}
              currentUserId={member.id}
              onPress={() => router.push({ pathname: '/lesson/[id]', params: { id: lesson.id } })}
              onJoin={() => handleJoin(lesson.id)}
              joining={join.isPending && join.variables === lesson.id}
            />
          ))}
        </>
      )}
    </ScreenContainer>
  );
}
