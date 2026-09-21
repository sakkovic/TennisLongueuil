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
import { splitRegistrations } from '@/features/registrations/api';
import { useMemberRegistrations } from '@/features/registrations/hooks';
import { RegistrationRow } from '@/features/registrations/RegistrationRow';
import { getAccountState, type AccountState, type PlayerLevel } from '@/types/models';
import { getErrorMessage, logError } from '@/utils/errors';

const accountSummary: Record<AccountState, string> = {
  pending:
    'This player signed up and is waiting for your approval. Until you approve them they cannot see lessons or join.',
  active: 'This account is active and can sign in.',
  deactivated: 'This account is inactive and cannot use the app.',
};

const accountAction: Record<AccountState, string> = {
  pending: 'Approve member',
  active: 'Deactivate account',
  deactivated: 'Reactivate account',
};

interface ConfirmCopy {
  title: string;
  message: (name: string) => string;
  confirmLabel: string;
}

const confirmCopy: Record<AccountState, ConfirmCopy> = {
  pending: {
    title: 'Approve this member?',
    message: (name) => `${name} will be able to sign in, see lessons and join them.`,
    confirmLabel: 'Approve',
  },
  active: {
    title: 'Deactivate this account?',
    message: (name) =>
      `${name} will no longer be able to use the app, and their registrations for lessons that have not started will be cancelled to free the spots.`,
    confirmLabel: 'Deactivate',
  },
  deactivated: {
    title: 'Reactivate this account?',
    message: (name) => `${name} will be able to sign in and join lessons again.`,
    confirmLabel: 'Reactivate',
  },
};

export default function MemberDetailScreen() {
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
  if (!member) return <EmptyState icon="person-outline" title="Member not found" />;

  const isSelf = member.id === me.id;
  const state = getAccountState(member);
  const upcoming = splitRegistrations(registrations.data ?? []).upcoming;
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
          setFeedback(`Level updated to ${levelChoice.name}.`);
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
                ? `${member.full_name} is approved and can now join lessons.`
                : 'Account reactivated.',
            );
            return;
          }
          const n = result.cancelled_registrations;
          setFeedback(
            n > 0
              ? `Account deactivated. ${n} upcoming ${n === 1 ? 'registration was' : 'registrations were'} cancelled.`
              : 'Account deactivated.',
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
          label="Email"
          icon="mail-outline"
          variant="secondary"
          size="md"
          style={styles.flex}
          onPress={() => void Linking.openURL(`mailto:${member.email}`)}
        />
        {member.phone ? (
          <Button
            label="Call"
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
          <SectionHeader title="Player level" />
          <ChipGroup
            options={levelOptions}
            value={member.player_level_id}
            disabled={setLevel.isPending}
            onChange={chooseLevel}
          />
          <AppText variant="caption" tone="muted">
            Only you can assign levels. Players see their level but cannot change it.
          </AppText>
        </Card>
      ) : null}

      <Card>
        <SectionHeader title="Account" />
        <AppText tone="muted">{accountSummary[state]}</AppText>
        {isSelf ? (
          <AppText variant="caption" tone="subtle">
            You can&apos;t deactivate your own account.
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

      <SectionHeader title="Upcoming lessons" count={upcoming.length} />
      {registrations.isPending ? (
        <LoadingState />
      ) : upcoming.length === 0 ? (
        <AppText tone="muted">No upcoming lessons.</AppText>
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
        title="Change player level?"
        message={`${member.full_name} will be shown as ${levelChoice?.name ?? 'the selected level'}.`}
        confirmLabel="Change level"
        loading={setLevel.isPending}
        error={setLevel.isError ? getErrorMessage(setLevel.error) : null}
        onConfirm={confirmLevel}
        onCancel={() => setLevelSheetOpen(false)}
      />

      <ConfirmationModal
        visible={activeSheetOpen}
        title={sheet.title}
        message={sheet.message(member.full_name)}
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
