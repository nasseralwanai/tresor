/**
 * Activity screen — shows the activity feed for the user's circle.
 * Fetches recent activity entries ordered by created_at desc.
 */

import { useState, useEffect, useCallback } from 'react';
import {
  View, Text, StyleSheet, FlatList, RefreshControl,
} from 'react-native';
import { Stack } from 'expo-router';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useThemeColors, typography, spacing, radius } from '@/theme';
import { EmptyState } from '@/components/EmptyState';
import { useCircleId } from '@/hooks/useCircleId';
import { getActivityFeed } from '@/lib/activity';
import type { ActivityEntry } from '@/types';

export default function ActivityScreen() {
  const colors = useThemeColors();
  const { circleId, loading: circleLoading } = useCircleId();
  const [activities, setActivities] = useState<ActivityEntry[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  const fetchActivities = useCallback(async () => {
    if (!circleId) { setLoading(false); return; }
    try {
      const data = await getActivityFeed(circleId);
      setActivities(data);
    } catch (e) {
      console.error('[Activity] Failed to fetch feed:', e);
    } finally {
      setLoading(false); setRefreshing(false);
    }
  }, [circleId]);

  useEffect(() => { fetchActivities(); }, [fetchActivities]);
  const onRefresh = () => { setRefreshing(true); fetchActivities(); };

  if (!circleLoading && !loading && activities.length === 0) {
    return (
      <>
        <Stack.Screen options={{ title: 'Activity' }} />
        <View style={[styles.container, { backgroundColor: colors.background }]}>
          <EmptyState icon="bell-outline" title="No Activity Yet" subtitle="Borrow requests, new items, and returns will show here" />
        </View>
      </>
    );
  }

  const renderItem = ({ item }: { item: ActivityEntry }) => (
    <View style={[styles.activityCard, { backgroundColor: colors.surface }]}>
      <View style={[styles.activityIcon, { backgroundColor: colors.surfaceElevated }]}>
        <MaterialCommunityIcons name={getActivityIcon(item.type) as any} size={20} color={colors.accent} />
      </View>
      <View style={styles.activityInfo}>
        <Text style={[styles.activitySummary, { color: colors.textPrimary }]}>{item.summary ?? 'Activity'}</Text>
        <Text style={[styles.activityTime, { color: colors.textSecondary }]}>{formatTime(item.created_at)}</Text>
      </View>
    </View>
  );

  return (
    <>
      <Stack.Screen options={{ title: 'Activity' }} />
      <SafeAreaView style={[styles.container, { backgroundColor: colors.background }]} edges={['bottom']}>
        <FlatList
          data={activities}
          keyExtractor={(item) => item.id}
          renderItem={renderItem}
          contentContainerStyle={styles.list}
          refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={colors.accent} />}
        />
      </SafeAreaView>
    </>
  );
}

function getActivityIcon(type: string): string {
  switch (type) {
    case 'item_added': return 'plus-circle-outline';
    case 'item_updated': return 'pencil-outline';
    case 'item_removed': return 'minus-circle-outline';
    case 'borrow_requested': return 'hand-extended-outline';
    case 'borrow_approved': return 'check-circle-outline';
    case 'borrow_active': return 'swap-horizontal';
    case 'borrow_returned': return 'keyboard-return';
    case 'borrow_completed': return 'check-decagram-outline';
    case 'borrow_declined': return 'close-circle-outline';
    case 'wishlist_item_added': return 'heart-outline';
    case 'price_alert': return 'tag-outline';
    case 'member_joined': return 'account-plus-outline';
    case 'member_left': return 'account-minus-outline';
    default: return 'bell-outline';
  }
}

function formatTime(iso: string): string {
  const date = new Date(iso);
  const now = new Date();
  const diffMs = now.getTime() - date.getTime();
  const diffMins = Math.floor(diffMs / 60000);
  const diffHours = Math.floor(diffMs / 3600000);
  const diffDays = Math.floor(diffMs / 86400000);
  if (diffMins < 1) return 'Just now';
  if (diffMins < 60) return `${diffMins}m ago`;
  if (diffHours < 24) return `${diffHours}h ago`;
  if (diffDays < 7) return `${diffDays}d ago`;
  return date.toLocaleDateString();
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  list: { padding: spacing.lg, gap: spacing.sm },
  activityCard: { flexDirection: 'row', alignItems: 'center', padding: spacing.md, borderRadius: radius.lg, gap: spacing.md },
  activityIcon: { width: 40, height: 40, borderRadius: 20, alignItems: 'center', justifyContent: 'center' },
  activityInfo: { flex: 1 },
  activitySummary: { ...typography.body, fontSize: 15, marginBottom: 2 },
  activityTime: { ...typography.caption1 },
});
