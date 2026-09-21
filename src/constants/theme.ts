import { Platform, type TextStyle, type ViewStyle } from 'react-native';

/**
 * SaKKa.Tennis design tokens.
 *
 * Dark, premium and athletic: the near-black and bright aqua are sampled from
 * the brand artwork (assets/sakkatennis_*.png), so logo images sit seamlessly
 * on the app background. Use these tokens everywhere; never hard-code colours.
 */
export const brand = {
  aqua: '#1ECFCB',
  aquaDeep: '#00C4C4',
  aquaLight: '#6CDFDD',
  ink: '#04080B',
} as const;

export const colors = {
  primary: brand.aqua,
  primaryPressed: '#17B5B2',
  /** Aqua-tinted dark surface for highlighted areas. */
  primarySoft: '#0B2B2D',
  /** Text and icons placed on aqua. */
  onPrimary: '#021416',

  accent: brand.aquaLight,
  accentPressed: '#56D2CF',
  onAccent: '#021416',

  background: brand.ink,
  surface: '#0B1417',
  surfaceMuted: '#111E22',
  surfacePressed: '#16272C',
  tabBar: '#070E11',
  border: '#1A2B30',
  borderStrong: '#28434A',

  text: '#E8F6F6',
  textMuted: '#9DB4B6',
  textSubtle: '#6F898C',

  success: '#4ADE9A',
  successSoft: '#0E2A20',
  warning: '#F4B860',
  warningSoft: '#2C2210',
  danger: '#FF7A7A',
  dangerSoft: '#321417',
  dangerBorder: '#5B2A2F',
  info: '#7FB8FF',
  infoSoft: '#11223A',

  overlay: 'rgba(0, 0, 0, 0.65)',
  /** Faint aqua lines of the court drawing on the home poster. */
  courtLine: 'rgba(30, 207, 203, 0.22)',
  /** Soft aqua halo behind the emblem. */
  glow: 'rgba(30, 207, 203, 0.10)',
  glowFaint: 'rgba(30, 207, 203, 0.05)',
} as const;

export const spacing = {
  xxs: 2,
  xs: 4,
  sm: 8,
  md: 12,
  lg: 16,
  xl: 24,
  xxl: 32,
  xxxl: 48,
} as const;

export const radius = {
  sm: 8,
  md: 12,
  lg: 16,
  xl: 24,
  pill: 999,
} as const;

/** Minimum comfortable touch target (Apple HIG 44pt, Material 48dp). */
export const touchTarget = 48;

/**
 * Playfair Display (the elegant serif of the SaKKa.Tennis wordmark) is used for
 * the brand name and large headings only; everything else uses the system font
 * for readability. Loaded in app/_layout.tsx.
 */
export const fonts = {
  display: 'PlayfairDisplay_700Bold',
  displaySemiBold: 'PlayfairDisplay_600SemiBold',
} as const;

export const typography = {
  display: { fontFamily: fonts.display, fontSize: 30, lineHeight: 38, letterSpacing: 0.2 },
  title: { fontFamily: fonts.displaySemiBold, fontSize: 23, lineHeight: 30, letterSpacing: 0.2 },
  heading: { fontSize: 18, lineHeight: 24, fontWeight: '700' },
  body: { fontSize: 16, lineHeight: 22, fontWeight: '400' },
  bodyStrong: { fontSize: 16, lineHeight: 22, fontWeight: '600' },
  label: { fontSize: 14, lineHeight: 20, fontWeight: '600' },
  caption: { fontSize: 13, lineHeight: 18, fontWeight: '500' },
  overline: {
    fontSize: 12,
    lineHeight: 16,
    fontWeight: '700',
    letterSpacing: 1.4,
    textTransform: 'uppercase',
  },
} satisfies Record<string, TextStyle>;

export const shadow = {
  /** On a dark UI, depth comes from borders and surfaces; cards stay flat. */
  card: {} as ViewStyle,
  /** Soft aqua glow for the main call to action (iOS; Android shows a flat button). */
  glow: Platform.select<ViewStyle>({
    ios: {
      shadowColor: brand.aqua,
      shadowOpacity: 0.35,
      shadowRadius: 14,
      shadowOffset: { width: 0, height: 4 },
    },
    default: {},
  }),
} as const;

/** Level badge colours, chosen by level rank so new levels need no code change. */
const levelPalette = [
  { background: '#0B2B2D', text: brand.aquaLight },
  { background: '#11223A', text: '#8FC1FF' },
  { background: '#221B3A', text: '#BBA6FF' },
  { background: '#35230F', text: '#FFB56B' },
] as const;

export function levelColors(rank: number | null | undefined) {
  if (rank == null) return { background: colors.surfaceMuted, text: colors.textMuted };
  const index = Math.min(levelPalette.length - 1, Math.max(0, Math.floor(rank / 10) - 1));
  return levelPalette[index];
}
