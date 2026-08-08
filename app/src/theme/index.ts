import { Platform, useColorScheme } from 'react-native';
import { DarkThemeColors, LightThemeColors, ThemeColors } from './colors';

type TextStyle = {
  fontFamily: string;
  fontSize: number;
  fontWeight: '400' | '500' | '600' | '700';
  letterSpacing?: number;
  lineHeight?: number;
};

export type Typography = {
  largeTitle: TextStyle;
  title1: TextStyle;
  title2: TextStyle;
  title3: TextStyle;
  headline: TextStyle;
  body: TextStyle;
  bodyEmphasized: TextStyle;
  subheadline: TextStyle;
  footnote: TextStyle;
  caption1: TextStyle;
  caption2: TextStyle;
};

// SF Pro on iOS, system font on Android
const fontFamily = Platform.select({ ios: 'SF Pro Text', default: 'system' });

// Warm Atelier luxury fonts
// Georgia is iOS system serif (closest to Playfair Display without font files)
// Jost is loaded by the existing app components as a fontFamily string
const serifFont = Platform.select({ ios: 'Georgia', default: 'serif' });
const bodyFont = 'Jost';

export const typography: Typography = {
  largeTitle: { fontFamily, fontSize: 34, fontWeight: '700', letterSpacing: 0.37 },
  title1: { fontFamily, fontSize: 28, fontWeight: '700', letterSpacing: 0.36 },
  title2: { fontFamily, fontSize: 22, fontWeight: '600', letterSpacing: 0.35 },
  title3: { fontFamily, fontSize: 20, fontWeight: '600', letterSpacing: 0.38 },
  headline: { fontFamily, fontSize: 17, fontWeight: '600' },
  body: { fontFamily, fontSize: 17, fontWeight: '400', lineHeight: 22 },
  bodyEmphasized: { fontFamily, fontSize: 17, fontWeight: '500', lineHeight: 22 },
  subheadline: { fontFamily, fontSize: 15, fontWeight: '400', lineHeight: 20 },
  footnote: { fontFamily, fontSize: 13, fontWeight: '400' },
  caption1: { fontFamily, fontSize: 12, fontWeight: '400' },
  caption2: { fontFamily, fontSize: 11, fontWeight: '500' },
};

export const spacing = {
  xs: 4,
  sm: 8,
  md: 16,
  lg: 24,
  xl: 32,
  xxl: 48,
};

export const radius = {
  sm: 8,
  md: 12,
  lg: 16,
  xl: 24,
  pill: 999,
};

export function useThemeColors(): ThemeColors {
  const scheme = useColorScheme();
  return scheme === 'dark' ? DarkThemeColors : LightThemeColors;
}

export { serifFont, bodyFont, DarkThemeColors, LightThemeColors };
