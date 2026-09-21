import Ionicons from '@expo/vector-icons/Ionicons';
import { router } from 'expo-router';
import { useState } from 'react';
import { StyleSheet, View } from 'react-native';

import { AppText } from '@/components/AppText';
import { AccountStateBadge, LevelBadge, StatusBadge } from '@/components/Badges';
import { Banner } from '@/components/Banner';
import { Card } from '@/components/Card';
import { PlayerAvatar } from '@/components/PlayerAvatar';
import { ScreenContainer } from '@/components/ScreenContainer';
import { ScreenHeader } from '@/components/ScreenHeader';
import { SectionHeader } from '@/components/SectionHeader';
import { EmptyState, ErrorState, LoadingState } from '@/components/States';
import { TextField } from '@/components/TextField';
import { colors, spacing } from '@/constants/theme';
import { findLevel, useLevels } from '@/features/levels/hooks';
import { filterMembers, groupMembers } from '@/features/members/api';
import { useMembers } from '@/features/members/hooks';
import { useT } from '@/i18n';
import { getAccountState, type AccountState, type Member } from '@/types/models';

export default function MembersScreen() {
  const t = useT();
  const members = useMembers();
  const { data: levels } = useLevels();
  const [search, setSearch] = useState('');

  const all = members.data ?? [];
  const { pending, approved } = groupMembers(filterMembers(all, search));
  const activeCount = all.filter((m) => m.active).length;
  const pendingCount = groupMembers(all).pending.length;

  const renderRow = (member: Member) => (
    <MemberRow
      key={member.id}
      member={member}
      levelRank={findLevel(levels, member.player_level_id)?.rank}
    />
  );

  return (
    <ScreenContainer
      edges={['top']}
      onRefresh={() => void members.refetch()}
      refreshing={members.isRefetching}
    >
      <ScreenHeader
        title={t('members')}
        subtitle={
          members.data
            ? t('membersActiveTotal', { active: activeCount, total: all.length })
            : undefined
        }
      />
      {pendingCount > 0 ? (
        <Banner
          tone="warning"
          message={
            pendingCount === 1 ? t('pendingOne') : t('pendingOther', { count: pendingCount })
          }
        />
      ) : null}
      <TextField
        label={t('search')}
        value={search}
        onChangeText={setSearch}
        placeholder={t('searchPlayers')}
        autoCapitalize="none"
        autoCorrect={false}
        clearButtonMode="while-editing"
        returnKeyType="search"
      />

      {members.isPending ? (
        <LoadingState />
      ) : members.isError ? (
        <ErrorState
          error={members.error}
          onRetry={() => void members.refetch()}
          retrying={members.isRefetching}
        />
      ) : pending.length + approved.length === 0 ? (
        <EmptyState icon="people-outline" title={t('noPlayersFound')} />
      ) : (
        <>
          {pending.length > 0 ? (
            <>
              <SectionHeader title={t('waitingApproval')} count={pending.length} />
              {pending.map(renderRow)}
            </>
          ) : null}
          {approved.length > 0 ? (
            <>
              {pending.length > 0 ? (
                <SectionHeader title={t('members')} count={approved.length} />
              ) : null}
              {approved.map(renderRow)}
            </>
          ) : null}
        </>
      )}

      <AppText variant="caption" tone="subtle" style={styles.note}>
        {t('membersNote')}
      </AppText>
    </ScreenContainer>
  );
}

function MemberRow({ member, levelRank }: { member: Member; levelRank?: number }) {
  const t = useT();
  const state = getAccountState(member);
  const stateLabels: Record<AccountState, string> = {
    pending: t('waitingForApprovalShort'),
    active: t('activeShort'),
    deactivated: t('inactiveShort'),
  };
  return (
    <Card
      onPress={() => router.push({ pathname: '/admin/member/[id]', params: { id: member.id } })}
      accessibilityLabel={`${member.full_name}, ${member.player_level_name ?? t('noLevel')}, ${stateLabels[state]}`}
      // Pending sign-ups stay at full contrast: they need the coach's attention.
      style={state === 'deactivated' ? styles.inactive : undefined}
    >
      <View style={styles.row}>
        <PlayerAvatar
          name={member.full_name}
          avatarPath={member.avatar_path}
          version={member.updated_at}
          size={44}
        />
        <View style={styles.text}>
          <AppText variant="bodyStrong" numberOfLines={1}>
            {member.full_name}
          </AppText>
          <View style={styles.badges}>
            {member.role === 'admin' ? (
              <StatusBadge label={t('coach')} tone="primary" />
            ) : (
              <LevelBadge name={member.player_level_name} rank={levelRank} />
            )}
            <AccountStateBadge member={member} />
          </View>
        </View>
        <Ionicons name="chevron-forward" size={18} color={colors.textSubtle} />
      </View>
    </Card>
  );
}

const styles = StyleSheet.create({
  row: { flexDirection: 'row', alignItems: 'center', gap: spacing.md },
  text: { flex: 1, gap: spacing.xs },
  badges: { flexDirection: 'row', flexWrap: 'wrap', gap: spacing.xs },
  inactive: { opacity: 0.7 },
  note: { textAlign: 'center', marginTop: spacing.sm },
});
