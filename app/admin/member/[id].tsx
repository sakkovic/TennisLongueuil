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
import type { PlayerLevel } from '@/types/models';
import { getErrorMessage, logError } from '@/utils/errors';

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
  const [activeTarget, setActiveTarget] = useState(false);
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
    setActiveTarget(!member.active);
    setActiveSheetOpen(true);
  };

  const confirmActiveChange = () => {
    setActive.mutate(
      { memberId: member.id, active: activeTarget },
      {
        onSuccess: (result) => {
          setActiveSheetOpen(false);
          if (result.active) {
            setFeedback('Account reactivated.');
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
        <AppText tone="muted">
          {member.active
            ? 'This account is active and can sign in.'
            : 'This account is inactive and cannot use the app.'}
        </AppText>
        {isSelf ? (
          <AppText variant="caption" tone="subtle">
            You can&apos;t deactivate your own account.
          </AppText>
        ) : (
          <Button
            label={member.active ? 'Deactivate account' : 'Reactivate account'}
            icon={member.active ? 'lock-closed-outline' : 'lock-open-outline'}
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
        title={activeTarget ? 'Reactivate this account?' : 'Deactivate this account?'}
        message={
          activeTarget
            ? `${member.full_name} will be able to sign in and join lessons again.`
            : `${member.full_name} will no longer be able to use the app, and their registrations for lessons that have not started will be cancelled to free the spots.`
        }
        confirmLabel={activeTarget ? 'Reactivate' : 'Deactivate'}
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
