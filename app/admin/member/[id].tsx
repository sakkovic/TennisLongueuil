import { router, useLocalSearchParams } from 'expo-router';
import { useState } from 'react';
import { Linking, StyleSheet, View } from 'react-native';

import { AppText } from '@/components/AppText';
import { Banner } from '@/components/Banner';
import { Button } from '@/components/Button';
import { Card } from '@/components/Card';
import { ConfirmationModal } from '@/components/ConfirmationModal';
import { ChipGroup } from '@/components/FormControls';
import { ScreenContainer } from '@/components/ScreenContainer';
import { SectionHeader } from '@/components/SectionHeader';
import { EmptyState, ErrorState, LoadingState } from '@/components/States';
import { spacing } from '@/constants/theme';
import { useCurrentMember } from '@/features/auth/AuthProvider';
import { findLevel, useLevels } from '@/features/levels/hooks';
import { useMember, useSetMemberActive, useSetMemberLevel } from '@/features/members/hooks';
import { PlayerProfileCard } from '@/features/profile/PlayerProfileCard';
import { attendanceSummary, splitRegistrations } from '@/features/registrations/api';
import { useMemberRegistrations } from '@/features/registrations/hooks';
import { RegistrationRow } from '@/features/registrations/RegistrationRow';
import { useT } from '@/i18n';
import { getAccountState, type AccountState, type PlayerLevel } from '@/types/models';
import { getErrorMessage, logError } from '@/utils/errors';

export default function MemberDetailScreen() {
  const t = useT();
  const { id } = useLocalSearchParams<{ id: string }>();
  const me = useCurrentMember();
  const memberQuery = useMember(id);
  const { data: levels } = useLevels();
  const registrations = useMemberRegistrations(id);
  const setLevel = useSetMemberLevel();
  const setActive = useSetMemberActive();
  // Choices are kept while their sheet animates closed, so the text never flips.
  const [levelChoice, setLevelChoice] = useState<PlayerLevel | null>(null);
  const [levelSheetOpen, setLevelSheetOpen] = useState(false);
  const [sheetState, setSheetState] = useState<AccountState>('active');
  const [activeSheetOpen, setActiveSheetOpen] = useState(false);
  const [feedback, setFeedback] = useState<string | null>(null);

  if (memberQuery.isPending) return <LoadingState />;
  if (memberQuery.isError) {
    return (
      <ErrorState
        error={memberQuery.error}
        onRetry={() => void memberQuery.refetch()}
        retrying={memberQuery.isRefetching}
      />
    );
  }
  const member = memberQuery.data;
  if (!member) return <EmptyState icon="person-outline" title={t('memberNotFound')} />;

  const isSelf = member.id === me.id;
  const state = getAccountState(member);
  const { upcoming, history } = splitRegistrations(registrations.data ?? []);
  const attended = attendanceSummary(history);
  const levelOptions = (levels ?? [])
    .filter((level) => level.active)
    .map((level) => ({ value: level.id as number | null, label: level.name }));

  const chooseLevel = (levelId: number | null) => {
    const level = findLevel(levels, levelId);
    if (!level || level.id === member.player_level_id) return;
    setFeedback(null);
    setLevel.reset();
    setLevelChoice(level);
    setLevelSheetOpen(true);
  };

  const confirmLevel = () => {
    if (!levelChoice) return;
    setLevel.mutate(
      { memberId: member.id, levelId: levelChoice.id },
      {
        onSuccess: () => {
          setFeedback(t('levelUpdated', { name: levelChoice.name }));
          setLevelSheetOpen(false);
        },
        onError: (error) => logError('setMemberLevel', error),
      },
    );
  };

  const openActiveSheet = () => {
    setFeedback(null);
    setActive.reset();
    setSheetState(state);
    setActiveSheetOpen(true);
  };

  const confirmCopy: Record<
    AccountState,
    { title: string; message: string; confirmLabel: string }
  > = {
    pending: {
      title: t('approveTitle'),
      message: t('approveMessage', { name: member.full_name }),
      confirmLabel: t('approve'),
    },
    active: {
      title: t('deactivateTitle'),
      message: t('deactivateMessage', { name: member.full_name }),
      confirmLabel: t('deactivate'),
    },
    deactivated: {
      title: t('reactivateTitle'),
      message: t('reactivateMessage', { name: member.full_name }),
      confirmLabel: t('reactivate'),
    },
  };
  const accountSummary: Record<AccountState, string> = {
    pending: t('accountPendingHint'),
    active: t('accountActiveHint'),
    deactivated: t('accountDeactivatedHint'),
  };
  const accountAction: Record<AccountState, string> = {
    pending: t('approveMember'),
    active: t('deactivateAccount'),
    deactivated: t('reactivateAccount'),
  };
  const sheet = confirmCopy[sheetState];
  const activeTarget = sheetState !== 'active';

  const confirmActiveChange = () => {
    setActive.mutate(
      { memberId: member.id, active: activeTarget },
      {
        onSuccess: (result) => {
          setActiveSheetOpen(false);
          if (result.active) {
            setFeedback(
              result.approved
                ? t('memberApproved', { name: member.full_name })
                : t('accountReactivated'),
            );
            return;
          }
          const n = result.cancelled_registrations;
          setFeedback(
            n > 0
              ? t('accountDeactivatedWithCancels', {
                  count: n,
                  kind: n === 1 ? t('registrationWas') : t('registrationsWere'),
                })
              : t('accountDeactivated'),
          );
        },
        onError: (error) => logError('setMemberActive', error),
      },
    );
  };

  return (
    <ScreenContainer
      onRefresh={() => void memberQuery.refetch()}
      refreshing={memberQuery.isRefetching}
    >
      <PlayerProfileCard
        member={member}
        levelRank={findLevel(levels, member.player_level_id)?.rank}
        showStatus
      />
      {feedback ? <Banner tone="success" message={feedback} /> : null}

      <View style={styles.contact}>
        <Button
          label={t('email')}
          icon="mail-outline"
          variant="secondary"
          size="md"
          style={styles.flex}
          onPress={() => void Linking.openURL(`mailto:${member.email}`)}
        />
        {member.phone ? (
          <Button
            label={t('call')}
            icon="call-outline"
            variant="secondary"
            size="md"
            style={styles.flex}
            onPress={() => void Linking.openURL(`tel:${member.phone?.replace(/[^0-9+]/g, '')}`)}
          />
        ) : null}
      </View>

      {member.role === 'player' ? (
        <Card>
          <SectionHeader title={t('playerLevel')} />
          <ChipGroup
            options={levelOptions}
            value={member.player_level_id}
            disabled={setLevel.isPending}
            onChange={chooseLevel}
          />
          <AppText variant="caption" tone="muted">
            {t('levelAssignHint')}
          </AppText>
        </Card>
      ) : null}

      <Card>
        <SectionHeader title={t('account')} />
        <AppText tone="muted">{accountSummary[state]}</AppText>
        {isSelf ? (
          <AppText variant="caption" tone="subtle">
            {t('cantDeactivateSelf')}
          </AppText>
        ) : (
          <Button
            label={accountAction[state]}
            icon={member.active ? 'lock-closed-outline' : 'checkmark-circle-outline'}
            variant={member.active ? 'danger' : 'primary'}
            onPress={openActiveSheet}
          />
        )}
      </Card>

      {attended.marked > 0 ? (
        <Card>
          <SectionHeader title={t('attendance')} />
          <AppText>{t('attendedSummary', attended)}</AppText>
        </Card>
      ) : null}

      <SectionHeader title={t('upcomingLessons')} count={upcoming.length} />
      {registrations.isPending ? (
        <LoadingState />
      ) : upcoming.length === 0 ? (
        <AppText tone="muted">{t('noUpcomingLessons')}</AppText>
      ) : (
        upcoming.map((registration) => (
          <RegistrationRow
            key={registration.id}
            registration={registration}
            variant="upcoming"
            onPress={() =>
              router.push({
                pathname: '/admin/lesson/[id]',
                params: { id: registration.lesson.id },
              })
            }
          />
        ))
      )}

      <ConfirmationModal
        visible={levelSheetOpen}
        title={t('changeLevelTitle')}
        message={t('changeLevelMessage', {
          name: member.full_name,
          level: levelChoice?.name ?? t('selectedLevel'),
        })}
        confirmLabel={t('changeLevel')}
        loading={setLevel.isPending}
        error={setLevel.isError ? getErrorMessage(setLevel.error) : null}
        onConfirm={confirmLevel}
        onCancel={() => setLevelSheetOpen(false)}
      />

      <ConfirmationModal
        visible={activeSheetOpen}
        title={sheet.title}
        message={sheet.message}
        confirmLabel={sheet.confirmLabel}
        destructive={!activeTarget}
        loading={setActive.isPending}
        error={setActive.isError ? getErrorMessage(setActive.error) : null}
        onConfirm={confirmActiveChange}
        onCancel={() => setActiveSheetOpen(false)}
      />
    </ScreenContainer>
  );
}

const styles = StyleSheet.create({
  contact: { flexDirection: 'row', gap: spacing.md },
  flex: { flex: 1 },
});
