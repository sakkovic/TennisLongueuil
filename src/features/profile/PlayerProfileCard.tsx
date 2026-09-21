import Ionicons from '@expo/vector-icons/Ionicons';
import { ActivityIndicator, Pressable, StyleSheet, View } from 'react-native';

import { AppText } from '@/components/AppText';
import { AccountStateBadge, LevelBadge, StatusBadge } from '@/components/Badges';
import { PlayerAvatar } from '@/components/PlayerAvatar';
import { colors, radius, shadow, spacing } from '@/constants/theme';
import { useT } from '@/i18n';
import type { Member } from '@/types/models';

interface PlayerProfileCardProps {
  member: Member;
  levelRank?: number | null;
  /** When provided, shows a camera button on the photo. */
  onChangePhoto?: () => void;
  uploadingPhoto?: boolean;
  /** Show account status (admins viewing a member, or inactive accounts). */
  showStatus?: boolean;
}

/** The member card: photo, name, level badge, contact details and upcoming lessons. */
export function PlayerProfileCard({
  member,
  levelRank,
  onChangePhoto,
  uploadingPhoto = false,
  showStatus = false,
}: PlayerProfileCardProps) {
  const t = useT();
  const isCoach = member.role === 'admin';

  return (
    <View style={styles.card}>
      <View style={styles.hero}>
        <View style={styles.courtLine} />
      </View>
      {/* In normal flow (negative margin) so the camera button stays on top and touchable. */}
      <View style={styles.photoWrapper}>
        <View style={styles.photoRing}>
          <PlayerAvatar
            name={member.full_name}
            avatarPath={member.avatar_path}
            version={member.updated_at}
            size={104}
          />
        </View>
        {onChangePhoto ? (
          <Pressable
            onPress={onChangePhoto}
            disabled={uploadingPhoto}
            accessibilityRole="button"
            accessibilityLabel={t('changePhoto')}
            hitSlop={6}
            style={styles.cameraButton}
          >
            {uploadingPhoto ? (
              <ActivityIndicator size="small" color={colors.onPrimary} />
            ) : (
              <Ionicons name="camera" size={18} color={colors.onPrimary} />
            )}
          </Pressable>
        ) : null}
      </View>

      <View style={styles.identity}>
        <AppText variant="title" style={styles.center} accessibilityRole="header">
          {member.full_name}
        </AppText>
        {isCoach ? (
          <StatusBadge label={t('coach')} tone="primary" icon="ribbon-outline" />
        ) : (
          <LevelBadge name={member.player_level_name} rank={levelRank} size="lg" />
        )}
        <AppText tone="muted" style={styles.center}>
          {isCoach ? t('coachAdmin') : t('tennisMember')}
        </AppText>
        {showStatus || !member.active ? <AccountStateBadge member={member} /> : null}
      </View>

      <View style={styles.details}>
        <Detail label={t('email')} value={member.email} />
        <Detail label={t('phone')} value={member.phone ?? t('notProvided')} muted={!member.phone} />
        <View style={styles.statRow}>
          <AppText variant="label" tone="muted">
            {t('upcomingLessons')}
          </AppText>
          <View style={styles.statBubble}>
            <AppText variant="heading" tone="primary">
              {member.upcoming_lessons_count}
            </AppText>
          </View>
        </View>
      </View>
    </View>
  );
}

function Detail({
  label,
  value,
  muted = false,
}: {
  label: string;
  value: string;
  muted?: boolean;
}) {
  return (
    <View style={styles.detail}>
      <AppText variant="caption" tone="muted">
        {label}
      </AppText>
      <AppText variant="bodyStrong" tone={muted ? 'subtle' : 'default'} selectable>
        {value}
      </AppText>
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    backgroundColor: colors.surface,
    borderRadius: radius.xl,
    overflow: 'hidden',
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: colors.border,
    ...shadow.card,
  },
  hero: {
    height: 96,
    backgroundColor: colors.primary,
  },
  // A subtle court service line across the header.
  courtLine: {
    position: 'absolute',
    top: 48,
    left: 0,
    right: 0,
    height: 2,
    backgroundColor: 'rgba(255, 255, 255, 0.18)',
  },
  photoWrapper: { alignSelf: 'center', marginTop: -56 },
  photoRing: {
    borderRadius: 60,
    borderWidth: 4,
    borderColor: colors.surface,
    backgroundColor: colors.surface,
  },
  cameraButton: {
    position: 'absolute',
    right: 0,
    bottom: 4,
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: colors.primary,
    borderWidth: 2,
    borderColor: colors.surface,
    alignItems: 'center',
    justifyContent: 'center',
  },
  identity: {
    alignItems: 'center',
    gap: spacing.sm,
    paddingTop: spacing.md,
    paddingHorizontal: spacing.xl,
    paddingBottom: spacing.lg,
  },
  center: { textAlign: 'center' },
  details: {
    borderTopWidth: StyleSheet.hairlineWidth,
    borderTopColor: colors.border,
    padding: spacing.xl,
    gap: spacing.lg,
  },
  detail: { gap: spacing.xxs },
  statRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: colors.primarySoft,
    borderRadius: radius.md,
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.sm,
  },
  statBubble: { minWidth: 32, alignItems: 'flex-end' },
});
