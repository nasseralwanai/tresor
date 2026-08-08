/**
 * OfflineBanner — subtle banner shown when the device is offline.
 *
 * "You're offline — some features may be unavailable"
 * Uses the Trésor dark aesthetic with gold accent.
 * Renders null when online.
 */

import { View, Text, StyleSheet } from 'react-native';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { useThemeColors, spacing, radius, typography } from '@/theme';

export function OfflineBanner({ isOffline }: { isOffline: boolean }) {
  const colors = useThemeColors();

  if (!isOffline) return null;

  return (
    <View
      style={[styles.container, { backgroundColor: colors.darkSurfaceElevated }]}
      accessibilityRole="alert"
      accessibilityLabel="You are offline"
    >
      <MaterialCommunityIcons
        name="wifi-off"
        size={14}
        color={colors.gold}
      />
      <Text style={[styles.text, { color: colors.gold }]}>
        You're offline — some features may be unavailable
      </Text>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: spacing.sm,
    paddingVertical: spacing.sm,
    paddingHorizontal: spacing.md,
  },
  text: {
    ...typography.caption1,
    fontSize: 12,
    fontWeight: '500',
    letterSpacing: 0.3,
  },
});
