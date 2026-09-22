import Ionicons from '@expo/vector-icons/Ionicons';
import type { ComponentProps } from 'react';
import { router } from 'expo-router';
import { Pressable, StyleSheet, View } from 'react-native';

import { AppText } from '@/components/AppText';
import { Banner } from '@/components/Banner';
import { ScreenContainer } from '@/components/ScreenContainer';
import { ErrorState } from '@/components/States';
import { colors, radius, shadow, spacing, stroke } from '@/constants/theme';
import { useCurrentMember } from '@/features/auth/AuthProvider';
import { slotsFromLessons } from '@/features/home/posterSessions';
import { SessionPoster } from '@/features/home/SessionPoster';
import { useLessonsRealtime, useUpcomingLessons } from '@/features/lessons/hooks';
import { useMembers } from '@/features/members/hooks';
import { useT } from '@/i18n';
import { getAccountState } from '@/types/models';
import { firstName } from '@/utils/names';

export default function AdminHomeScreen() {
  const t = useT();
  const member = useCurrentMember();
  const lessons = useUpcomingLessons();
  const members = useMembers();
  useLessonsRealtime();

  const scheduled = (lessons.data ?? []).filter((lesson) => lesson.status === 'scheduled');
  const activeMembers = (members.data ?? []).filter((m) => m.active && m.role === 'player').length;
  const pendingCount = (members.data ?? []).filter((m) => getAccountState(m) === 'pending').length;

  const refresh = () => {
    void lessons.refetch();
    void members.refetch();
  };

  return (
    <ScreenContainer edges={['top']} onRefresh={refresh} refreshing={lessons.isRefetching}>
      {pendingCount > 0 ? (
        <Pressable
          onPress={() => router.navigate('/admin/members')}
          accessibilityRole="button"
          accessibilityLabel={
            pendingCount === 1 ? t('pendingOne') : t('pendingOther', { count: pendingCount })
          }
        >
          <Banner
            tone="warning"
            message={
              pendingCount === 1 ? t('pendingOne') : t('pendingOther', { count: pendingCount })
            }
          />
        </Pressable>
      ) : null}

      <SessionPoster
        playerName={firstName(member.full_name)}
        slots={slotsFromLessons(lessons.data ?? [], undefined)}
        loading={lessons.isPending}
        onPressSlot={(id) => router.push({ pathname: '/admin/lesson/[id]', params: { id } })}
        primaryAction={{
          label: t('createALesson'),
          icon: 'add-circle',
          onPress: () => router.push('/admin/lesson/new'),
        }}
      />

      {lessons.isError ? <ErrorState error={lessons.error} onRetry={refresh} /> : null}

      <View style={styles.stats}>
        <StatTile
          icon="calendar-outline"
          label={t('upcomingLessons')}
          value={lessons.data ? String(scheduled.length) : '–'}
          onPress={() => router.navigate('/admin/lessons')}
        />
        <StatTile
          icon="people-outline"
          label={t('activePlayers')}
          value={members.data ? String(activeMembers) : '–'}
          onPress={() => router.navigate('/admin/members')}
        />
      </View>
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
      <AppText variant="caption" tone="muted">
        {label}
      </AppText>
      <View style={styles.tileValue}>
        <Ionicons name={icon} size={20} color={colors.navy} />
        <AppText variant="heading">{value}</AppText>
      </View>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  stats: { flexDirection: 'row', gap: spacing.md },
  tile: {
    flex: 1,
    backgroundColor: colors.surface,
    borderRadius: radius.lg,
    borderWidth: stroke,
    borderColor: colors.border,
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.md,
    gap: spacing.sm,
    ...shadow.card,
  },
  tileValue: { flexDirection: 'row', alignItems: 'center', gap: spacing.sm },
  tilePressed: { backgroundColor: colors.surfaceMuted },
});
