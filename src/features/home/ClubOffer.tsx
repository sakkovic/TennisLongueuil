import Ionicons from '@expo/vector-icons/Ionicons';
import type { ComponentProps } from 'react';
import { StyleSheet, View } from 'react-native';

import { AppText } from '@/components/AppText';
import { COACH_CERTIFICATION, COACH_NAME, HOURLY_RATE, SESSION_MINUTES } from '@/constants/brand';
import { DEFAULT_LESSON_LOCATION } from '@/constants/lessons';
import { colors, radius, spacing } from '@/constants/theme';
import { useT } from '@/i18n';

type IconName = ComponentProps<typeof Ionicons>['name'];

/**
 * The lesson offer at a glance: session length, price, coach and venue.
 * Kept compact so the next lessons stay visible on the first screen.
 */
export function ClubOffer() {
  const t = useT();

  return (
    <View style={styles.container}>
      <View style={styles.tiles}>
        <Tile
          icon="time-outline"
          value={t('sessionValue', { minutes: SESSION_MINUTES })}
          caption={t('sessionCaption')}
        />
        <Tile
          icon="pricetag-outline"
          value={t('priceValue', { rate: HOURLY_RATE })}
          caption={t('priceCaption')}
        />
      </View>
      <View style={styles.details}>
        <Detail
          icon="ribbon-outline"
          text={`${t('coach')} · ${COACH_NAME} · ${COACH_CERTIFICATION}`}
        />
        <View style={styles.divider} />
        <Detail icon="location-outline" text={DEFAULT_LESSON_LOCATION} />
      </View>
    </View>
  );
}

function Tile({ icon, value, caption }: { icon: IconName; value: string; caption: string }) {
  return (
    <View style={styles.tile} accessible accessibilityLabel={`${value}, ${caption}`}>
      <View style={styles.tileHeader}>
        <Ionicons name={icon} size={16} color={colors.primary} />
        <AppText variant="heading" tone="primary">
          {value}
        </AppText>
      </View>
      <AppText variant="caption" tone="muted" numberOfLines={2}>
        {caption}
      </AppText>
    </View>
  );
}

function Detail({ icon, text }: { icon: IconName; text: string }) {
  return (
    <View style={styles.detail}>
      <Ionicons name={icon} size={16} color={colors.primary} />
      <AppText variant="label" style={styles.flex} numberOfLines={1}>
        {text}
      </AppText>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { gap: spacing.sm },
  tiles: { flexDirection: 'row', gap: spacing.sm },
  tile: {
    flex: 1,
    gap: spacing.xxs,
    backgroundColor: colors.surface,
    borderRadius: radius.lg,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: colors.border,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm + 2,
  },
  tileHeader: { flexDirection: 'row', alignItems: 'center', gap: spacing.xs + 2 },
  details: {
    backgroundColor: colors.surface,
    borderRadius: radius.lg,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: colors.border,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.xs,
  },
  detail: { flexDirection: 'row', alignItems: 'center', gap: spacing.sm, minHeight: 36 },
  divider: { height: StyleSheet.hairlineWidth, backgroundColor: colors.border },
  flex: { flex: 1 },
});
