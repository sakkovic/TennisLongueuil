import Ionicons from '@expo/vector-icons/Ionicons';
import type { ComponentProps } from 'react';
import { StyleSheet, View } from 'react-native';

import { colors, levelColors, radius, spacing } from '@/constants/theme';
import { useT } from '@/i18n';
import { getAccountState, type AccountState, type Member } from '@/types/models';

import { AppText } from './AppText';

export type BadgeTone =
  'success' | 'warning' | 'danger' | 'info' | 'neutral' | 'accent' | 'primary';

const tones: Record<BadgeTone, { background: string; text: string }> = {
  success: { background: colors.successSoft, text: colors.success },
  warning: { background: colors.warningSoft, text: colors.warning },
  danger: { background: colors.dangerSoft, text: colors.danger },
  info: { background: colors.infoSoft, text: colors.info },
  neutral: { background: colors.surfaceMuted, text: colors.textMuted },
  accent: { background: colors.lime, text: colors.onLime },
  primary: { background: colors.primary, text: colors.onPrimary },
};

interface StatusBadgeProps {
  label: string;
  tone?: BadgeTone;
  icon?: ComponentProps<typeof Ionicons>['name'];
}

export function StatusBadge({ label, tone = 'neutral', icon }: StatusBadgeProps) {
  const palette = tones[tone];
  return (
    <View style={[styles.badge, { backgroundColor: palette.background }]}>
      {icon ? <Ionicons name={icon} size={13} color={palette.text} /> : null}
      <AppText variant="overline" style={[styles.text, { color: palette.text }]}>
        {label}
      </AppText>
    </View>
  );
}

const accountStateTone: Record<AccountState, Pick<StatusBadgeProps, 'tone' | 'icon'>> = {
  pending: { tone: 'warning', icon: 'hourglass-outline' },
  active: { tone: 'success' },
  deactivated: { tone: 'danger' },
};

/** Waiting for approval, usable, or deactivated by the coach. */
export function AccountStateBadge({ member }: { member: Pick<Member, 'active' | 'approved_at'> }) {
  const t = useT();
  const state = getAccountState(member);
  const labels: Record<AccountState, string> = {
    pending: t('pending'),
    active: t('active'),
    deactivated: t('inactive'),
  };
  return <StatusBadge label={labels[state]} {...accountStateTone[state]} />;
}

interface LevelBadgeProps {
  name: string | null | undefined;
  rank?: number | null;
  size?: 'sm' | 'lg';
}

/** Player level, coloured by rank. Players can see it; only admins can change it. */
export function LevelBadge({ name, rank, size = 'sm' }: LevelBadgeProps) {
  const t = useT();
  const palette = levelColors(name ? rank : null);
  const large = size === 'lg';
  return (
    <View
      style={[styles.badge, large && styles.large, { backgroundColor: palette.background }]}
      accessibilityLabel={name ? t('levelLabel', { name }) : t('levelUnassigned')}
    >
      <Ionicons name="tennisball" size={large ? 15 : 12} color={palette.text} />
      <AppText
        variant="overline"
        style={[styles.text, large && styles.largeText, { color: palette.text }]}
      >
        {name ?? t('levelNotSet')}
      </AppText>
    </View>
  );
}

const styles = StyleSheet.create({
  badge: {
    flexDirection: 'row',
    alignItems: 'center',
    alignSelf: 'flex-start',
    gap: spacing.xs,
    paddingHorizontal: spacing.sm + 2,
    paddingVertical: spacing.xs,
    borderRadius: radius.pill,
  },
  text: { fontSize: 11, lineHeight: 14 },
  large: { paddingHorizontal: spacing.lg, paddingVertical: spacing.sm, alignSelf: 'center' },
  largeText: { fontSize: 14, lineHeight: 18, letterSpacing: 1.6 },
});
