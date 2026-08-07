/**
 * NotificationBell — bell icon with unread badge + bottom sheet of notifications.
 *
 * Shows a bell icon in the header with a moti-animated unread count badge.
 * On press, opens a @expo/ui BottomSheet listing recent notifications.
 * Each notification shows title, body, timestamp, and read/unread state.
 * Tapping a notification marks it as read.
 *
 * Warm Atelier styling: gold accent, Georgia headings, Jost body.
 */

import { useState, useCallback, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ScrollView,
  RefreshControl,
  ActivityIndicator,
} from 'react-native';
import { BottomSheet } from '@expo/ui';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { View as MotiView, AnimatePresence } from 'moti';
import { useThemeColors, spacing, radius } from '@/theme';
import { hapticLight, hapticSuccess } from '@/lib/haptics';
import { formatRelativeTime } from '@/lib/format';
import {
  getNotifications,
  markNotificationRead,
  getUnreadNotificationCount,
  type Notification,
} from '@/lib/nudge';

type NotificationBellProps = {
  /** Override the button size. Default 30. */
  size?: number;
  /** Style override for the bell button container. */
  style?: typeof styles.bellBtn;
};

export function NotificationBell({ size = 30, style }: NotificationBellProps) {
  const colors = useThemeColors();
  const [sheetOpen, setSheetOpen] = useState(false);
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [unreadCount, setUnreadCount] = useState(0);
  const [loading, setLoading] = useState(false);
  const [refreshing, setRefreshing] = useState(false);

  // Fetch unread count for the badge
  const loadCount = useCallback(async () => {
    try {
      const count = await getUnreadNotificationCount();
      setUnreadCount(count);
    } catch (e) {
      console.warn('[NotificationBell] Failed to load unread count:', e);
    }
  }, []);

  // Fetch full notification list for the sheet
  const loadNotifications = useCallback(async () => {
    try {
      const notifs = await getNotifications();
      setNotifications(notifs);
    } catch (e) {
      console.warn('[NotificationBell] Failed to load notifications:', e);
    }
  }, []);

  useEffect(() => {
    loadCount();
  }, [loadCount]);

  // Load notifications when the sheet opens
  const handleOpen = useCallback(() => {
    hapticLight();
    setSheetOpen(true);
    setLoading(true);
    loadNotifications().finally(() => setLoading(false));
  }, [loadNotifications]);

  const handleDismiss = useCallback(() => {
    setSheetOpen(false);
    // Refresh the badge count after closing (some may have been marked read)
    loadCount();
  }, [loadCount]);

  const handleRefresh = useCallback(async () => {
    setRefreshing(true);
    await Promise.all([loadNotifications(), loadCount()]);
    setRefreshing(false);
  }, [loadNotifications, loadCount]);

  // Mark a notification as read
  const handleMarkRead = useCallback(
    async (id: string) => {
      hapticSuccess();
      // Optimistic update
      setNotifications((prev) => prev.filter((n) => n.id !== id));
      setUnreadCount((prev) => Math.max(0, prev - 1));
      try {
        await markNotificationRead(id);
      } catch (e) {
        console.warn('[NotificationBell] Failed to mark read:', e);
        // Revert on failure
        loadNotifications();
        loadCount();
      }
    },
    [loadNotifications, loadCount]
  );

  return (
    <>
      <TouchableOpacity
        onPress={handleOpen}
        activeOpacity={0.7}
        style={[
          styles.bellBtn,
          {
            width: size,
            height: size,
            borderRadius: size / 2,
            backgroundColor: colors.surfaceElevated,
          },
          style,
        ]}
      >
        <MaterialCommunityIcons
          name="bell-outline"
          size={size * 0.53}
          color={colors.textPrimary}
        />
        {/* Unread badge with moti animation */}
        <AnimatePresence>
          {unreadCount > 0 && (
            <MotiView
              from={{ scale: 0, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0, opacity: 0 }}
              transition={{ type: 'spring', stiffness: 300, damping: 15 }}
              style={[
                styles.badge,
                { backgroundColor: colors.gold },
              ]}
            >
              <Text style={styles.badgeText}>
                {unreadCount > 9 ? '9+' : unreadCount}
              </Text>
            </MotiView>
          )}
        </AnimatePresence>
      </TouchableOpacity>

      {/* Notifications bottom sheet */}
      <BottomSheet
        isPresented={sheetOpen}
        onDismiss={handleDismiss}
        showDragIndicator
        snapPoints={[{ fraction: 0.65 }]}
      >
        <View style={[styles.sheetContent, { backgroundColor: colors.surface }]}>
          {/* Sheet header */}
          <View style={styles.sheetHeader}>
            <Text style={[styles.sheetTitle, { color: colors.textPrimary }]}>
              Notifications
            </Text>
            {unreadCount > 0 && (
              <View style={[styles.headerBadge, { backgroundColor: colors.gold }]}>
                <Text style={styles.headerBadgeText}>
                  {unreadCount} unread
                </Text>
              </View>
            )}
          </View>

          {/* Notifications list */}
          <ScrollView
            showsVerticalScrollIndicator={false}
            refreshControl={
              <RefreshControl
                refreshing={refreshing}
                onRefresh={handleRefresh}
                tintColor={colors.gold}
              />
            }
            contentContainerStyle={
              notifications.length === 0
                ? styles.emptyList
                : styles.listContent
            }
          >
            {loading ? (
              <View style={styles.placeholderWrap}>
                <ActivityIndicator color={colors.gold} />
              </View>
            ) : notifications.length === 0 ? (
              <View style={styles.placeholderWrap}>
                <MaterialCommunityIcons
                  name="bell-off-outline"
                  size={36}
                  color={colors.textSecondary}
                />
                <Text
                  style={[styles.placeholderText, { color: colors.textSecondary }]}
                >
                  No unread notifications
                </Text>
              </View>
            ) : (
              notifications.map((notif) => (
                <TouchableOpacity
                  key={notif.id}
                  onPress={() => handleMarkRead(notif.id)}
                  activeOpacity={0.7}
                  style={[
                    styles.notifItem,
                    {
                      backgroundColor: colors.surfaceElevated,
                      borderColor: colors.border,
                    },
                  ]}
                >
                  <View style={styles.notifIconWrap}>
                    <MaterialCommunityIcons
                      name={getNotifIcon(notif.type)}
                      size={18}
                      color={colors.gold}
                    />
                  </View>
                  <View style={{ flex: 1 }}>
                    <Text
                      style={[styles.notifTitle, { color: colors.textPrimary }]}
                      numberOfLines={2}
                    >
                      {notif.title}
                    </Text>
                    {notif.body && (
                      <Text
                        style={[styles.notifBody, { color: colors.textSecondary }]}
                        numberOfLines={3}
                      >
                        {notif.body}
                      </Text>
                    )}
                    <Text
                      style={[styles.notifTime, { color: colors.textSecondary }]}
                    >
                      {formatRelativeTime(notif.created_at)}
                    </Text>
                  </View>
                  {/* Unread dot */}
                  <View style={[styles.unreadDot, { backgroundColor: colors.gold }]} />
                </TouchableOpacity>
              ))
            )}
          </ScrollView>
        </View>
      </BottomSheet>
    </>
  );
}

/** Map a notification type to a MaterialCommunityIcons name. */
function getNotifIcon(type: string): React.ComponentProps<typeof MaterialCommunityIcons>['name'] {
  switch (type) {
    case 'borrow_nudge':
      return 'bell-ring-outline';
    case 'borrow_request':
      return 'hand-coin-outline';
    case 'borrow_approved':
      return 'check-circle-outline';
    case 'borrow_returned':
      return 'arrow-u-left-top';
    case 'item_added':
      return 'plus-circle-outline';
    case 'wishlist':
      return 'heart-outline';
    default:
      return 'bell-outline';
  }
}

// Lazy import for ActivityIndicator to avoid circular style reference

const styles = StyleSheet.create({
  bellBtn: {
    alignItems: 'center',
    justifyContent: 'center',
    position: 'relative',
  },
  badge: {
    position: 'absolute',
    top: -4,
    right: -4,
    minWidth: 16,
    height: 16,
    borderRadius: 8,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 4,
  },
  badgeText: {
    fontFamily: 'Jost',
    fontSize: 9,
    fontWeight: '600',
    color: '#FFFFFF',
  },
  // Sheet
  sheetContent: {
    flex: 1,
    paddingTop: 2,
    paddingHorizontal: 22,
    paddingBottom: 20,
  },
  sheetHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 14,
  },
  sheetTitle: {
    fontFamily: 'Georgia',
    fontSize: 18,
    fontWeight: '500',
  },
  headerBadge: {
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: radius.pill,
  },
  headerBadgeText: {
    fontFamily: 'Jost',
    fontSize: 10,
    fontWeight: '500',
    color: '#FFFFFF',
  },
  // List
  listContent: {
    gap: 10,
  },
  emptyList: {
    flex: 1,
  },
  notifItem: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 12,
    padding: spacing.md,
    borderRadius: radius.md,
    borderWidth: StyleSheet.hairlineWidth,
  },
  notifIconWrap: {
    width: 36,
    height: 36,
    borderRadius: 18,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: 'rgba(201, 169, 97, 0.12)',
  },
  notifTitle: {
    fontFamily: 'Georgia',
    fontSize: 14,
    fontWeight: '500',
    lineHeight: 19,
  },
  notifBody: {
    fontFamily: 'Jost',
    fontSize: 12,
    fontWeight: '300',
    lineHeight: 17,
    marginTop: 3,
  },
  notifTime: {
    fontFamily: 'Jost',
    fontSize: 10,
    fontWeight: '300',
    marginTop: 5,
  },
  unreadDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    marginTop: 6,
  },
  // Placeholder
  placeholderWrap: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    gap: spacing.md,
  },
  placeholderText: {
    fontFamily: 'Jost',
    fontSize: 14,
    fontWeight: '300',
  },
});
