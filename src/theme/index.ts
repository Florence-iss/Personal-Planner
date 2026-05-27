import { Platform } from 'react-native';

// ---------------------------------------------------------------------------
// Colors
// ---------------------------------------------------------------------------

const primaryShades = {
  50: '#EEF2FF',
  100: '#E0E7FF',
  200: '#C7D2FE',
  300: '#A5B4FC',
  400: '#818CF8',
  500: '#6366F1', // base indigo
  600: '#4F46E5',
  700: '#4338CA',
  800: '#3730A3',
  900: '#312E81',
} as const;

export const colors = {
  // Brand
  primary: primaryShades[500],
  primaryLight: primaryShades[300],
  primaryDark: primaryShades[700],
  primaryShades,

  // Surfaces
  background: '#FFFFFF',
  surface: '#F8F8FC',
  surfaceElevated: '#FFFFFF',
  overlay: 'rgba(0, 0, 0, 0.4)',

  // Text
  textPrimary: '#1A1A2E',
  textSecondary: '#6B7280',
  textMuted: '#9CA3AF',
  textInverse: '#FFFFFF',
  textOnPrimary: '#FFFFFF',

  // Border
  border: '#E5E7EB',
  borderFocus: primaryShades[400],
  divider: '#F3F4F6',

  // Semantic
  success: '#10B981',
  successLight: '#D1FAE5',
  successDark: '#059669',

  warning: '#F59E0B',
  warningLight: '#FEF3C7',
  warningDark: '#D97706',

  error: '#EF4444',
  errorLight: '#FEE2E2',
  errorDark: '#DC2626',

  info: '#3B82F6',
  infoLight: '#DBEAFE',
  infoDark: '#2563EB',

  // Finance
  income: '#10B981',
  incomeLight: '#D1FAE5',
  expense: '#EF4444',
  expenseLight: '#FEE2E2',

  // Priority
  priorityHigh: '#EF4444',
  priorityMedium: '#F59E0B',
  priorityLow: '#10B981',

  // Habit/calendar palette for user selection
  palette: [
    '#6366F1', // indigo
    '#8B5CF6', // violet
    '#EC4899', // pink
    '#EF4444', // red
    '#F59E0B', // amber
    '#10B981', // emerald
    '#3B82F6', // blue
    '#14B8A6', // teal
    '#F97316', // orange
    '#84CC16', // lime
  ],

  // Misc
  transparent: 'transparent',
  white: '#FFFFFF',
  black: '#000000',
} as const;

// ---------------------------------------------------------------------------
// Spacing
// ---------------------------------------------------------------------------

export const spacing = {
  xs: 4,
  sm: 8,
  md: 16,
  lg: 24,
  xl: 32,
  xxl: 48,
} as const;

// ---------------------------------------------------------------------------
// Typography
// ---------------------------------------------------------------------------

export const typography = {
  fontSize: {
    xs: 12,
    sm: 14,
    base: 16,
    lg: 18,
    xl: 20,
    xxl: 24,
    xxxl: 30,
    display: 36,
  },
  fontWeight: {
    regular: '400' as const,
    medium: '500' as const,
    semiBold: '600' as const,
    bold: '700' as const,
    extraBold: '800' as const,
  },
  lineHeight: {
    tight: 1.2,
    normal: 1.5,
    relaxed: 1.75,
  },
  letterSpacing: {
    tight: -0.5,
    normal: 0,
    wide: 0.5,
    wider: 1,
  },
} as const;

// ---------------------------------------------------------------------------
// Border Radius
// ---------------------------------------------------------------------------

export const borderRadius = {
  sm: 6,
  md: 10,
  lg: 16,
  xl: 24,
  full: 999,
} as const;

// ---------------------------------------------------------------------------
// Shadows (Platform-aware)
// ---------------------------------------------------------------------------

const iosShadow = (
  offsetY: number,
  blur: number,
  opacity: number,
  color = '#1A1A2E',
) => ({
  shadowColor: color,
  shadowOffset: { width: 0, height: offsetY },
  shadowOpacity: opacity,
  shadowRadius: blur,
  elevation: 0, // keep elevation 0 on iOS; it has its own shadow props
});

const androidShadow = (elevation: number) => ({
  elevation,
  shadowColor: '#1A1A2E', // ignored on Android but kept for parity
  shadowOffset: { width: 0, height: 0 },
  shadowOpacity: 0,
  shadowRadius: 0,
});

export const shadows = {
  none: Platform.select({
    ios: {
      shadowColor: 'transparent',
      shadowOffset: { width: 0, height: 0 },
      shadowOpacity: 0,
      shadowRadius: 0,
      elevation: 0,
    },
    android: { elevation: 0, shadowColor: 'transparent', shadowOffset: { width: 0, height: 0 }, shadowOpacity: 0, shadowRadius: 0 },
  }) ?? {
    shadowColor: 'transparent',
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 0,
    shadowRadius: 0,
    elevation: 0,
  },
  small: Platform.select({
    ios: iosShadow(1, 3, 0.08),
    android: androidShadow(2),
  }) ?? androidShadow(2),
  medium: Platform.select({
    ios: iosShadow(4, 8, 0.12),
    android: androidShadow(6),
  }) ?? androidShadow(6),
  large: Platform.select({
    ios: iosShadow(8, 16, 0.16),
    android: androidShadow(12),
  }) ?? androidShadow(12),
} as const;

// ---------------------------------------------------------------------------
// Combined theme export
// ---------------------------------------------------------------------------

const theme = {
  colors,
  spacing,
  typography,
  borderRadius,
  shadows,
} as const;

export type Theme = typeof theme;
export default theme;
