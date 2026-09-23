import Ionicons from '@expo/vector-icons/Ionicons';
import { Pressable, StyleSheet, View } from 'react-native';

import { AppText } from '@/components/AppText';
import { PlayerAvatar } from '@/components/PlayerAvatar';
import { LoadingState } from '@/components/States';
import { colors, radius, spacing, stroke } from '@/constants/theme';
import { useT } from '@/i18n';
import { getAccountState, type Member } from '@/types/models';

import { useMembers } from './hooks';

interface PlayerPickerProps {
  /** Ids of the chosen players. */
  value: string[];
  onChange: (playerIds: string[]) => void;
  /** How many players fit (court_count × 4). */
  max: number;
  error?: string;
}

/**
 * Picks the players of a private lesson. Only active players are listed:
 * pending and deactivated accounts cannot hold a spot anyway.
 */
export function PlayerPicker({ value, onChange, max, error }: PlayerPickerProps) {
  const t = useT();
  const members = useMembers();
  const players = (members.data ?? []).filter(
    (member: Member) => member.role === 'player' && getAccountState(member) === 'active',
  );

  const toggle = (id: string) => {
    if (value.includes(id)) onChange(value.filter((playerId) => playerId !== id));
    else if (value.length < max) onChange([...value, id]);
  };

  if (members.isPending) return <LoadingState />;

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <AppText variant="label">{t('invitedPlayers')}</AppText>
        <AppText variant="caption" tone={value.length > max ? 'danger' : 'muted'}>
          {t('playersChosen', { count: value.length, max })}
        </AppText>
      </View>

      {players.length === 0 ? (
        <AppText tone="muted">{t('noPlayersToInvite')}</AppText>
      ) : (
        <View style={styles.list}>
          {players.map((player: Member) => {
            const selected = value.includes(player.id);
            const disabled = !selected && value.length >= max;
            return (
              <Pressable
                key={player.id}
                onPress={() => toggle(player.id)}
                disabled={disabled}
                accessibilityRole="checkbox"
                accessibilityState={{ checked: selected, disabled }}
                accessibilityLabel={player.full_name}
                style={({ pressed }) => [
                  styles.row,
                  selected && styles.rowSelected,
                  disabled && styles.rowDisabled,
                  pressed && styles.rowPressed,
                ]}
              >
                <PlayerAvatar
                  name={player.full_name}
                  avatarPath={player.avatar_path}
                  version={player.updated_at}
                  size={32}
                />
                <View style={styles.name}>
                  <AppText variant="bodyStrong" numberOfLines={1}>
                    {player.full_name}
                  </AppText>
                  {player.player_level_name ? (
                    <AppText variant="caption" tone="muted">
                      {player.player_level_name}
                    </AppText>
                  ) : null}
                </View>
                <Ionicons
                  name={selected ? 'checkmark-circle' : 'ellipse-outline'}
                  size={22}
                  color={selected ? colors.primary : colors.border}
                />
              </Pressable>
            );
          })}
        </View>
      )}

      {error ? (
        <AppText variant="caption" tone="danger">
          {error}
        </AppText>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  container: { gap: spacing.sm },
  header: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  list: { gap: spacing.xs },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
    minHeight: 52,
    paddingHorizontal: spacing.md,
    borderRadius: radius.md,
    borderWidth: stroke,
    borderColor: colors.border,
    backgroundColor: colors.surface,
  },
  rowSelected: { borderColor: colors.primary, backgroundColor: colors.primarySoft },
  rowDisabled: { opacity: 0.45 },
  rowPressed: { opacity: 0.7 },
  name: { flex: 1, gap: spacing.xxs },
});
