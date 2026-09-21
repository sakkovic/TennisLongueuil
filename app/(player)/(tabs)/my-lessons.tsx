import { router } from 'expo-router';
import { useState } from 'react';

import { Button } from '@/components/Button';
import { ScreenContainer } from '@/components/ScreenContainer';
import { ScreenHeader } from '@/components/ScreenHeader';
import { SegmentedControl } from '@/components/SegmentedControl';
import { EmptyState, ErrorState, LoadingState } from '@/components/States';
import { useCurrentMember } from '@/features/auth/AuthProvider';
import { useLessonsRealtime } from '@/features/lessons/hooks';
import { splitRegistrations } from '@/features/registrations/api';
import { useMyRegistrations } from '@/features/registrations/hooks';
import { RegistrationRow } from '@/features/registrations/RegistrationRow';
import { useT } from '@/i18n';

type Tab = 'upcoming' | 'history';

export default function MyLessonsScreen() {
  const t = useT();
  const member = useCurrentMember();
  const registrations = useMyRegistrations(member.id);
  const [tab, setTab] = useState<Tab>('upcoming');
  useLessonsRealtime();

  const { upcoming, history } = splitRegistrations(registrations.data ?? []);
  const items = tab === 'upcoming' ? upcoming : history;

  return (
    <ScreenContainer
      edges={['top']}
      onRefresh={() => void registrations.refetch()}
      refreshing={registrations.isRefetching}
    >
      <ScreenHeader title={t('tabMyLessons')} />
      <SegmentedControl
        options={[
          { value: 'upcoming', label: t('upcoming') },
          { value: 'history', label: t('history') },
        ]}
        value={tab}
        onChange={setTab}
      />

      {registrations.isPending ? (
        <LoadingState />
      ) : registrations.isError ? (
        <ErrorState
          error={registrations.error}
          onRetry={() => void registrations.refetch()}
          retrying={registrations.isRefetching}
        />
      ) : items.length === 0 ? (
        tab === 'upcoming' ? (
          <EmptyState
            icon="calendar-clear-outline"
            title={t('noJoinedUpcoming')}
            message={t('browseLessons')}
            action={
              <Button
                label={t('seeLessons')}
                onPress={() => router.navigate('/')}
                fullWidth={false}
              />
            }
          />
        ) : (
          <EmptyState icon="time-outline" title={t('noHistory')} message={t('pastCancelled')} />
        )
      ) : (
        items.map((registration) => (
          <RegistrationRow
            key={registration.id}
            registration={registration}
            variant={tab}
            showReason
            onPress={() =>
              router.push({ pathname: '/lesson/[id]', params: { id: registration.lesson.id } })
            }
          />
        ))
      )}
    </ScreenContainer>
  );
}
