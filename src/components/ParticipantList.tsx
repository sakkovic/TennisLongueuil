import Ionicons from '@expo/vector-icons/Ionicons';
import { StyleSheet, View } from 'react-native';

import { colors, spacing } from '@/constants/theme';

import { AppText } from './AppText';
import { PlayerAvatar } from './PlayerAvatar';

export interface Participant {
  id: string;
  full_name: string;
  avatar_path: string | null;
  updated_at: string;
}

interface ParticipantListProps {
  participants: Participant[];
  currentUserId?: string;
  emptyText?: string;
}

/** Players currently registered for a lesson (never cancelled ones). */
export function ParticipantList({
  participants,
  currentUserId,
  emptyText = 'No players yet. Be the first to join!',
}: ParticipantListProps) {
  if (participants.length === 0) {
    return (
      <AppText tone="muted" style={styles.empty}>
        {emptyText}
      </AppText>
    );
  }

  return (
    <View style={styles.list} accessibilityRole="list">
      {participants.map((participant) => {
        const isMe = participant.id === currentUserId;
        return (
          <View key={participant.id} style={styles.row}>
            <PlayerAvatar
              name={participant.full_name}
              avatarPath={participant.avatar_path}
              version={participant.updated_at}
              size={36}
            />
            <AppText variant="bodyStrong" style={styles.name} numberOfLines={1}>
              {participant.full_name}
              {isMe ? <AppText tone="muted"> (you)</AppText> : null}
            </AppText>
            <Ionicons name="checkmark-circle" size={20} color={colors.success} />
          </View>
        );
      })}
    </View>
  );
}

const styles = StyleSheet.create({
  list: { gap: spacing.md },
  row: { flexDirection: 'row', alignItems: 'center', gap: spacing.md },
  name: { flex: 1 },
  empty: { paddingVertical: spacing.sm },
});
