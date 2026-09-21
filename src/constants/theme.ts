import { Platform, type TextStyle, type ViewStyle } from 'react-native';

/**
 * Design tokens. Deep court green + a touch of tennis-ball yellow, on a warm
 * off-white background. System fonts keep the app fast and native-feeling.
 */
export const colors = {
  primary: '#0E4D2E',
  primaryPressed: '#0A3A22',
  primarySoft: '#E3F0E8',
  onPrimary: '#FFFFFF',

  accent: '#D7F23B',
  onAccent: '#1B2A06',

  background: '#F5F6F2',
  surface: '#FFFFFF',
  surfaceMuted: '#EEF0EA',
  border: '#E1E4DC',
  borderStrong: '#C9CEC3',

  text: '#111A14',
  textMuted: '#5E6B62',
  textSubtle: '#6F7B72',

  success: '#1E7F4F',
  successSoft: '#E1F3E8',
  warning: '#9A4A07',
  warningSoft: '#FDF1D8',
  danger: '#B42318',
  dangerSoft: '#FDE8E7',
  info: '#1D4E89',
  infoSoft: '#E3EDFA',

  overlay: 'rgba(17, 26, 20, 0.45)',
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

export const typography = {
  display: { fontSize: 28, lineHeight: 34, fontWeight: '800', letterSpacing: -0.4 },
  title: { fontSize: 22, lineHeight: 28, fontWeight: '700', letterSpacing: -0.2 },
  heading: { fontSize: 18, lineHeight: 24, fontWeight: '700' },
  body: { fontSize: 16, lineHeight: 22, fontWeight: '400' },
  bodyStrong: { fontSize: 16, lineHeight: 22, fontWeight: '600' },
  label: { fontSize: 14, lineHeight: 20, fontWeight: '600' },
  caption: { fontSize: 13, lineHeight: 18, fontWeight: '500' },
  overline: {
    fontSize: 12,
    lineHeight: 16,
    fontWeight: '700',
    letterSpacing: 1.2,
    textTransform: 'uppercase',
  },
} satisfies Record<string, TextStyle>;

export const shadow = {
  card: Platform.select<ViewStyle>({
    ios: {
      shadowColor: '#0B1F14',
      shadowOpacity: 0.06,
      shadowRadius: 10,
      shadowOffset: { width: 0, height: 3 },
    },
    android: { elevation: 1 },
    default: {},
  }),
} as const;

/** Level badge colours, chosen by level rank so new levels need no code change. */
const levelPalette = [
  { background: '#E3F0E8', text: '#0E4D2E' },
  { background: '#E3EDFA', text: '#1D4E89' },
  { background: '#EEE7FB', text: '#5B2A9D' },
  { background: '#FDEBDD', text: '#9A3412' },
] as const;

export function levelColors(rank: number | null | undefined) {
  if (rank == null) return { background: colors.surfaceMuted, text: colors.textMuted };
  const index = Math.min(levelPalette.length - 1, Math.max(0, Math.floor(rank / 10) - 1));
  return levelPalette[index];
}
