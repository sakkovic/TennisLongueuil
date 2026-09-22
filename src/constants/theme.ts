import { Platform, type TextStyle, type ViewStyle } from 'react-native';

/**
 * Four brand colours only. Every other token is a mix of these.
 *
 *  1. ink   #1A231C  text, headers, sign-out
 *  2. green #7CB342  actions, active tab, available
 *  3. lime  #D7F23F  dates, selected week, almost-full
 *  4. white #FFFFFF  cards, buttons-on-green
 */
export const brand = {
  ink: '#1A231C',
  green: '#7CB342',
  lime: '#D7F23F',
  white: '#FFFFFF',
} as const;

function hexToRgb(hex: string): [number, number, number] {
  const value = hex.replace('#', '');
  return [
    parseInt(value.slice(0, 2), 16),
    parseInt(value.slice(2, 4), 16),
    parseInt(value.slice(4, 6), 16),
  ];
}

function mix(from: string, to: string, amount: number): `#${string}` {
  const [fr, fg, fb] = hexToRgb(from);
  const [tr, tg, tb] = hexToRgb(to);
  const hex = (channel: number) => Math.round(channel).toString(16).padStart(2, '0');
  return `#${hex(fr + (tr - fr) * amount)}${hex(fg + (tg - fg) * amount)}${hex(fb + (tb - fb) * amount)}`;
}

const ink = brand.ink;
const green = brand.green;
const lime = brand.lime;
const white = brand.white;
/** Page wash: a drop of ink in white. */
const paper = mix(white, ink, 0.04);

export const colors = {
  primary: green,
  primaryPressed: mix(green, ink, 0.22),
  primarySoft: mix(white, green, 0.18),
  onPrimary: white,

  navy: ink,
  navySoft: mix(white, ink, 0.06),
  onNavy: white,

  lime,
  limeSoft: mix(white, lime, 0.4),
  onLime: ink,
  accent: lime,
  accentPressed: mix(lime, ink, 0.12),
  onAccent: ink,

  background: paper,
  surface: white,
  surfaceMuted: mix(white, ink, 0.08),
  surfacePressed: mix(white, ink, 0.12),
  tabBar: white,
  header: ink,
  border: mix(white, ink, 0.12),
  borderStrong: mix(white, ink, 0.2),

  text: ink,
  textMuted: mix(ink, white, 0.38),
  textSubtle: mix(ink, white, 0.52),

  disabled: mix(white, ink, 0.08),
  disabledText: mix(ink, white, 0.38),

  success: green,
  successSoft: mix(white, green, 0.16),
  warning: ink,
  warningSoft: mix(white, lime, 0.4),
  danger: ink,
  dangerSoft: mix(white, ink, 0.06),
  dangerBorder: mix(white, ink, 0.22),
  info: ink,
  infoSoft: mix(white, ink, 0.06),

  overlay: 'rgba(26, 35, 28, 0.4)',
  courtLine: 'rgba(124, 179, 66, 0.32)',
  glow: 'rgba(124, 179, 66, 0.16)',
  glowFaint: 'rgba(124, 179, 66, 0.08)',
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
 * Plus Jakarta Sans for the whole interface: clean, modern and identical on
 * iOS, Android and web. Playfair Display, the serif of the SaKKa.Tennis logo,
 * is kept for the brand wordmark only. Loaded in app/_layout.tsx.
 *
 * Each weight is its own font file, so pick the weight with `fontFamily`
 * (fonts.bold…), never with `fontWeight`: Android ignores fontWeight on
 * custom fonts.
 */
export const fonts = {
  /** The SaKKa.Tennis wordmark only. */
  brand: 'PlayfairDisplay_700Bold',
  regular: 'PlusJakartaSans_400Regular',
  medium: 'PlusJakartaSans_500Medium',
  semiBold: 'PlusJakartaSans_600SemiBold',
  bold: 'PlusJakartaSans_700Bold',
  extraBold: 'PlusJakartaSans_800ExtraBold',
} as const;

export const typography = {
  display: { fontFamily: fonts.extraBold, fontSize: 28, lineHeight: 36, letterSpacing: -0.4 },
  title: { fontFamily: fonts.bold, fontSize: 22, lineHeight: 28, letterSpacing: -0.2 },
  heading: { fontFamily: fonts.bold, fontSize: 18, lineHeight: 24 },
  body: { fontFamily: fonts.regular, fontSize: 16, lineHeight: 22 },
  bodyStrong: { fontFamily: fonts.semiBold, fontSize: 16, lineHeight: 22 },
  label: { fontFamily: fonts.semiBold, fontSize: 14, lineHeight: 20 },
  caption: { fontFamily: fonts.medium, fontSize: 13, lineHeight: 18 },
  overline: {
    fontFamily: fonts.bold,
    fontSize: 12,
    lineHeight: 16,
    letterSpacing: 1.2,
    textTransform: 'uppercase',
  },
} satisfies Record<string, TextStyle>;

/** Visible box outline — hairline disappears on white and on retina screens. */
export const stroke = 1;

export const shadow = {
  card: Platform.select<ViewStyle>({
    ios: {
      shadowColor: ink,
      shadowOpacity: 0.06,
      shadowRadius: 10,
      shadowOffset: { width: 0, height: 2 },
    },
    android: { elevation: 1 },
    default: {
      shadowColor: ink,
      shadowOpacity: 0.06,
      shadowRadius: 10,
      shadowOffset: { width: 0, height: 2 },
    },
  }),
  glow: Platform.select<ViewStyle>({
    ios: {
      shadowColor: green,
      shadowOpacity: 0.22,
      shadowRadius: 12,
      shadowOffset: { width: 0, height: 4 },
    },
    default: {},
  }),
} as const;

/** Level badges stay inside the four colours: green wash, ink wash, lime, green tint. */
const levelPalette = [
  { background: mix(white, green, 0.2), text: ink },
  { background: mix(white, ink, 0.08), text: ink },
  { background: mix(white, lime, 0.45), text: ink },
  { background: mix(white, green, 0.12), text: mix(ink, green, 0.25) },
] as const;

export function levelColors(rank: number | null | undefined) {
  if (rank == null) return { background: colors.surfaceMuted, text: colors.textMuted };
  const index = Math.min(levelPalette.length - 1, Math.max(0, Math.floor(rank / 10) - 1));
  return levelPalette[index];
}
