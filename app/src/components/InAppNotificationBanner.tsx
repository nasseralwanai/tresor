/**
 * InAppNotificationBanner — foreground notification display.
 *
 * Gold accent, dark background, dismissible, auto-hide after 5s.
 * Subscribes to NotificationService banner state.
 */

import { useState, useEffect, useCallback } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, Platform } from 'react-native';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { subscribeToBanners, dismissInAppBanner, type InAppBannerData } from '@/services/NotificationService';
import { DarkThemeColors as dark, spacing, radius, typography } from '@/theme';

// Use the dark theme colors for the banner (gold accent on dark background)
const brandColors = dark;

export function InAppNotificationBanner() {
  const [banner, setBanner] = useState<InAppBannerData | null>(null);
  const insets = useSafeAreaInsets();

  useEffect(() => {
    const unsubscribe = subscribeToBanners((b) => {
      setBanner(b);
    });
    return unsubscribe;
  }, []);

  const handleDismiss = useCallback(() => {
    dismissInAppBanner();
  }, []);

  if (!banner) return null;

  return (
    <View
      style={[
        styles.container,
        { top: insets.top + spacing.xs },
      ]}
      pointerEvents="box-none"
    >
      <View style={styles.banner}>
        <View style={styles.accentBar} />
        <View style={styles.content}>
          <View style={styles.iconRow}>
            <MaterialCommunityIcons
              name="bell-outline"
              size={18}
              color={brandColors.gold}
              style={styles.bellIcon}
            />
            <Text style={styles.title} numberOfLines={1}>
              {banner.title}
            </Text>
          </View>
          {banner.body ? (
            <Text style={styles.body} numberOfLines={2}>
              {banner.body}
            </Text>
          ) : null}
        </View>
        <TouchableOpacity
          onPress={handleDismiss}
          style={styles.closeBtn}
          accessibilityLabel="Dismiss notification"
          accessibilityRole="button"
        >
          <MaterialCommunityIcons
            name="close"
            size={16}
            color={brandColors.textSecondaryDark}
          />
        </TouchableOpacity>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    position: 'absolute',
    left: spacing.md,
    right: spacing.md,
    zIndex: 1000,
    elevation: 10,
  },
  banner: {
    flexDirection: 'row',
    backgroundColor: brandColors.darkSurfaceElevated,
    borderRadius: radius.md,
    borderWidth: 0.5,
    borderColor: brandColors.darkBorder,
    overflow: 'hidden',
    ...Platform.select({
      ios: {
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 4 },
        shadowOpacity: 0.3,
        shadowRadius: 8,
      },
      android: {
        elevation: 8,
      },
    }),
  },
  accentBar: {
    width: 3,
    backgroundColor: brandColors.gold,
  },
  content: {
    flex: 1,
    paddingVertical: spacing.sm + 2,
    paddingHorizontal: spacing.md - 2,
  },
  iconRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.xs,
  },
  bellIcon: {
    flexShrink: 0,
  },
  title: {
    ...typography.bodyEmphasized,
    fontSize: 14,
    color: brandColors.gold,
    flexShrink: 1,
  },
  body: {
    ...typography.subheadline,
    fontSize: 13,
    color: brandColors.textSecondaryDark,
    marginTop: 2,
  },
  closeBtn: {
    padding: spacing.sm + 2,
    justifyContent: 'center',
    alignItems: 'center',
  },
});
