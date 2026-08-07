/**
 * CircleActivitySection — Section 3 of the segregated feed.
 * Compact single-line rows with avatars, activity text, timestamps,
 * and type icons. Includes "Mark Returned" action for active borrows.
 */

import { memo, useCallback, useMemo } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, Alert } from 'react-native';
import { View as MotiView } from 'moti';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { useThemeColors, spacing, radius } from '@/theme';
import { Avatar } from '@/components/Avatar';
import { SectionHeader } from './SectionHeader';
import { hapticSuccess } from '@/lib/haptics';
import { formatRelativeTime } from '@/lib/format';
import { markReturned } from '@/lib/activity';
import type { ActivityEntry } from '@/types/items';

type CircleActivitySectionProps = {
  activities: ActivityEntry[];
  currentUserId: string;
  onSeeAll?: () => void;
  onActivityChanged?: () => void;
};

const ICONS: Record<string, string> = {
  item_added: 'plus-circle-outline',
  borrow_requested: 'hand-coin-outline',
  borrow_approved: 'check-circle-outline',
  borrow_active: 'swap-horizontal',
  borrow_returned: 'keyboard-return',
  borrow_completed: 'check-decagram-outline',
  borrow_declined: 'close-circle-outline',
  wishlist_item_added: 'heart-plus-outline',
  member_joined: 'account-plus-outline',
  member_left: 'account-minus-outline',
  item_updated: 'pencil-circle-outline',
  item_removed: 'minus-circle-outline',
  price_alert: 'tag-outline',
};

const ICON_COLORS: Record<string, string> = {
  borrow_requested: '#82602C',
  borrow_approved: '#30A46C',
  borrow_active: '#82602C',
  borrow_returned: '#30A46C',
  borrow_completed: '#30A46C',
  borrow_declined: '#E5484D',
  item_added: '#82602C',
  wishlist_item_added: '#C9A961',
  member_joined: '#30A46C',
  member_left: '#E5484D',
};

function CircleActivitySectionInner({
  activities,
  currentUserId,
  onSeeAll,
  onActivityChanged,
}: CircleActivitySectionProps) {
  const colors = useThemeColors();

  if (activities.length === 0) return null;

  const displayActivities = useMemo(() => activities.slice(0, 6), [activities]);

  const handleMarkReturned = useCallback(async (borrowId: string) => {
    hapticSuccess();
    try {
      await markReturned(borrowId);
      onActivityChanged?.();
    } catch (e: any) {
      Alert.alert('Error', e?.message ?? 'Could not mark as returned.');
    }
  }, [onActivityChanged]);

  return (
    <MotiView
      from={{ opacity: 0, translateY: 12 }}
      animate={{ opacity: 1, translateY: 0 }}
      transition={{ type: 'timing', duration: 450, delay: 160 }}
      style={styles.container}
    >
      <SectionHeader title="Circle Activity" showSeeAll onSeeAll={onSeeAll} />
      <View style={styles.list}>
        {displayActivities.map((activity, idx) => {
          const iconName = ICONS[activity.type] ?? 'bell-outline';
          const iconColor = ICON_COLORS[activity.type] ?? colors.textSecondary;
          const isLast = idx === displayActivities.length - 1;
          const showMarkReturned =
            activity.type === 'borrow_active' &&
            activity.borrow_id &&
            currentUserId !== activity.user_id;

          // Parse the activity text — remove actor name prefix for separate styling
          let tail = activity.summary;
          if (activity.actor_name && tail.startsWith(activity.actor_name)) {
            tail = tail.slice(activity.actor_name.length).trim();
          }

          return (
            <View
              key={activity.id}
              accessible
              accessibilityRole="text"
              accessibilityLabel={`${activity.actor_name} ${tail}, ${formatRelativeTime(activity.created_at).replace(' ago', '')}`}
              style={[
                styles.activityRow,
                !isLast && {
                  borderBottomWidth: StyleSheet.hairlineWidth,
                  borderBottomColor: colors.border,
                },
                showMarkReturned && styles.activityRowWithAction,
              ]}
            >
              <View style={styles.activityMain}>
                <Avatar name={activity.actor_name} size="sm" />
                <Text
                  style={[styles.activityText, { color: colors.textPrimary }]}
                  numberOfLines={1}
                >
                  <Text style={{ fontWeight: '500' }}>{activity.actor_name}</Text>
                  {' '}
                  <Text style={{ color: colors.textSecondary }}>{tail}</Text>
                </Text>
                <Text
                  style={[styles.timestamp, { color: colors.textSecondary }]}
                >
                  {formatRelativeTime(activity.created_at).replace(' ago', '')}
                </Text>
                <View
                  style={[
                    styles.typeIcon,
                    { backgroundColor: `${iconColor}15` },
                  ]}
                >
                  <MaterialCommunityIcons
                    name={iconName as any}
                    size={14}
                    color={iconColor}
                  />
                </View>
              </View>
              {showMarkReturned && (
                <TouchableOpacity
                  onPress={() => handleMarkReturned(activity.borrow_id!)}
                  accessibilityRole="button"
                  accessibilityLabel="Mark returned"
                  accessibilityHint="Mark this borrowed item as returned"
                  hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
                  style={[
                    styles.markReturnedBtn,
                    {
                      backgroundColor: colors.surfaceElevated,
                    },
                  ]}
                >
                  <Text
                    style={[
                      styles.markReturnedText,
                      { color: colors.textPrimary },
                    ]}
                  >
                    Mark Returned?
                  </Text>
                </TouchableOpacity>
              )}
            </View>
          );
        })}
      </View>
    </MotiView>
  );
}

export const CircleActivitySection = memo(CircleActivitySectionInner);

const styles = StyleSheet.create({
  container: {
    marginBottom: 14,
  },
  list: {
    paddingHorizontal: 22,
  },
  activityRow: {
    paddingVertical: 9,
  },
  activityRowWithAction: {
    paddingBottom: 6,
  },
  activityMain: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 9,
  },
  activityText: {
    flex: 1,
    fontFamily: 'Jost',
    fontSize: 12,
    fontWeight: '400',
  },
  timestamp: {
    fontFamily: 'Jost',
    fontSize: 9,
    fontWeight: '300',
    flexShrink: 0,
  },
  typeIcon: {
    width: 22,
    height: 22,
    borderRadius: 11,
    alignItems: 'center',
    justifyContent: 'center',
    flexShrink: 0,
  },
  markReturnedBtn: {
    alignSelf: 'flex-start',
    marginTop: 6,
    paddingVertical: 5,
    paddingHorizontal: 12,
    borderRadius: radius.pill,
  },
  markReturnedText: {
    fontFamily: 'Jost',
    fontSize: 10,
    fontWeight: '500',
  },
});
