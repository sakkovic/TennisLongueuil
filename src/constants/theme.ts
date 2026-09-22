import { Platform, type TextStyle, type ViewStyle } from 'react-native';

/**
 * SaKKa.Tennis design tokens.
 *
 * Soft teal on a mist background so white cards and 1px borders stay visible
 * without neon contrast. Use these tokens everywhere; never hard-code colours.
 */
export const brand = {
  aqua: '#14B4B0',
  aquaDeep: '#0E9A97',
  aquaLight: '#5DCECB',
  ink: '#122022',
} as const;

export const colors = {
  primary: brand.aqua,
  primaryPressed: brand.aquaDeep,
  /** Soft aqua wash for highlighted areas. */
  primarySoft: '#D9F2F1',
  /** Text and icons placed on aqua. */
  onPrimary: '#042221',

  accent: '#0D6F6C',
  accentPressed: '#0A5856',
  onAccent: '#042221',

  background: '#F2F5F5',
  surface: '#FFFFFF',
  surfaceMuted: '#DEE7E7',
  surfacePressed: '#D0DCDC',
  tabBar: '#FFFFFF',
  border: '#6F8A8A',
  borderStrong: '#4D6868',

  text: brand.ink,
  textMuted: '#3F5556',
  textSubtle: '#6B8081',

  success: '#1A9A64',
  successSoft: '#E6F7EF',
  warning: '#C07A12',
  warningSoft: '#FFF4E0',
  danger: '#D64545',
  dangerSoft: '#FDECEC',
  dangerBorder: '#F3C4C4',
  info: '#2B6CB0',
  infoSoft: '#E8F1FC',

  overlay: 'rgba(11, 26, 28, 0.4)',
  courtLine: 'rgba(20, 180, 176, 0.38)',
  glow: 'rgba(20, 180, 176, 0.16)',
  glowFaint: 'rgba(20, 180, 176, 0.08)',
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

/** Visible box outline — hairline disappears on white and on retina screens. */
export const stroke = 1;

export const shadow = {
  card: Platform.select<ViewStyle>({
    ios: {
      shadowColor: '#122022',
      shadowOpacity: 0.1,
      shadowRadius: 8,
      shadowOffset: { width: 0, height: 2 },
    },
    android: { elevation: 2 },
    default: {
      shadowColor: '#122022',
      shadowOpacity: 0.1,
      shadowRadius: 8,
      shadowOffset: { width: 0, height: 2 },
    },
  }),
  glow: Platform.select<ViewStyle>({
    ios: {
      shadowColor: brand.aqua,
      shadowOpacity: 0.28,
      shadowRadius: 12,
      shadowOffset: { width: 0, height: 4 },
    },
    default: {},
  }),
} as const;

/** Level badge colours, chosen by level rank so new levels need no code change. */
const levelPalette = [
  { background: '#E6F8F8', text: '#0A6E6C' },
  { background: '#E8F1FF', text: '#2B5EA7' },
  { background: '#F1ECFF', text: '#5B4AA8' },
  { background: '#FFF1E4', text: '#A45B12' },
] as const;

export function levelColors(rank: number | null | undefined) {
  if (rank == null) return { background: colors.surfaceMuted, text: colors.textMuted };
  const index = Math.min(levelPalette.length - 1, Math.max(0, Math.floor(rank / 10) - 1));
  return levelPalette[index];
}
