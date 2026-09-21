import Ionicons from '@expo/vector-icons/Ionicons';
import type { ComponentProps } from 'react';
import { router } from 'expo-router';
import { Pressable, StyleSheet, View } from 'react-native';

import { AppText } from '@/components/AppText';
import { Button } from '@/components/Button';
import { ScreenContainer } from '@/components/ScreenContainer';
import { ScreenHeader } from '@/components/ScreenHeader';
import { SectionHeader } from '@/components/SectionHeader';
import { EmptyState, ErrorState, LoadingState } from '@/components/States';
import { colors, radius, shadow, spacing } from '@/constants/theme';
import { useCurrentMember } from '@/features/auth/AuthProvider';
import { useLessonsRealtime, useUpcomingLessons } from '@/features/lessons/hooks';
import { LessonCard } from '@/features/lessons/LessonCard';
import { useMembers } from '@/features/members/hooks';
import { formatLongDate, getGreeting } from '@/utils/date';
import { firstName } from '@/utils/names';

export default function AdminHomeScreen() {
  const member = useCurrentMember();
  const lessons = useUpcomingLessons();
  const members = useMembers();
  useLessonsRealtime();

  const scheduled = (lessons.data ?? []).filter((lesson) => lesson.status === 'scheduled');
  const nextLesson = scheduled[0];
  const activeMembers = (members.data ?? []).filter((m) => m.active && m.role === 'player').length;

  const refresh = () => {
    void lessons.refetch();
    void members.refetch();
  };

  return (
    <ScreenContainer edges={['top']} onRefresh={refresh} refreshing={lessons.isRefetching}>
      <ScreenHeader
        overline={formatLongDate(new Date())}
        title={`${getGreeting()}, ${firstName(member.full_name)}`}
        subtitle="Here's what's coming up at the club."
      />

      <Button
        label="Create lesson"
        icon="add-circle-outline"
        onPress={() => router.push('/admin/lesson/new')}
      />

      <View style={styles.stats}>
        <StatTile
          icon="calendar-outline"
          label="Upcoming lessons"
          value={lessons.data ? String(scheduled.length) : '–'}
          onPress={() => router.navigate('/admin/lessons')}
        />
        <StatTile
          icon="people-outline"
          label="Active players"
          value={members.data ? String(activeMembers) : '–'}
          onPress={() => router.navigate('/admin/members')}
        />
      </View>

      <SectionHeader title="Next lesson" />
      {lessons.isPending ? (
        <LoadingState />
      ) : lessons.isError ? (
        <ErrorState error={lessons.error} onRetry={refresh} />
      ) : nextLesson ? (
        <LessonCard
          lesson={nextLesson}
          onPress={() =>
            router.push({ pathname: '/admin/lesson/[id]', params: { id: nextLesson.id } })
          }
        />
      ) : (
        <EmptyState
          icon="calendar-outline"
          title="No upcoming lessons"
          message="Create a lesson and your players will see it right away."
        />
      )}
    </ScreenContainer>
  );
}

interface StatTileProps {
  icon: ComponentProps<typeof Ionicons>['name'];
  label: string;
  value: string;
  onPress: () => void;
}

function StatTile({ icon, label, value, onPress }: StatTileProps) {
  return (
    <Pressable
      onPress={onPress}
      accessibilityRole="button"
      accessibilityLabel={`${label}: ${value}`}
      style={({ pressed }) => [styles.tile, pressed && styles.tilePressed]}
    >
      <Ionicons name={icon} size={20} color={colors.primary} />
      <AppText variant="display">{value}</AppText>
      <AppText variant="caption" tone="muted">
        {label}
      </AppText>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  stats: { flexDirection: 'row', gap: spacing.md },
  tile: {
    flex: 1,
    backgroundColor: colors.surface,
    borderRadius: radius.lg,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: colors.border,
    padding: spacing.lg,
    gap: spacing.xs,
    ...shadow.card,
  },
  tilePressed: { backgroundColor: colors.surfaceMuted },
});
