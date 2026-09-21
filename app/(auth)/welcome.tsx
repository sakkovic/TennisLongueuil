import { router } from 'expo-router';

import { ScreenContainer } from '@/components/ScreenContainer';
import { SessionPoster } from '@/features/home/SessionPoster';
import { slotsFromPublicSessions, usePublicSessions } from '@/features/home/posterSessions';
import { useT } from '@/i18n';

/** Landing page before sign-in: the club flyer with the next sessions and spots left. */
export default function WelcomeScreen() {
  const t = useT();
  const sessions = usePublicSessions();
  const slots = slotsFromPublicSessions(sessions.data ?? []);

  return (
    <ScreenContainer
      edges={['top', 'bottom']}
      onRefresh={() => void sessions.refetch()}
      refreshing={sessions.isRefetching}
    >
      <SessionPoster
        slots={slots}
        loading={sessions.isPending}
        onPressSlot={() => router.push('/login')}
        primaryAction={{
          label: t('signInToBook'),
          icon: 'log-in-outline',
          onPress: () => router.push('/login'),
        }}
        secondaryAction={{ label: t('createAnAccount'), onPress: () => router.push('/sign-up') }}
      />
    </ScreenContainer>
  );
}
