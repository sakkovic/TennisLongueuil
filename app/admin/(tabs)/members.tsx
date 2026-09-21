import Ionicons from '@expo/vector-icons/Ionicons';
import { router } from 'expo-router';
import { useState } from 'react';
import { StyleSheet, View } from 'react-native';

import { AppText } from '@/components/AppText';
import { LevelBadge, StatusBadge } from '@/components/Badges';
import { Card } from '@/components/Card';
import { PlayerAvatar } from '@/components/PlayerAvatar';
import { ScreenContainer } from '@/components/ScreenContainer';
import { ScreenHeader } from '@/components/ScreenHeader';
import { EmptyState, ErrorState, LoadingState } from '@/components/States';
import { TextField } from '@/components/TextField';
import { colors, spacing } from '@/constants/theme';
import { findLevel, useLevels } from '@/features/levels/hooks';
import { filterMembers } from '@/features/members/api';
import { useMembers } from '@/features/members/hooks';
import type { Member } from '@/types/models';

export default function MembersScreen() {
  const members = useMembers();
  const { data: levels } = useLevels();
  const [search, setSearch] = useState('');

  const all = members.data ?? [];
  const filtered = filterMembers(all, search);
  const activeCount = all.filter((m) => m.active).length;

  return (
    <ScreenContainer
      edges={['top']}
      onRefresh={() => void members.refetch()}
      refreshing={members.isRefetching}
    >
      <ScreenHeader
        title="Members"
        subtitle={members.data ? `${activeCount} active · ${all.length} total` : undefined}
      />
      <TextField
        label="Search"
        value={search}
        onChangeText={setSearch}
        placeholder="Search players…"
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
      ) : filtered.length === 0 ? (
        <EmptyState icon="people-outline" title="No players found." />
      ) : (
        filtered.map((member) => (
          <MemberRow
            key={member.id}
            member={member}
            levelRank={findLevel(levels, member.player_level_id)?.rank}
          />
        ))
      )}

      <AppText variant="caption" tone="subtle" style={styles.note}>
        To add a player, create their account in the Supabase dashboard (Authentication → Add user).
        They appear here automatically.
      </AppText>
    </ScreenContainer>
  );
}

function MemberRow({ member, levelRank }: { member: Member; levelRank?: number }) {
  return (
    <Card
      onPress={() => router.push({ pathname: '/admin/member/[id]', params: { id: member.id } })}
      accessibilityLabel={`${member.full_name}, ${member.player_level_name ?? 'no level'}, ${
        member.active ? 'active' : 'inactive'
      }`}
      style={!member.active ? styles.inactive : undefined}
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
              <StatusBadge label="Coach" tone="primary" />
            ) : (
              <LevelBadge name={member.player_level_name} rank={levelRank} />
            )}
            <StatusBadge
              label={member.active ? 'Active' : 'Inactive'}
              tone={member.active ? 'success' : 'danger'}
            />
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
