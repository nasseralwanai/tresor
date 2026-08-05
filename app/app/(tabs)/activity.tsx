/**
 * Activity Feed — timeline of activities with icons, user avatars, item thumbnails.
 * "Mark Returned" action button on active borrow items.
 * "Who Wore It Best" voting card when applicable.
 * Timestamps.
 */

import { useState, useCallback, useMemo } from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity, RefreshControl } from 'react-native';
import { Stack } from 'expo-router';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { useThemeColors, typography, spacing, radius } from '@/theme';
import { Card } from '@/components/Card';
import { Avatar } from '@/components/Avatar';
import { ItemPhotoPlaceholder } from '@/components/ItemPhotoPlaceholder';
import { Skeleton } from '@/components/Skeleton';
import { hapticLight, hapticSuccess } from '@/lib/haptics';
import { getActivityFeed, markReturned, getCurrentUser } from '@/lib/mockApi';
import { formatRelativeTime, capitalize } from '@/lib/format';
import type { ActivityEntry } from '@/types/items';

const ACTIVITY_ICONS: Record<string, string> = {
  item_added: 'plus-circle-outline',
  item_updated: 'pencil-circle-outline',
  item_removed: 'minus-circle-outline',
  borrow_requested: 'hand-coin-outline',
  borrow_approved: 'check-circle-outline',
  borrow_active: 'swap-horizontal',
  borrow_returned: 'keyboard-return',
  borrow_completed: 'check-decagram-outline',
  borrow_declined: 'close-circle-outline',
  wishlist_item_added: 'heart-plus-outline',
  price_alert: 'tag-outline',
  member_joined: 'account-plus-outline',
  member_left: 'account-minus-outline',
};

const ACTIVITY_COLORS: Record<string, string> = {
  borrow_requested: '#C9A961', borrow_approved: '#30A46C', borrow_active: '#C9A961',
  borrow_returned: '#30A46C', borrow_completed: '#30A46C', borrow_declined: '#E5484D',
  item_added: '#C9A961', wishlist_item_added: '#C9A961',
  member_joined: '#30A46C', member_left: '#E5484D',
};

export default function ActivityScreen() {
  const colors = useThemeColors();
  const [activities, setActivities] = useState<ActivityEntry[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [voteSelected, setVoteSelected] = useState<number | null>(null);
  const currentUser = useMemo(() => getCurrentUser(), []);

  const loadData = useCallback(async () => {
    const data = await getActivityFeed();
    setActivities(data);
    setLoading(false);
    setRefreshing(false);
  }, []);

  useMemo(() => { loadData(); }, []);

  const onRefresh = useCallback(() => { setRefreshing(true); loadData(); }, [loadData]);

  const handleMarkReturned = async (borrowId: string) => {
    hapticSuccess();
    await markReturned(borrowId);
    loadData();
  };

  if (loading) {
    return (
      <>
        <Stack.Screen options={{ title: 'Activity' }} />
        <View style={[styles.container, { backgroundColor: colors.background }]}>
          <View style={styles.list}>
            {[1, 2, 3, 4].map((i) => (
              <Card key={i} style={styles.skeletonCard}>
                <View style={{ flexDirection: 'row', alignItems: 'center', gap: spacing.md }}>
                  <Skeleton width={34} height={34} borderRadius={17} />
                  <View style={{ flex: 1 }}>
                    <Skeleton width={200} height={14} style={{ marginBottom: 4 }} />
                    <Skeleton width={60} height={11} />
                  </View>
                </View>
              </Card>
            ))}
          </View>
        </View>
      </>
    );
  }

  if (activities.length === 0) {
    return (
      <>
        <Stack.Screen options={{ title: 'Activity' }} />
        <View style={[styles.container, { backgroundColor: colors.background, alignItems: 'center', justifyContent: 'center' }]}>
          <MaterialCommunityIcons name="bell-outline" size={48} color={colors.textSecondary} />
          <Text style={[styles.emptyText, { color: colors.textSecondary }]}>No Activity Yet</Text>
          <Text style={[styles.emptySub, { color: colors.textSecondary }]}>
            Borrow requests, new items, and returns will show here
          </Text>
        </View>
      </>
    );
  }

  return (
    <>
      <Stack.Screen options={{ title: 'Activity' }} />
      <View style={[styles.container, { backgroundColor: colors.background }]}>
        <ScrollView
          showsVerticalScrollIndicator={false}
          refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={colors.accent} />}
        >
          <View style={styles.list}>
            <WhoWoreItBestCard voteSelected={voteSelected} onVote={(idx) => { hapticLight(); setVoteSelected(idx); }} />
            {activities.map((activity) => (
              <ActivityCard
                key={activity.id}
                activity={activity}
                isMyItem={activity.item_id != null && currentUser.id !== activity.user_id}
                onMarkReturned={handleMarkReturned}
              />
            ))}
          </View>
          <View style={{ height: spacing.xl }} />
        </ScrollView>
      </View>
    </>
  );
}

function ActivityCard({ activity, isMyItem, onMarkReturned }: {
  activity: ActivityEntry; isMyItem: boolean; onMarkReturned: (id: string) => void;
}) {
  const colors = useThemeColors();
  const iconName = ACTIVITY_ICONS[activity.type] ?? 'bell-outline';
  const iconColor = ACTIVITY_COLORS[activity.type] ?? colors.textSecondary;
  const showMarkReturned = activity.type === 'borrow_active' && activity.borrow_id && isMyItem;

  return (
    <Card style={styles.activityCard}>
      <View style={styles.activityTop}>
        <Avatar name={activity.actor_name} size="sm" />
        <View style={{ flex: 1 }}>
          <Text style={[styles.activityBody, { color: colors.textPrimary }]}>
            <Text style={[styles.actorName, { color: colors.textPrimary }]}>{activity.actor_name}</Text>
            {' '}{activity.summary.replace(activity.actor_name, '').trim()}
          </Text>
          <Text style={[styles.activityTime, { color: colors.textSecondary }]}>
            {formatRelativeTime(activity.created_at)}
          </Text>
        </View>
        <View style={[styles.activityIcon, { backgroundColor: `${iconColor}15` }]}>
          <MaterialCommunityIcons name={iconName as any} size={18} color={iconColor} />
        </View>
      </View>

      {activity.item_brand && (
        <View style={[styles.miniItem, { backgroundColor: colors.surfaceElevated }]}>
          <ItemPhotoPlaceholder letter={activity.item_brand} size={42} style={styles.miniPhoto} />
          <View style={{ flex: 1 }}>
            <Text style={[styles.miniBrand, { color: colors.textPrimary }]} numberOfLines={1}>{activity.item_brand}</Text>
            <Text style={[styles.miniType, { color: colors.textSecondary }]}>{capitalize(activity.type.replace(/_/g, ' '))}</Text>
          </View>
        </View>
      )}

      {showMarkReturned && (
        <TouchableOpacity
          onPress={() => onMarkReturned(activity.borrow_id!)}
          style={[styles.markReturnedBtn, { backgroundColor: colors.accent }]}
        >
          <MaterialCommunityIcons name="check" size={16} color={colors.charcoal} />
          <Text style={[styles.markReturnedText, { color: colors.charcoal }]}>Mark Returned</Text>
        </TouchableOpacity>
      )}
    </Card>
  );
}

function WhoWoreItBestCard({ voteSelected, onVote }: { voteSelected: number | null; onVote: (idx: number) => void }) {
  const colors = useThemeColors();
  const candidates = [
    { name: 'Sarah', brand: 'Chanel', votes: 12 },
    { name: 'Mona', brand: 'Dior', votes: 8 },
    { name: 'Lina', brand: 'Gucci', votes: 5 },
  ];
  return (
    <Card style={styles.voteCard}>
      <View style={styles.voteHeader}>
        <MaterialCommunityIcons name="trophy-outline" size={20} color={colors.accent} />
        <Text style={[styles.voteTitle, { color: colors.textPrimary }]}>Who Wore It Best?</Text>
      </View>
      <Text style={[styles.voteSub, { color: colors.textSecondary }]}>Vote for this week's best styled item</Text>
      <View style={styles.voteRow}>
        {candidates.map((candidate, idx) => (
          <TouchableOpacity
            key={idx}
            onPress={() => onVote(idx)}
            style={[styles.voteItem, {
              backgroundColor: voteSelected === idx ? colors.accent : colors.surfaceElevated,
              borderColor: voteSelected === idx ? colors.accent : 'transparent',
            }]}
          >
            <ItemPhotoPlaceholder letter={candidate.brand} size={54} style={styles.votePhoto} />
            <Text style={[styles.voteName, { color: voteSelected === idx ? colors.charcoal : colors.textPrimary }]}>{candidate.name}</Text>
            <Text style={[styles.voteBrand, { color: voteSelected === idx ? colors.charcoal : colors.accent }]}>{candidate.votes} votes</Text>
          </TouchableOpacity>
        ))}
      </View>
    </Card>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  list: { paddingHorizontal: spacing.lg + 6, paddingTop: spacing.md, gap: spacing.sm + 2 },
  activityCard: { gap: spacing.sm },
  activityTop: { flexDirection: 'row', alignItems: 'flex-start', gap: spacing.sm + 2 },
  actorName: { ...typography.bodyEmphasized, fontSize: 13 },
  activityBody: { ...typography.body, fontSize: 13, lineHeight: 18 },
  activityTime: { ...typography.caption2, fontSize: 11, marginTop: 2 },
  activityIcon: { width: 30, height: 30, borderRadius: 15, alignItems: 'center', justifyContent: 'center', flexShrink: 0 },
  miniItem: { flexDirection: 'row', alignItems: 'center', gap: spacing.sm + 2, borderRadius: radius.sm, padding: spacing.sm + 2 },
  miniPhoto: { borderRadius: radius.sm },
  miniBrand: { ...typography.bodyEmphasized, fontSize: 13 },
  miniType: { ...typography.caption2, fontSize: 10, marginTop: 1 },
  markReturnedBtn: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: spacing.sm,
    height: 40, borderRadius: radius.pill, marginTop: 2,
  },
  markReturnedText: { ...typography.bodyEmphasized, fontSize: 14 },
  emptyText: { ...typography.title3, marginTop: spacing.md },
  emptySub: { ...typography.body, fontSize: 14, marginTop: spacing.xs, textAlign: 'center', paddingHorizontal: spacing.xl },
  skeletonCard: { padding: spacing.md },
  voteCard: { marginBottom: spacing.sm },
  voteHeader: { flexDirection: 'row', alignItems: 'center', gap: spacing.sm, marginBottom: 4 },
  voteTitle: { ...typography.bodyEmphasized, fontSize: 15 },
  voteSub: { ...typography.caption1, fontSize: 12, marginBottom: spacing.md },
  voteRow: { flexDirection: 'row', gap: spacing.sm },
  voteItem: { flex: 1, alignItems: 'center', borderRadius: radius.md, padding: spacing.sm, borderWidth: 2 },
  votePhoto: { borderRadius: radius.sm, marginBottom: 6 },
  voteName: { ...typography.caption2, fontSize: 11, fontWeight: '500' },
  voteBrand: { ...typography.caption2, fontSize: 10, fontWeight: '600', marginTop: 2 },
});
