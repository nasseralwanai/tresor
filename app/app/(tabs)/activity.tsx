/**
 * Activity Feed - timeline with icons, avatars, item thumbnails.
 * "Mark Returned" on active borrows. "Who Wore It Best" voting card.
 */

import { useState, useCallback, useMemo, useEffect } from "react";
import { TouchableOpacity, View, Text, StyleSheet, ScrollView, RefreshControl } from "react-native";
import { Stack } from "expo-router";
import { MaterialCommunityIcons } from "@expo/vector-icons";
import { useThemeColors, typography, spacing, radius } from "@/theme";
import { Card } from "@/components/Card";
import { Avatar } from "@/components/Avatar";
import { ItemPhotoPlaceholder } from "@/components/ItemPhotoPlaceholder";
import { Skeleton } from "@/components/Skeleton";
import { hapticLight, hapticSuccess } from "@/lib/haptics";
import { getActivityFeed, markReturned } from "@/lib/activity";
import { useCircleId } from "@/hooks/useCircleId";
import { useAuth } from "@/hooks/useAuth";
import { formatRelativeTime, capitalize } from "@/lib/format";
import type { ActivityEntry } from "@/types/items";

const ICONS: Record<string, string> = {
  item_added: "plus-circle-outline", borrow_requested: "hand-coin-outline",
  borrow_approved: "check-circle-outline", borrow_active: "swap-horizontal",
  borrow_returned: "keyboard-return", borrow_completed: "check-decagram-outline",
  borrow_declined: "close-circle-outline", wishlist_item_added: "heart-plus-outline",
  member_joined: "account-plus-outline", member_left: "account-minus-outline",
  item_updated: "pencil-circle-outline", item_removed: "minus-circle-outline",
  price_alert: "tag-outline",
};
const COLORS_MAP: Record<string, string> = {
  borrow_requested: "#C9A961", borrow_approved: "#30A46C", borrow_active: "#C9A961",
  borrow_returned: "#30A46C", borrow_completed: "#30A46C", borrow_declined: "#E5484D",
  item_added: "#C9A961", wishlist_item_added: "#C9A961",
  member_joined: "#30A46C", member_left: "#E5484D",
};

export default function ActivityScreen() {
  const colors = useThemeColors();
  const { user } = useAuth();
  const { circleId } = useCircleId();
  const [activities, setActivities] = useState<ActivityEntry[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [voteSelected, setVoteSelected] = useState<number | null>(null);
  const currentUserId = user?.id ?? '';

  const loadData = useCallback(async () => {
    if (!circleId) { setLoading(false); return; }
    const data = await getActivityFeed(circleId);
    setActivities(data); setLoading(false); setRefreshing(false);
  }, [circleId]);
  useMemo(() => { loadData(); }, []);
  const onRefresh = useCallback(() => { setRefreshing(true); loadData(); }, [loadData]);
  const handleMarkReturned = async (id: string) => { hapticSuccess(); await markReturned(id); loadData(); };

  if (loading) return (<><Stack.Screen options={{ title: "Activity" }} /><View style={[styles.container, { backgroundColor: colors.background }]}><View style={styles.list}>{[1,2,3,4].map((i) => (<Card key={i} style={styles.skeletonCard}><View style={{ flexDirection: "row", alignItems: "center", gap: spacing.md }}><Skeleton width={34} height={34} borderRadius={17} /><View style={{ flex: 1 }}><Skeleton width={200} height={14} style={{ marginBottom: 4 }} /><Skeleton width={60} height={11} /></View></View></Card>))}</View></View></>);
  if (activities.length === 0) return (<><Stack.Screen options={{ title: "Activity" }} /><View style={[styles.container, { backgroundColor: colors.background, alignItems: "center", justifyContent: "center" }]}><MaterialCommunityIcons name="bell-outline" size={48} color={colors.textSecondary} /><Text style={[styles.emptyText, { color: colors.textSecondary }]}>No Activity Yet</Text><Text style={[styles.emptySub, { color: colors.textSecondary }]}>Borrow requests, new items, and returns will show here</Text></View></>);

  return (
    <>
      <Stack.Screen options={{ title: "Activity" }} />
      <View style={[styles.container, { backgroundColor: colors.background }]}>
        <ScrollView showsVerticalScrollIndicator={false} refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={colors.accent} />}>
          <View style={styles.list}>
            <Card style={styles.voteCard}>
              <View style={styles.voteHeader}><MaterialCommunityIcons name="trophy-outline" size={20} color={colors.accent} /><Text style={[styles.voteTitle, { color: colors.textPrimary }]}>Who Wore It Best?</Text></View>
              <Text style={[styles.voteSub, { color: colors.textSecondary }]}>Vote for this week's best styled item</Text>
              <View style={styles.voteRow}>
                {[{n:"Sarah",b:"Chanel",v:12},{n:"Mona",b:"Dior",v:8},{n:"Lina",b:"Gucci",v:5}].map((c, idx) => (
                  <TouchableOpacity key={idx} onPress={() => { hapticLight(); setVoteSelected(idx); }} style={[styles.voteItem, { backgroundColor: voteSelected === idx ? colors.accent : colors.surfaceElevated, borderColor: voteSelected === idx ? colors.accent : "transparent" }]}>
                    <ItemPhotoPlaceholder letter={c.b} size={54} style={styles.votePhoto} />
                    <Text style={[styles.voteName, { color: voteSelected === idx ? colors.charcoal : colors.textPrimary }]}>{c.n}</Text>
                    <Text style={[styles.voteBrand, { color: voteSelected === idx ? colors.charcoal : colors.accent }]}>{c.v} votes</Text>
                  </TouchableOpacity>
                ))}
              </View>
            </Card>
            {activities.map((a) => {
              const iconName = ICONS[a.type] ?? "bell-outline";
              const iconColor = COLORS_MAP[a.type] ?? colors.textSecondary;
              const showRet = a.type === "borrow_active" && a.borrow_id && currentUserId !== a.user_id;
              return (
                <Card key={a.id} style={styles.activityCard}>
                  <View style={styles.activityTop}>
                    <Avatar name={a.actor_name} size="sm" />
                    <View style={{ flex: 1 }}>
                      <Text style={[styles.activityBody, { color: colors.textPrimary }]}><Text style={[styles.actorName, { color: colors.textPrimary }]}>{a.actor_name}</Text> {a.summary.replace(a.actor_name, "").trim()}</Text>
                      <Text style={[styles.activityTime, { color: colors.textSecondary }]}>{formatRelativeTime(a.created_at)}</Text>
                    </View>
                    <View style={[styles.activityIcon, { backgroundColor: `${iconColor}15` }]}><MaterialCommunityIcons name={iconName as any} size={18} color={iconColor} /></View>
                  </View>
                  {a.item_brand && (
                    <View style={[styles.miniItem, { backgroundColor: colors.surfaceElevated }]}>
                      <ItemPhotoPlaceholder letter={a.item_brand} size={42} style={styles.miniPhoto} />
                      <View style={{ flex: 1 }}><Text style={[styles.miniBrand, { color: colors.textPrimary }]} numberOfLines={1}>{a.item_brand}</Text><Text style={[styles.miniType, { color: colors.textSecondary }]}>{capitalize(a.type.replace(/_/g, " "))}</Text></View>
                    </View>
                  )}
                  {showRet && <TouchableOpacity onPress={() => handleMarkReturned(a.borrow_id!)} style={[styles.markReturnedBtn, { backgroundColor: colors.accent }]}><MaterialCommunityIcons name="check" size={16} color={colors.charcoal} /><Text style={[styles.markReturnedText, { color: colors.charcoal }]}>Mark Returned</Text></TouchableOpacity>}
                </Card>
              );
            })}
          </View>
          <View style={{ height: spacing.xl }} />
        </ScrollView>
      </View>
    </>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  list: { paddingHorizontal: spacing.lg + 6, paddingTop: spacing.md, gap: spacing.sm + 2 },
  activityCard: { gap: spacing.sm },
  activityTop: { flexDirection: "row", alignItems: "flex-start", gap: spacing.sm + 2 },
  actorName: { ...typography.bodyEmphasized, fontSize: 13 },
  activityBody: { ...typography.body, fontSize: 13, lineHeight: 18 },
  activityTime: { ...typography.caption2, fontSize: 11, marginTop: 2 },
  activityIcon: { width: 30, height: 30, borderRadius: 15, alignItems: "center", justifyContent: "center", flexShrink: 0 },
  miniItem: { flexDirection: "row", alignItems: "center", gap: spacing.sm + 2, borderRadius: radius.sm, padding: spacing.sm + 2 },
  miniPhoto: { borderRadius: radius.sm },
  miniBrand: { ...typography.bodyEmphasized, fontSize: 13 },
  miniType: { ...typography.caption2, fontSize: 10, marginTop: 1 },
  markReturnedBtn: { flexDirection: "row", alignItems: "center", justifyContent: "center", gap: spacing.sm, height: 40, borderRadius: radius.pill, marginTop: 2 },
  markReturnedText: { ...typography.bodyEmphasized, fontSize: 14 },
  emptyText: { ...typography.title3, marginTop: spacing.md },
  emptySub: { ...typography.body, fontSize: 14, marginTop: spacing.xs, textAlign: "center", paddingHorizontal: spacing.xl },
  skeletonCard: { padding: spacing.md },
  voteCard: { marginBottom: spacing.sm },
  voteHeader: { flexDirection: "row", alignItems: "center", gap: spacing.sm, marginBottom: 4 },
  voteTitle: { ...typography.bodyEmphasized, fontSize: 15 },
  voteSub: { ...typography.caption1, fontSize: 12, marginBottom: spacing.md },
  voteRow: { flexDirection: "row", gap: spacing.sm },
  voteItem: { flex: 1, alignItems: "center", borderRadius: radius.md, padding: spacing.sm, borderWidth: 2 },
  votePhoto: { borderRadius: radius.sm, marginBottom: 6 },
  voteName: { ...typography.caption2, fontSize: 11, fontWeight: "500" },
  voteBrand: { ...typography.caption2, fontSize: 10, fontWeight: "600", marginTop: 2 },
});
