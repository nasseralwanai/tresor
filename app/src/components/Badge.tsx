/**
 * Badge — small status pill with dot indicator.
 * Used for item status (Available, Lent, Private, etc.)
 */

import { View, Text, StyleSheet } from 'react-native';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { useThemeColors, typography } from '@/theme';

export type BadgeVariant = 'available' | 'lent' | 'pending' | 'private' | 'nolend' | 'requested';

const variantConfig: Record<BadgeVariant, { colorKey: string; bgKey: string; icon: string }> = {
  available: { colorKey: 'success', bgKey: 'successBg', icon: 'check-circle-outline' },
  lent: { colorKey: 'gold', bgKey: 'goldBg', icon: 'hand-coin-outline' },
  pending: { colorKey: 'pending', bgKey: 'pendingBg', icon: 'clock-outline' },
  private: { colorKey: 'textSecondary', bgKey: 'surfaceElevated', icon: 'lock-outline' },
  nolend: { colorKey: 'textSecondary', bgKey: 'surfaceElevated', icon: 'hand-back-right-off-outline' },
  requested: { colorKey: 'gold', bgKey: 'goldBg', icon: 'hand-coin-outline' },
};

type BadgeProps = {
  variant: BadgeVariant;
  label: string;
  icon?: string;
};

export function Badge({ variant, label, icon }: BadgeProps) {
  const colors = useThemeColors();
  const config = variantConfig[variant];

  // Use theme colors with fallbacks
  const colorMap: Record<string, string> = {
    success: colors.success,
    gold: colors.gold,
    pending: '#856917',
    textSecondary: colors.textSecondary,
  };
  const bgMap: Record<string, string> = {
    successBg: 'rgba(48,164,108,0.10)',
    goldBg: 'rgba(201,169,97,0.10)',
    pendingBg: 'rgba(133,105,23,0.10)',
    surfaceElevated: colors.surfaceElevated,
  };

  const textColor = colorMap[config.colorKey] ?? colors.textSecondary;
  const bgColor = bgMap[config.bgKey] ?? colors.surfaceElevated;

  return (
    <View style={[styles.badge, { backgroundColor: bgColor }]}>
      <MaterialCommunityIcons name={(icon ?? config.icon) as any} size={11} color={textColor} />
      <Text style={[styles.label, { color: textColor }]}>{label}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  badge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 999,
  },
  label: {
    ...typography.caption2,
    fontSize: 10,
    fontWeight: '500',
  },
});
