import { router } from 'expo-router';
import { useMemo, useState } from 'react';

import { Button } from '@/components/Button';
import { ScreenContainer } from '@/components/ScreenContainer';
import { SegmentedControl } from '@/components/SegmentedControl';
import { EmptyState, ErrorState, LoadingState } from '@/components/States';
import { useCurrentMember } from '@/features/auth/AuthProvider';
import { useLessonsRealtime } from '@/features/lessons/hooks';
import { resolveWeekKey, weeksFromItems } from '@/features/lessons/lessonWeeks';
import { WeekSelector } from '@/features/lessons/WeekSelector';
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
  const [weekKey, setWeekKey] = useState<string | null>(null);
  useLessonsRealtime();

  const { upcoming, history } = splitRegistrations(registrations.data ?? []);
  const items = tab === 'upcoming' ? upcoming : history;
  const weeks = useMemo(
    () => weeksFromItems(items, (registration) => registration.lesson.start_time),
    [items],
  );
  const selectedWeek = resolveWeekKey(weeks, weekKey, tab === 'upcoming' ? 'soonest' : 'latest');
  const visible = weeks.find((week) => week.key === selectedWeek)?.items ?? [];

  return (
    <ScreenContainer
      onRefresh={() => void registrations.refetch()}
      refreshing={registrations.isRefetching}
    >
      <SegmentedControl
        options={[
          { value: 'upcoming', label: t('upcoming') },
          { value: 'history', label: t('history') },
        ]}
        value={tab}
        onChange={setTab}
      />
      {weeks.length > 1 && selectedWeek ? (
        <WeekSelector weeks={weeks} value={selectedWeek} onChange={setWeekKey} />
      ) : null}

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
                onPress={() => router.navigate('/lessons')}
                fullWidth={false}
              />
            }
          />
        ) : (
          <EmptyState icon="time-outline" title={t('noHistory')} message={t('pastCancelled')} />
        )
      ) : visible.length === 0 ? (
        <EmptyState icon="calendar-outline" title={t('noLessonsThisWeek')} />
      ) : (
        visible.map((registration) => (
          <RegistrationRow
            key={registration.id}
            registration={registration}
            variant={tab}
            showReason
            onPress={() =>
              router.push({ pathname: '/my-lessons/[id]', params: { id: registration.lesson.id } })
            }
          />
        ))
      )}
    </ScreenContainer>
  );
}
