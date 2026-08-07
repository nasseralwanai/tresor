// Trésor brand colors — Warm Atelier aesthetic
// No react-navigation dependency (Expo SDK 57 dropped compat)

const brandColors = {
  gold: '#C9A961',
  goldLight: '#E0C98A',
  goldDark: '#82602C',
  cream: '#F5F2ED',
  charcoal: '#0A0A0B',
  darkSurface: '#1A1A1C',
  darkSurfaceElevated: '#242427',
  darkBorder: '#2E2E32',
  lightSurface: '#FFFFFF',
  lightSurfaceElevated: '#F8F6F2',
  lightBorder: '#E5E0D8',
  error: '#E5484D',
  success: '#30A46C',
  textPrimary: '#1A1A1C',
  textSecondary: '#6B6B70',
  textPrimaryDark: '#F5F2ED',
  textSecondaryDark: '#9B9BA0',
};

export const DarkThemeColors = {
  ...brandColors,
  background: brandColors.charcoal,
  surface: brandColors.darkSurface,
  surfaceElevated: brandColors.darkSurfaceElevated,
  border: brandColors.darkBorder,
  textPrimary: brandColors.textPrimaryDark,
  textSecondary: brandColors.textSecondaryDark,
  accent: brandColors.gold,
};

export const LightThemeColors = {
  ...brandColors,
  background: brandColors.cream,
  surface: brandColors.lightSurface,
  surfaceElevated: brandColors.lightSurfaceElevated,
  border: brandColors.lightBorder,
  textPrimary: brandColors.textPrimary,
  textSecondary: brandColors.textSecondary,
  accent: brandColors.goldDark,
};

export type ThemeColors = typeof DarkThemeColors;

export { brandColors };
