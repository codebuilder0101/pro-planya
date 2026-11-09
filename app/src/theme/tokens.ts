/**
 * PlanYá design tokens.
 *
 * Source: the client's Figma "PlanYá Design System v1.0" (exported Nov 3, 2026):
 *   - 01 Foundations: type scale, 8pt spacing, radius scale, 6-level elevation, motion tokens.
 *   - Colors: measured from the final Sprint screens (Home, Experience Detail, Explore), because the file's
 *     variables are not readable through the API. Brand = forest green, neutrals = warm stone.
 *
 * Architecture (as in Figma): primitive -> semantic. Components use ONLY semantic tokens (ESLint enforces
 * no raw hex/rgb outside this file), so swapping a primitive restyles the whole app and a dark theme can
 * later remap the semantic layer. Light mode only for the MVP.
 *
 * Modernization (brief): softer cards (radius 16-24, light two-layer shadows instead of borders),
 * edge-to-edge photos with gradient scrims, pill chips, floating translucent tab bar.
 */
import { Platform } from 'react-native'

// ---------------------------------------------------------------- primitives
export const palette = {
  // Forest green (brand). 50/100/150/200/500/600/700/900 are exact Figma values; 300/400/800 are interpolated.
  green50: '#F2F7F4',
  green100: '#E0EDE4',
  green150: '#D9E3DE',
  green200: '#C1DACB',
  green300: '#97BFA6',
  green400: '#6EA584',
  green500: '#4A8A63',
  green600: '#3B7050',
  green700: '#2E5A40',
  green800: '#24412F',
  green900: '#1A2921',

  // Warm stone neutrals. All exact Figma values except 700/800 (interpolated).
  stone0: '#FFFFFF',
  stone50: '#FAFAF9',
  stone100: '#F5F4F2',
  stone200: '#E8E6E3',
  stone300: '#D4D1CC',
  stone400: '#918C85',
  stone500: '#706C66',
  stone600: '#54524D',
  stone700: '#3D3B38',
  stone800: '#2B2A27',
  stone900: '#1F1E1C',
  black: '#000000',

  // Accents (Figma: "Popular" badges, rating stars, sunrise gradient).
  coral500: '#FF5926',
  coral600: '#E04A1B',
  coral100: '#FFE9E1',
  orange500: '#F07B20',
  sun400: '#FFD94D',
  sun500: '#FFD600',
  amber800: '#745A2E',
  amber100: '#FBF1DF',

  // Error (not present on the exported screens; standard accessible red, confirm with Davi).
  red700: '#A62F24',
  red600: '#C8372B',
  red50: '#FDECEA',
} as const

// ---------------------------------------------------------------- semantic colors
export const colors = {
  // Surfaces
  background: palette.stone50,
  surface: palette.stone0,
  surfaceMuted: palette.stone100,
  surfaceBrand: palette.green50,
  surfaceBrandStrong: palette.green900,
  surfaceInverse: palette.stone900,

  // Text
  textPrimary: palette.stone900,
  textSecondary: palette.stone500,
  textTertiary: palette.stone400,
  textInverse: palette.stone0,
  textBrand: palette.green600,
  textBrandStrong: palette.green700,
  textOnImage: palette.stone0,
  textWarning: palette.amber800,

  // Actions
  primary: palette.green600,
  primaryPressed: palette.green700,
  primarySoft: palette.green100,
  primaryTint: palette.green50,
  onPrimary: palette.stone0,
  brandAccent: palette.green500,

  accent: palette.coral500,
  accentPressed: palette.coral600,
  accentSoft: palette.coral100,
  onAccent: palette.stone0,
  highlight: palette.orange500,

  favorite: palette.coral500,
  rating: palette.sun500,

  // States
  danger: palette.red600,
  dangerPressed: palette.red700,
  dangerSoft: palette.red50,
  success: palette.green500,
  successSoft: palette.green100,
  warningSoft: palette.amber100,

  // Borders
  border: palette.stone200,
  borderSubtle: palette.stone100,
  borderStrong: palette.stone300,
  borderFocus: palette.green500,
  borderBrand: palette.green200,
  divider: palette.stone100,

  // Loading / overlays
  skeleton: palette.stone200,
  skeletonHighlight: palette.stone100,
  overlay: 'rgba(26, 41, 33, 0.45)',
  imageScrimTop: 'rgba(0, 0, 0, 0)',
  imageScrimMid: 'rgba(0, 0, 0, 0.20)',
  imageScrimBottom: 'rgba(0, 0, 0, 0.72)',
  glass: 'rgba(255, 255, 255, 0.90)',
  glassOnImage: 'rgba(255, 255, 255, 0.20)',
  glassBorderOnImage: 'rgba(255, 255, 255, 0.28)',
  mapPlaceholder: palette.green150,

  // Tab bar (floating, translucent)
  tabBarBackground: 'rgba(255, 255, 255, 0.72)',
  /** Android: no cheap native blur, so a more opaque surface. */
  tabBarBackgroundOpaque: 'rgba(255, 255, 255, 0.97)',
  tabBarBorder: 'rgba(31, 30, 28, 0.06)',
  tabIconActive: palette.green600,
  tabIconInactive: palette.stone400,
} as const

export type ColorToken = keyof typeof colors

// ---------------------------------------------------------------- spacing (Figma 8pt scale)
export const spacing = {
  none: 0,
  xxs: 2,
  xs: 4,
  sm: 8,
  md: 12,
  lg: 16,
  lgPlus: 20,
  xl: 24,
  xxl: 32,
  xxxl: 40,
  huge: 48,
  giant: 64,
} as const

export type SpacingToken = keyof typeof spacing

/** Side margin of every screen (Figma: 390pt frame, 4 columns, 16pt margins, 8pt gutter). */
export const screenMargin = spacing.lg
export const gridGutter = spacing.sm

// ---------------------------------------------------------------- radius (Figma scale)
export const radius = {
  none: 0,
  xs: 4,
  sm: 8,
  md: 12,
  lg: 16,
  xl: 20,
  xxl: 24,
  xxxl: 32,
  pill: 999,
} as const

/** Modernized component mapping (brief: softer cards 16-24). */
export const shape = {
  button: radius.md,
  input: radius.md,
  card: radius.xl,
  cardLarge: radius.xxl,
  sheet: radius.xxl,
  chip: radius.pill,
  badge: radius.sm,
} as const

// ---------------------------------------------------------------- elevation (Figma 6 levels, two layers each)
// RN's cross-platform `boxShadow`. Light shadows instead of borders.
export const elevation = {
  0: {},
  1: { boxShadow: '0px 1px 2px rgba(0, 0, 0, 0.04), 0px 1px 3px rgba(0, 0, 0, 0.06)' },
  2: { boxShadow: '0px 2px 4px -1px rgba(0, 0, 0, 0.06), 0px 4px 8px -1px rgba(0, 0, 0, 0.10)' },
  3: { boxShadow: '0px 4px 6px rgba(0, 0, 0, 0.06), 0px 8px 16px rgba(0, 0, 0, 0.10)' },
  4: { boxShadow: '0px 8px 10px rgba(0, 0, 0, 0.06), 0px 16px 24px rgba(0, 0, 0, 0.12)' },
  5: { boxShadow: '0px 12px 16px rgba(0, 0, 0, 0.08), 0px 24px 48px rgba(0, 0, 0, 0.16)' },
} as const

// ---------------------------------------------------------------- motion (Figma tokens)
export const motion = {
  duration: {
    instant: 0,
    fast: 150,
    normal: 300,
    slow: 500,
  },
  /** cubic-bezier control points, for Reanimated `Easing.bezier(...)`. */
  easing: {
    inOut: [0.42, 0, 0.58, 1] as const,
    out: [0, 0, 0.58, 1] as const,
    in: [0.42, 0, 1, 1] as const,
    spring: [0.175, 0.885, 0.32, 1.275] as const,
  },
  /** Physical springs for gestures (press, heart, sheets). Disabled with reduced motion. */
  spring: {
    press: { damping: 18, stiffness: 320, mass: 0.6 },
    gentle: { damping: 20, stiffness: 180, mass: 1 },
    bouncy: { damping: 9, stiffness: 260, mass: 0.7 },
  },
  pressScale: 0.97,
} as const

// ---------------------------------------------------------------- typography (Figma type scale)
// SF Pro (system font) on iOS; Inter on Android (SF Pro's license is Apple-only).
const inter = {
  regular: 'Inter_400Regular',
  medium: 'Inter_500Medium',
  semibold: 'Inter_600SemiBold',
  bold: 'Inter_700Bold',
} as const

type Weight = keyof typeof inter
const iosWeight: Record<Weight, '400' | '500' | '600' | '700'> = {
  regular: '400',
  medium: '500',
  semibold: '600',
  bold: '700',
}

/** Font style for a weight: system font + fontWeight on iOS, Inter family on Android. */
export function font(weight: Weight) {
  return Platform.OS === 'ios' ? { fontWeight: iosWeight[weight] } : { fontFamily: inter[weight] }
}

export const typography = {
  /** Figma H2 32/40. Hero titles. */
  display: { fontSize: 32, lineHeight: 40, letterSpacing: -0.25, ...font('bold') },
  /** Figma H3 28/36. Screen titles. */
  title1: { fontSize: 28, lineHeight: 36, letterSpacing: -0.2, ...font('bold') },
  /** Figma H4 24/32. Detail title, greeting. */
  title2: { fontSize: 24, lineHeight: 32, ...font('bold') },
  /** Figma H5 20/28. Card group / sheet titles. */
  title3: { fontSize: 20, lineHeight: 28, letterSpacing: 0.15, ...font('semibold') },
  /** Figma H6 18/24. Section headers. */
  headline: { fontSize: 18, lineHeight: 24, letterSpacing: 0.15, ...font('semibold') },
  /** Figma Body Medium 16/24. */
  body: { fontSize: 16, lineHeight: 24, letterSpacing: 0.25, ...font('regular') },
  /** Figma Title 16/24 semibold. */
  bodyStrong: { fontSize: 16, lineHeight: 24, letterSpacing: 0.15, ...font('semibold') },
  /** Long-form description text (Figma detail screen 15/22). */
  callout: { fontSize: 15, lineHeight: 22, ...font('regular') },
  /** Figma Label 14/20 medium. */
  subhead: { fontSize: 14, lineHeight: 20, letterSpacing: 0.1, ...font('medium') },
  /** Figma Body Small 14/20. */
  footnote: { fontSize: 14, lineHeight: 20, letterSpacing: 0.25, ...font('regular') },
  /** Figma Caption 12/16. */
  caption: { fontSize: 12, lineHeight: 16, letterSpacing: 0.4, ...font('regular') },
  /** Caption, medium weight (meta rows on cards). */
  captionStrong: { fontSize: 12, lineHeight: 16, letterSpacing: 0.4, ...font('medium') },
  /** Figma Overline 11/16 semibold, +1.5. Use with uppercase text. */
  overline: { fontSize: 11, lineHeight: 16, letterSpacing: 1.5, ...font('semibold') },
  button: { fontSize: 16, lineHeight: 22, letterSpacing: 0.1, ...font('semibold') },
} as const

export type TypographyToken = keyof typeof typography

/** Minimum tap target (accessibility). */
export const minTapTarget = 44

export const theme = {
  palette,
  colors,
  spacing,
  radius,
  shape,
  elevation,
  motion,
  typography,
  screenMargin,
  gridGutter,
  minTapTarget,
}
export type Theme = typeof theme
