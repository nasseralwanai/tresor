/**
 * NotificationPermissionPrompt — shown after first sign-in.
 *
 * Asks the user to enable push notifications. If they accept,
 * triggers the permission request via the push notifications hook.
 * If they decline, the prompt disappears (can be re-triggered from settings).
 * Shows AFTER first sign-in, NOT on the welcome screen.
 */

import { useState, useEffect, useCallback } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, Modal, Platform } from 'react-native';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { useThemeColors, typography, spacing, radius } from '@/theme';
import { usePushNotifications } from '@/hooks/usePushNotifications';

const PROMPT_SHOWN_KEY = 'tresor_notification_prompt_shown';

export function NotificationPermissionPrompt() {
  const colors = useThemeColors();
  const { requestPermissions, permissionStatus } = usePushNotifications();
  const [visible, setVisible] = useState(false);

  // Check if prompt should be shown (after first sign-in)
  useEffect(() => {
    let mounted = true;

    (async () => {
      try {
        const shown = await AsyncStorage.getItem(PROMPT_SHOWN_KEY);
        // Only show if never shown before and permissions are undetermined
        if (!shown && permissionStatus === 'undetermined') {
          // Small delay so it appears after the app settles post-sign-in
          setTimeout(() => {
            if (mounted) setVisible(true);
          }, 1500);
        }
      } catch {
        // Ignore storage errors
      }
    })();

    return () => {
      mounted = false;
    };
  }, [permissionStatus]);

  const handleAllow = useCallback(async () => {
    await requestPermissions();
    setVisible(false);
    try {
      await AsyncStorage.setItem(PROMPT_SHOWN_KEY, 'true');
    } catch {
      // Ignore storage errors
    }
  }, [requestPermissions]);

  const handleDismiss = useCallback(() => {
    setVisible(false);
    try {
      AsyncStorage.setItem(PROMPT_SHOWN_KEY, 'true');
    } catch {
      // Ignore storage errors
    }
  }, []);

  if (!visible) return null;

  return (
    <Modal
      visible={visible}
      transparent
      animationType="fade"
      onRequestClose={handleDismiss}
    >
      <View style={styles.overlay}>
        <View
          style={[
            styles.card,
            {
              backgroundColor: colors.surfaceElevated,
              borderColor: colors.border,
            },
          ]}
        >
          <View style={styles.iconContainer}>
            <MaterialCommunityIcons
              name="bell-outline"
              size={36}
              color={colors.accent}
            />
          </View>

          <Text style={[styles.title, { color: colors.textPrimary }]}>
            Stay in the Loop
          </Text>

          <Text style={[styles.description, { color: colors.textSecondary }]}>
            Get notified about borrow requests, returns, nudges, and activity in your circle.
          </Text>

          <View style={styles.buttonRow}>
            <TouchableOpacity
              onPress={handleDismiss}
              style={[
                styles.button,
                styles.buttonSecondary,
                { borderColor: colors.border },
              ]}
            >
              <Text style={[styles.buttonTextSecondary, { color: colors.textSecondary }]}>
                Not Now
              </Text>
            </TouchableOpacity>

            <TouchableOpacity
              onPress={handleAllow}
              style={[
                styles.button,
                styles.buttonPrimary,
                { backgroundColor: colors.accent },
              ]}
            >
              <Text style={styles.buttonTextPrimary}>
                Allow
              </Text>
            </TouchableOpacity>
          </View>
        </View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: 'rgba(0, 0, 0, 0.6)',
    paddingHorizontal: spacing.xl,
  },
  card: {
    width: '100%',
    maxWidth: 360,
    borderRadius: radius.xl,
    borderWidth: 0.5,
    padding: spacing.lg,
    alignItems: 'center',
  },
  iconContainer: {
    marginBottom: spacing.md,
  },
  title: {
    ...typography.title3,
    fontSize: 20,
    textAlign: 'center',
    marginBottom: spacing.sm,
  },
  description: {
    ...typography.body,
    fontSize: 15,
    lineHeight: 21,
    textAlign: 'center',
    marginBottom: spacing.lg,
  },
  buttonRow: {
    flexDirection: 'row',
    gap: spacing.sm,
    width: '100%',
  },
  button: {
    flex: 1,
    height: 48,
    borderRadius: radius.pill,
    justifyContent: 'center',
    alignItems: 'center',
  },
  buttonSecondary: {
    borderWidth: 0.5,
  },
  buttonPrimary: {},
  buttonTextPrimary: {
    ...typography.bodyEmphasized,
    fontSize: 15,
    color: '#1a1715',
  },
  buttonTextSecondary: {
    ...typography.bodyEmphasized,
    fontSize: 15,
  },
});
