/**
 * usePushNotifications — push token registration and permission management.
 *
 * On app launch (if authenticated), requests notification permissions.
 * If granted, registers for remote notifications via expo-notifications,
 * gets the Expo push token, and saves it to the profiles table.
 *
 * Fails gracefully: if permission is denied, no APNs key is configured,
 * or the token request fails, it logs a warning and returns null — no crash.
 *
 * Returns { pushToken, permissionStatus } for UI use.
 */

import { useState, useEffect, useCallback, useRef } from 'react';
import * as Notifications from 'expo-notifications';
import { Platform } from 'react-native';
import { supabase } from '@/lib/supabase';
import { useAuth } from '@/hooks/useAuth';
import { NotificationService } from '@/services/NotificationService';

export type PushPermissionStatus =
  | 'undetermined'
  | 'granted'
  | 'denied'
  | 'undetermined';

export interface UsePushNotificationsResult {
  pushToken: string | null;
  permissionStatus: PushPermissionStatus;
  requestPermissions: () => Promise<void>;
}

// Configure notification handler at module level so it's set once.
// This controls how notifications appear when the app is in the foreground.
Notifications.setNotificationHandler({
  handleNotification: async () => ({
    shouldShowAlert: true,
    shouldPlaySound: true,
    shouldSetBadge: true,
    shouldShowBanner: true,
    shouldShowList: true,
  }),
});

export function usePushNotifications(): UsePushNotificationsResult {
  const { user, session } = useAuth();
  const [pushToken, setPushToken] = useState<string | null>(null);
  const [permissionStatus, setPermissionStatus] =
    useState<PushPermissionStatus>('undetermined');
  const registrationAttempted = useRef(false);

  // Save the push token to the profiles table
  const saveTokenToProfile = useCallback(
    async (token: string, userId: string) => {
      try {
        const { error } = await supabase
          .from('profiles')
          .update({ push_token: token })
          .eq('id', userId);

        if (error) {
          console.warn('[push] Failed to save push token:', error.message);
        }
      } catch (e) {
        console.warn('[push] Error saving push token:', e);
      }
    },
    []
  );

  // Register for push notifications
  const registerForPushNotifications = useCallback(async () => {
    if (!user?.id) return;

    try {
      // 1. Request permissions
      const { status: existingStatus } =
        await Notifications.getPermissionsAsync();
      let finalStatus = existingStatus;

      if (existingStatus !== 'granted') {
        const { status } = await Notifications.requestPermissionsAsync();
        finalStatus = status;
      }

      if (finalStatus !== 'granted') {
        console.warn('[push] Notification permission not granted');
        setPermissionStatus('denied');
        return;
      }

      setPermissionStatus('granted');

      // 2. Must be a physical device for push tokens
      if (Platform.OS === 'android') {
        await Notifications.setNotificationChannelAsync('borrow', {
          name: 'Borrow Requests',
          importance: Notifications.AndroidImportance.HIGH,
          vibrationPattern: [0, 250, 250, 250],
          lightColor: '#C9A961',
        });
        await Notifications.setNotificationChannelAsync('nudge', {
          name: 'Borrow Nudges',
          importance: Notifications.AndroidImportance.DEFAULT,
          lightColor: '#C9A961',
        });
        await Notifications.setNotificationChannelAsync('activity', {
          name: 'Circle Activity',
          importance: Notifications.AndroidImportance.DEFAULT,
          lightColor: '#C9A961',
        });
        await Notifications.setNotificationChannelAsync('circle', {
          name: 'Circle Updates',
          importance: Notifications.AndroidImportance.LOW,
          lightColor: '#C9A961',
        });
      }

      // 3. Get the Expo push token
      // This will fail gracefully if no APNs key is configured — caught below.
      const tokenResponse = await Notifications.getExpoPushTokenAsync({
        projectId: 'tresor',
      });

      const token = tokenResponse.data;
      if (token) {
        setPushToken(token);
        await saveTokenToProfile(token, user.id);
      }
    } catch (e) {
      // Expected when no APNs key is configured (local dev without Apple Dev account).
      // Fail gracefully — no crash, just log a warning.
      console.warn(
        '[push] Failed to register for push notifications (expected if no APNs key configured):',
        e
      );
      setPermissionStatus('undetermined');
    }
  }, [user?.id, saveTokenToProfile]);

  // Auto-register when authenticated (on app launch)
  useEffect(() => {
    if (!session || !user?.id) {
      setPushToken(null);
      setPermissionStatus('undetermined');
      registrationAttempted.current = false;
      return;
    }

    // Only attempt registration once per session
    if (registrationAttempted.current) return;
    registrationAttempted.current = true;

    registerForPushNotifications();
  }, [session, user?.id, registerForPushNotifications]);

  // Set up notification listeners for foreground/tap handling
  useEffect(() => {
    if (!session) return;

    const cleanup = NotificationService.setupListeners();
    return cleanup;
  }, [session]);

  // Public method to manually request permissions (e.g., from a prompt)
  const requestPermissions = useCallback(async () => {
    await registerForPushNotifications();
  }, [registerForPushNotifications]);

  return {
    pushToken,
    permissionStatus,
    requestPermissions,
  };
}
