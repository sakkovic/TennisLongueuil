import Ionicons from '@expo/vector-icons/Ionicons';
import { Image } from 'expo-image';
import type { ComponentProps } from 'react';
import { ActivityIndicator, Pressable, StyleSheet, View } from 'react-native';

import { AppText } from '@/components/AppText';
import { Button } from '@/components/Button';
import { APP_NAME, COACH_CERTIFICATION, COACH_NAME, HOURLY_RATE } from '@/constants/brand';
import { DEFAULT_LESSON_LOCATION, PLAYERS_PER_COURT } from '@/constants/lessons';
import { colors, fonts, radius, shadow, spacing, stroke } from '@/constants/theme';
import { useT } from '@/i18n';
import { formatMonthDayShort, formatTime } from '@/utils/date';

import { slotLabel, type PosterSlot, type PosterSlotTone } from './posterSessions';

const emblem = require('../../../assets/brand/emblem.png');

type IconName = ComponentProps<typeof Ionicons>['name'];

interface PosterAction {
  label: string;
  sublabel?: string;
  icon?: IconName;
  onPress: () => void;
  disabled?: boolean;
}

interface SessionPosterProps {
  /** The next sessions (up to two) shown as tiles next to the price. */
  slots: PosterSlot[];
  loading?: boolean;
  onPressSlot?: (id: string) => void;
  primaryAction: PosterAction;
  secondaryAction?: { label: string; onPress: () => void };
  /** First name shown under the court on signed-in homes. */
  playerName?: string;
}

/**
 * The home "flyer": brand, offer and the next sessions at a glance, then one
 * big call to action. Shared by the welcome screen, the player home and the
 * coach home so everyone sees the same landing page.
 */
export function SessionPoster({
  slots,
  loading = false,
  onPressSlot,
  primaryAction,
  secondaryAction,
  playerName,
}: SessionPosterProps) {
  const t = useT();

  return (
    <View style={styles.poster}>
      <CourtHero />

      <View style={styles.titleBlock}>
        {playerName ? (
          <AppText style={styles.hello} maxFontSizeMultiplier={1.2}>
            {t('helloName', { name: playerName })}
          </AppText>
        ) : null}
        <AppText style={styles.tagline} maxFontSizeMultiplier={1.2}>
          {t('improveGameAt')}
        </AppText>
        <AppText
          style={styles.wordmark}
          maxFontSizeMultiplier={1.15}
          numberOfLines={1}
          adjustsFontSizeToFit
          accessibilityRole="header"
        >
          {APP_NAME}
        </AppText>
      </View>

      <View style={styles.tiles}>
        {loading ? (
          <View style={[styles.tile, styles.tileLoading]}>
            <ActivityIndicator color={colors.primary} />
          </View>
        ) : slots.length === 0 ? (
          <View style={styles.tile}>
            <Ionicons name="calendar-outline" size={18} color={colors.primary} />
            <AppText variant="caption" tone="muted" style={styles.centered}>
              {t('newSessionsSoon')}
            </AppText>
          </View>
        ) : (
          slots.map((slot) => <SlotTile key={slot.id} slot={slot} onPress={onPressSlot} />)
        )}
        <View style={[styles.tile, styles.priceTile]}>
          <Ionicons name="tennisball" size={14} color={colors.primary} />
          <AppText style={styles.price} maxFontSizeMultiplier={1.2}>
            ${HOURLY_RATE}
          </AppText>
          <AppText style={styles.priceUnit} maxFontSizeMultiplier={1.2}>
            {t('perHour')}
          </AppText>
          <AppText variant="caption" tone="muted" style={styles.centered} numberOfLines={2}>
            {t('courtFeeSplit', { count: PLAYERS_PER_COURT })}
          </AppText>
        </View>
      </View>

      <PosterCta {...primaryAction} />
      {secondaryAction ? (
        <Button
          label={secondaryAction.label}
          variant="secondary"
          onPress={secondaryAction.onPress}
        />
      ) : null}

      <AppText variant="caption" tone="muted" style={styles.coach}>
        {t('posterCoach', {
          name: COACH_NAME,
          cert: COACH_CERTIFICATION,
          place: DEFAULT_LESSON_LOCATION,
        })}
      </AppText>
    </View>
  );
}

/** A top-down tennis court in faint aqua lines, with the emblem as the ball. */
function CourtHero() {
  return (
    <View
      style={styles.hero}
      accessibilityElementsHidden
      importantForAccessibility="no-hide-descendants"
    >
      <View style={styles.court}>
        <View style={[styles.line, styles.singlesTop]} />
        <View style={[styles.line, styles.singlesBottom]} />
        <View style={[styles.line, styles.serviceLeft]} />
        <View style={[styles.line, styles.serviceRight]} />
        <View style={[styles.line, styles.centerService]} />
        <View style={styles.net} />
      </View>
      <View style={styles.glowOuter} />
      <View style={styles.glowInner} />
      <Image source={emblem} style={styles.emblem} contentFit="contain" />
    </View>
  );
}

const pillColors: Record<PosterSlotTone, { background: string; text: string }> = {
  open: { background: colors.primary, text: colors.onPrimary },
  registered: { background: colors.success, text: colors.onPrimary },
  full: { background: colors.warning, text: colors.onPrimary },
  closed: { background: colors.surfaceMuted, text: colors.textMuted },
};

function SlotTile({ slot, onPress }: { slot: PosterSlot; onPress?: (id: string) => void }) {
  const t = useT();
  const label = slotLabel(slot);
  const pill = pillColors[slot.tone];
  const day = formatMonthDayShort(slot.startTime);
  const time = formatTime(slot.startTime);
  const text = t(label.key, label.vars);

  return (
    <Pressable
      onPress={onPress ? () => onPress(slot.id) : undefined}
      disabled={!onPress}
      accessibilityRole={onPress ? 'button' : undefined}
      accessibilityLabel={`${day}, ${time}, ${text}`}
      style={({ pressed }) => [styles.tile, pressed && styles.tilePressed]}
    >
      <Ionicons name="tennisball" size={14} color={colors.primary} />
      <AppText style={styles.day} numberOfLines={1} maxFontSizeMultiplier={1.2}>
        {day}
      </AppText>
      <AppText
        style={styles.time}
        numberOfLines={1}
        adjustsFontSizeToFit
        maxFontSizeMultiplier={1.2}
      >
        {time}
      </AppText>
      <View style={[styles.pill, { backgroundColor: pill.background }]}>
        <AppText
          style={[styles.pillText, { color: pill.text }]}
          numberOfLines={1}
          adjustsFontSizeToFit
          maxFontSizeMultiplier={1.1}
        >
          {text}
        </AppText>
      </View>
    </Pressable>
  );
}

function PosterCta({ label, sublabel, icon = 'tennisball', onPress, disabled }: PosterAction) {
  return (
    <Pressable
      onPress={onPress}
      disabled={disabled}
      accessibilityRole="button"
      accessibilityLabel={sublabel ? `${label}. ${sublabel}` : label}
      accessibilityState={{ disabled: Boolean(disabled) }}
      style={({ pressed }) => [
        styles.cta,
        !disabled && shadow.glow,
        pressed && styles.ctaPressed,
        disabled && styles.ctaDisabled,
      ]}
    >
      <Ionicons name={icon} size={22} color={colors.onPrimary} />
      <View style={styles.ctaText}>
        <AppText style={styles.ctaLabel} numberOfLines={1} maxFontSizeMultiplier={1.2}>
          {label}
        </AppText>
        {sublabel ? (
          <AppText style={styles.ctaSublabel} numberOfLines={1} maxFontSizeMultiplier={1.2}>
            {sublabel}
          </AppText>
        ) : null}
      </View>
    </Pressable>
  );
}

// Court proportions (feet): 78 long × 36 wide; singles 27 wide; service line 21 from the net.
const SINGLES_INSET = `${(4.5 / 36) * 100}%` as const;
const SERVICE_OFFSET = `${(18 / 78) * 100}%` as const;

const styles = StyleSheet.create({
  poster: { gap: spacing.xl },

  hero: {
    height: 148,
    alignItems: 'center',
    justifyContent: 'center',
    marginHorizontal: -spacing.lg,
    overflow: 'hidden',
  },
  court: {
    position: 'absolute',
    width: '90%',
    aspectRatio: 78 / 36,
    borderWidth: 1.5,
    borderColor: colors.courtLine,
    borderRadius: 2,
  },
  line: { position: 'absolute', backgroundColor: colors.courtLine },
  singlesTop: { left: 0, right: 0, top: SINGLES_INSET, height: 1.5 },
  singlesBottom: { left: 0, right: 0, bottom: SINGLES_INSET, height: 1.5 },
  serviceLeft: { left: SERVICE_OFFSET, top: SINGLES_INSET, bottom: SINGLES_INSET, width: 1.5 },
  serviceRight: { right: SERVICE_OFFSET, top: SINGLES_INSET, bottom: SINGLES_INSET, width: 1.5 },
  centerService: { left: SERVICE_OFFSET, right: SERVICE_OFFSET, top: '50%', height: 1.5 },
  net: {
    position: 'absolute',
    left: '50%',
    top: -6,
    bottom: -6,
    width: 2,
    marginLeft: -1,
    backgroundColor: colors.courtLine,
  },
  glowOuter: {
    position: 'absolute',
    width: 148,
    height: 148,
    borderRadius: 74,
    backgroundColor: colors.glowFaint,
  },
  glowInner: {
    position: 'absolute',
    width: 112,
    height: 112,
    borderRadius: 56,
    backgroundColor: colors.glow,
  },
  emblem: { width: 88, height: 88 },

  titleBlock: { alignItems: 'center', gap: spacing.md },
  hello: {
    fontFamily: fonts.displaySemiBold,
    fontSize: 24,
    lineHeight: 30,
    color: colors.text,
    textAlign: 'center',
  },
  tagline: {
    fontSize: 16,
    lineHeight: 22,
    color: colors.textMuted,
    textAlign: 'center',
  },
  wordmark: {
    fontFamily: fonts.display,
    fontSize: 44,
    lineHeight: 52,
    color: colors.primary,
    textAlign: 'center',
  },

  tiles: { flexDirection: 'row', gap: spacing.md },
  tile: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    gap: spacing.sm,
    paddingVertical: spacing.lg,
    paddingHorizontal: spacing.md,
    backgroundColor: colors.surface,
    borderRadius: radius.xl,
    borderWidth: stroke,
    borderColor: colors.borderStrong,
    ...shadow.card,
  },
  tilePressed: { backgroundColor: colors.surfacePressed },
  tileLoading: { minHeight: 118 },
  priceTile: { backgroundColor: colors.primarySoft, borderColor: colors.borderStrong },
  day: {
    fontSize: 11,
    lineHeight: 14,
    fontWeight: '700',
    letterSpacing: 1,
    color: colors.textMuted,
  },
  time: {
    fontFamily: fonts.display,
    fontSize: 21,
    lineHeight: 27,
    color: colors.text,
    fontVariant: ['lining-nums'],
  },
  pill: {
    alignSelf: 'stretch',
    alignItems: 'center',
    borderRadius: radius.pill,
    paddingVertical: spacing.xs,
    paddingHorizontal: spacing.xs + 2,
  },
  pillText: {
    fontSize: 10,
    lineHeight: 13,
    fontWeight: '800',
    letterSpacing: 1,
    textTransform: 'uppercase',
  },
  price: {
    fontFamily: fonts.display,
    fontSize: 28,
    lineHeight: 34,
    color: colors.primary,
    fontVariant: ['lining-nums'],
  },
  priceUnit: {
    fontSize: 10,
    lineHeight: 13,
    fontWeight: '800',
    letterSpacing: 1.5,
    textTransform: 'uppercase',
    color: colors.text,
  },
  centered: { textAlign: 'center' },

  cta: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: spacing.md,
    minHeight: 60,
    paddingHorizontal: spacing.xl,
    borderRadius: radius.pill,
    backgroundColor: colors.primary,
  },
  ctaPressed: { backgroundColor: colors.primaryPressed },
  ctaDisabled: { opacity: 0.45 },
  ctaText: { alignItems: 'center' },
  ctaLabel: {
    fontSize: 15,
    lineHeight: 20,
    fontWeight: '800',
    letterSpacing: 2,
    textTransform: 'uppercase',
    color: colors.onPrimary,
  },
  ctaSublabel: { fontSize: 12, lineHeight: 16, fontWeight: '600', color: colors.onPrimary },
  coach: { textAlign: 'center', letterSpacing: 0.5 },
});
