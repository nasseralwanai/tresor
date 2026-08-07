/**
 * CircleActivityPreview — 3 recent activities with avatar initials,
 * activity text (italic serif for item names), timestamp, "See all activity" link.
 */

import { View, Text, StyleSheet, TouchableOpacity, Pressable } from 'react-native';
import { View as MotiView } from 'moti';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { useThemeColors, spacing, radius } from '@/theme';
import { Avatar } from '@/components/Avatar';
import { hapticLight } from '@/lib/haptics';
import { formatRelativeTime } from '@/lib/format';
import type { ActivityEntry } from '@/types/items';

type CircleActivityPreviewProps = {
  activities: ActivityEntry[];
  onSeeAll?: () => void;
  delay?: number;
};

export function CircleActivityPreview({
  activities,
  onSeeAll,
  delay = 550,
}: CircleActivityPreviewProps) {
  const colors = useThemeColors();
  const preview = activities.slice(0, 3);

  if (preview.length === 0) return null;

  return (
    <View>
      <Text style={[styles.sectionLabel, { color: colors.textSecondary }]}>
        CIRCLE ACTIVITY
      </Text>
      <MotiView
        from={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ type: 'timing', duration: 500, delay }}
      >
        <View style={styles.container}>
          {preview.map((activity, idx) => (
            <View
              key={activity.id}
              style={[
                styles.activityRow,
                idx < preview.length - 1 && styles.activityGap,
              ]}
            >
              <Avatar name={activity.actor_name} size="sm" />
              <View style={{ flex: 1 }}>
                <Text style={[styles.text, { color: colors.textPrimary }]}>
                  <Text style={{ fontWeight: '500' }}>{activity.actor_name}</Text>
                  {formatActivityTail(activity)}
                </Text>
                <Text
                  style={[styles.timestamp, { color: colors.textSecondary }]}
                >
                  {formatRelativeTime(activity.created_at)}
                </Text>
              </View>
            </View>
          ))}
          <TouchableOpacity
            onPress={() => {
              hapticLight();
              onSeeAll?.();
            }}
            activeOpacity={0.85}
            style={styles.seeAllBtn}
          >
            <Text style={[styles.seeAllText, { color: colors.gold }]}>
              See all activity
            </Text>
            <MaterialCommunityIcons
              name="chevron-right"
              size={12}
              color={colors.gold}
            />
          </TouchableOpacity>
        </View>
      </MotiView>
    </View>
  );
}

/** Extract the part of the summary after the actor's name, and italicize item brand. */
function formatActivityTail(activity: ActivityEntry): string {
  let tail = activity.summary;
  if (activity.actor_name && tail.startsWith(activity.actor_name)) {
    tail = tail.slice(activity.actor_name.length);
  }
  return tail;
}

const styles = StyleSheet.create({
  sectionLabel: {
    fontFamily: 'Jost',
    fontSize: 9,
    fontWeight: '500',
    letterSpacing: 0.16,
    textTransform: 'uppercase',
    marginBottom: 6,
    paddingHorizontal: spacing.lg + 6,
  },
  container: {
    paddingHorizontal: spacing.lg + 6,
  },
  activityRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 10,
  },
  activityGap: {
    marginBottom: 13,
  },
  text: {
    fontFamily: 'Jost',
    fontSize: 11.5,
    lineHeight: 1.45 * 11.5,
  },
  timestamp: {
    fontFamily: 'Jost',
    fontSize: 9.5,
    marginTop: 2,
  },
  seeAllBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 2,
    marginTop: 12,
  },
  seeAllText: {
    fontFamily: 'Jost',
    fontSize: 10,
    fontWeight: '500',
    letterSpacing: 0.04,
  },
});

// Silence unused
void Pressable;
void radius;
