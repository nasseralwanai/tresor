/**
 * NotificationService — handles push notification lifecycle.
 *
 * Responsibilities:
 * - Handle notifications received while app is in FOREGROUND (show in-app banner)
 * - Handle notification taps (deep-link navigate to relevant screen)
 * - Set up notification channels/categories for Android
 * - Configure notification appearance (title, body, sound, badge)
 *
 * Deep linking routes:
 * - "borrow_request"  -> item detail screen (/item/[id])
 * - "borrow_nudge"    -> record-borrow screen (/borrow/record)
 * - "circle_activity" -> activity tab (/(tabs)/activity)
 * - "item_shared"     -> circle tab (/(tabs)/circle)
 */

import * as Notifications from 'expo-notifications';
import { Platform } from 'react-native';
import { router } from 'expo-router';

// ─── Types ───

export interface NotificationPayload {
  type: string;
  title?: string;
  body?: string;
  data?: Record<string, unknown>;
}

export interface InAppBannerData {
  title: string;
  body: string;
  type: string;
  timestamp: number;
}

type BannerListener = (banner: InAppBannerData | null) => void;

// ─── Notification category identifiers ───

export const NOTIFICATION_CHANNELS = {
  BORROW: 'borrow',
  NUDGE: 'nudge',
  ACTIVITY: 'activity',
  CIRCLE: 'circle',
} as const;

export const NOTIFICATION_TYPES = {
  BORROW_REQUEST: 'borrow_request',
  BORROW_NUDGE: 'borrow_nudge',
  CIRCLE_ACTIVITY: 'circle_activity',
  ITEM_SHARED: 'item_shared',
} as const;

// ─── In-app banner state (simple pub/sub) ───

let currentBanner: InAppBannerData | null = null;
const bannerListeners = new Set<BannerListener>();
let bannerTimeout: ReturnType<typeof setTimeout> | null = null;

function emitBanner(banner: InAppBannerData | null) {
  currentBanner = banner;
  for (const listener of bannerListeners) {
    listener(banner);
  }
}

export function showInAppBanner(title: string, body: string, type: string) {
  // Clear any existing timeout
  if (bannerTimeout) {
    clearTimeout(bannerTimeout);
    bannerTimeout = null;
  }

  const banner: InAppBannerData = {
    title,
    body,
    type,
    timestamp: Date.now(),
  };
  emitBanner(banner);

  // Auto-hide after 5 seconds
  bannerTimeout = setTimeout(() => {
    emitBanner(null);
    bannerTimeout = null;
  }, 5000);
}

export function dismissInAppBanner() {
  if (bannerTimeout) {
    clearTimeout(bannerTimeout);
    bannerTimeout = null;
  }
  emitBanner(null);
}

export function subscribeToBanners(listener: BannerListener): () => void {
  bannerListeners.add(listener);
  // Immediately deliver current state to new subscriber
  listener(currentBanner);
  return () => {
    bannerListeners.delete(listener);
  };
}

// ─── Deep linking ───

function handleNotificationTap(notification: Notifications.Notification) {
  const data = notification.request.content.data ?? {};
  const type = (data.type as string) ?? '';

  switch (type) {
    case NOTIFICATION_TYPES.BORROW_REQUEST: {
      // Navigate to item detail screen
      const itemId = data.itemId as string | undefined;
      if (itemId) {
        router.push(`/item/${itemId}`);
      } else {
        router.push('/(tabs)');
      }
      break;
    }

    case NOTIFICATION_TYPES.BORROW_NUDGE: {
      // Navigate to record-borrow screen
      router.push('/borrow/record');
      break;
    }

    case NOTIFICATION_TYPES.CIRCLE_ACTIVITY: {
      // Navigate to activity tab
      router.push('/(tabs)/activity');
      break;
    }

    case NOTIFICATION_TYPES.ITEM_SHARED: {
      // Navigate to circle tab
      router.push('/(tabs)/circle');
      break;
    }

    default: {
      // Unknown type — go to home
      router.push('/(tabs)');
      break;
    }
  }
}

// ─── Android channel setup ───

async function setupAndroidChannels() {
  if (Platform.OS !== 'android') return;

  await Notifications.setNotificationChannelAsync(NOTIFICATION_CHANNELS.BORROW, {
    name: 'Borrow Requests',
    description: 'Notifications when someone borrows or returns your items',
    importance: Notifications.AndroidImportance.HIGH,
    vibrationPattern: [0, 250, 250, 250],
    lightColor: '#C9A961',
    sound: 'default',
  });

  await Notifications.setNotificationChannelAsync(NOTIFICATION_CHANNELS.NUDGE, {
    name: 'Borrow Nudges',
    description: 'Gentle reminders about items you have borrowed',
    importance: Notifications.AndroidImportance.DEFAULT,
    lightColor: '#C9A961',
    sound: 'default',
  });

  await Notifications.setNotificationChannelAsync(NOTIFICATION_CHANNELS.ACTIVITY, {
    name: 'Circle Activity',
    description: 'Updates from your circle members',
    importance: Notifications.AndroidImportance.DEFAULT,
    lightColor: '#C9A961',
    sound: 'default',
  });

  await Notifications.setNotificationChannelAsync(NOTIFICATION_CHANNELS.CIRCLE, {
    name: 'Circle Updates',
    description: 'Items shared and other circle notifications',
    importance: Notifications.AndroidImportance.LOW,
    lightColor: '#C9A961',
    sound: 'default',
  });
}

// ─── Listener setup ───

/**
 * Sets up all notification listeners. Call this once when the app
 * has an authenticated session. Returns a cleanup function.
 */
export function setupListeners(): () => void {
  // Set up Android channels
  setupAndroidChannels().catch((e) => {
    console.warn('[notifications] Failed to set up Android channels:', e);
  });

  // Foreground notification handler — show in-app banner
  const foregroundSubscription =
    Notifications.addNotificationReceivedListener((notification) => {
      const title = notification.request.content.title ?? 'Tresor';
      const body = notification.request.content.body ?? '';
      const type =
        (notification.request.content.data?.type as string) ?? 'general';
      showInAppBanner(title, body, type);
    });

  // Notification tap handler — deep link navigate
  const tapSubscription =
    Notifications.addNotificationResponseReceivedListener((response) => {
      handleNotificationTap(response.notification);
    });

  return () => {
    foregroundSubscription.remove();
    tapSubscription.remove();
  };
}

// ─── Helper: get channel for notification type ───

export function getChannelForType(type: string): string {
  switch (type) {
    case NOTIFICATION_TYPES.BORROW_REQUEST:
      return NOTIFICATION_CHANNELS.BORROW;
    case NOTIFICATION_TYPES.BORROW_NUDGE:
      return NOTIFICATION_CHANNELS.NUDGE;
    case NOTIFICATION_TYPES.CIRCLE_ACTIVITY:
      return NOTIFICATION_CHANNELS.ACTIVITY;
    case NOTIFICATION_TYPES.ITEM_SHARED:
      return NOTIFICATION_CHANNELS.CIRCLE;
    default:
      return NOTIFICATION_CHANNELS.ACTIVITY;
  }
}

// ─── Re-export for the hook ───

export const NotificationService = {
  setupListeners,
  showInAppBanner,
  dismissInAppBanner,
  subscribeToBanners,
  getChannelForType,
  NOTIFICATION_CHANNELS,
  NOTIFICATION_TYPES,
};
