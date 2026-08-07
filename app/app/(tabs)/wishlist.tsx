/**
 * Wishlist Screen - two tabs: "My Wishlist" and "Friends' Dreams".
 * My Wishlist: items with savings progress bars, target price, "Drop Hint" button.
 * Friends' Dreams: circle members' wishlist items with react/comment capability.
 */

import { useState, useCallback, useMemo, useEffect } from "react";
import { View, Text, StyleSheet, TouchableOpacity, FlatList, Modal, TextInput, RefreshControl, Alert } from "react-native";
import { Stack } from "expo-router";
import { MaterialCommunityIcons } from "@expo/vector-icons";
import { useThemeColors, typography, spacing, radius } from "@/theme";
import { Card } from "@/components/Card";
import { Avatar } from "@/components/Avatar";
import { ItemPhotoPlaceholder } from "@/components/ItemPhotoPlaceholder";
import { PrimaryButton } from "@/components/PrimaryButton";
import { Skeleton } from "@/components/Skeleton";
import { hapticLight, hapticSuccess } from "@/lib/haptics";
import { getMyWishlist, getFriendsWishlist, createWishlistItem } from "@/lib/wishlist";
import { formatCurrency, formatRelativeTime } from "@/lib/format";
import { useAuth } from "@/hooks/useAuth";
import { useCircleId } from "@/hooks/useCircleId";
import type { WishlistItem } from "@/types/items";

type Tab = "mine" | "friends";

export default function WishlistScreen() {
  const colors = useThemeColors();
  const { user } = useAuth();
  const { circleId } = useCircleId();
  const [tab, setTab] = useState<Tab>("mine");
  const [myItems, setMyItems] = useState<WishlistItem[]>([]);
  const [friendItems, setFriendItems] = useState<WishlistItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [showAddModal, setShowAddModal] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const loadData = useCallback(async () => {
    if (!user?.id) { setLoading(false); return; }
    try {
      setError(null);
      const [mine, friends] = await Promise.all([
        getMyWishlist(user.id),
        circleId ? getFriendsWishlist(user.id, circleId) : Promise.resolve([]),
      ]);
      setMyItems(mine); setFriendItems(friends);
    } catch (e: any) {
      console.error('[wishlist] loadData error:', e);
      setError(e?.message ?? 'Something went wrong. Pull to retry.');
    } finally {
      setLoading(false); setRefreshing(false);
    }
  }, [user?.id, circleId]);
  useEffect(() => { loadData(); }, [loadData]);
  const onRefresh = useCallback(() => { setRefreshing(true); loadData(); }, [loadData]);

  if (error && !loading) {
    return (
      <>
        <Stack.Screen options={{ title: "Wishlist" }} />
        <View style={[styles.container, { backgroundColor: colors.background, alignItems: 'center', justifyContent: 'center' }]}>
          <Text style={{ color: colors.textSecondary, marginBottom: spacing.md }}>{error}</Text>
          <TouchableOpacity onPress={loadData} style={{ paddingHorizontal: spacing.lg, paddingVertical: spacing.sm, backgroundColor: colors.surface, borderRadius: radius.md }}>
            <Text style={{ color: colors.accent }}>Retry</Text>
          </TouchableOpacity>
        </View>
      </>
    );
  }

  return (
    <>
      <Stack.Screen options={{ title: "Wishlist" }} />
      <View style={[styles.container, { backgroundColor: colors.background }]}>
        <View style={[styles.tabBar, { backgroundColor: colors.surfaceElevated }]}>
          <TouchableOpacity onPress={() => { hapticLight(); setTab("mine"); }} style={[styles.tab, { backgroundColor: tab === "mine" ? colors.surface : "transparent" }]}><Text style={[styles.tabText, { color: tab === "mine" ? colors.textPrimary : colors.textSecondary }]}>My Wishlist</Text></TouchableOpacity>
          <TouchableOpacity onPress={() => { hapticLight(); setTab("friends"); }} style={[styles.tab, { backgroundColor: tab === "friends" ? colors.surface : "transparent" }]}><Text style={[styles.tabText, { color: tab === "friends" ? colors.textPrimary : colors.textSecondary }]}>Friends' Dreams</Text></TouchableOpacity>
        </View>
        <FlatList data={tab === "mine" ? myItems : friendItems} keyExtractor={(item) => item.id} contentContainerStyle={styles.list} showsVerticalScrollIndicator={false} refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={colors.accent} />}
          ListEmptyComponent={loading ? (<View style={{ gap: spacing.md, padding: spacing.lg + 6 }}>{[1,2].map((i) => (<Card key={i}><Skeleton width={150} height={16} style={{ marginBottom: 8 }} /><Skeleton width={100} height={12} style={{ marginBottom: 12 }} /><Skeleton width="100%" height={6} borderRadius={3} /></Card>))}</View>) : (<View style={styles.emptyState}><MaterialCommunityIcons name="heart-outline" size={48} color={colors.textSecondary} /><Text style={[styles.emptyTitle, { color: colors.textSecondary }]}>{tab === "mine" ? "No wishlist items yet" : "No dreams to share"}</Text></View>)}
          renderItem={({ item }) => tab === "mine" ? <MyCard item={item} /> : <FriendCard item={item} />}
        />
        {tab === "mine" && <TouchableOpacity onPress={() => { hapticLight(); setShowAddModal(true); }} style={[styles.fab, { backgroundColor: colors.accent }]}><MaterialCommunityIcons name="plus" size={28} color={colors.charcoal} /></TouchableOpacity>}
        <AddModal visible={showAddModal} onClose={() => setShowAddModal(false)} onAdded={() => loadData()} />
      </View>
    </>
  );
}

function MyCard({ item }: { item: WishlistItem }) {
  const colors = useThemeColors();
  const progress = item.target_price ? Math.min((item.current_savings / item.target_price) * 100, 100) : 0;
  return (
    <Card style={styles.wishlistCard}>
      <View style={styles.wishlistHeader}>
        <View style={{ flex: 1 }}>
          <Text style={[styles.wishlistBrand, { color: colors.accent }]}>{item.brand.toUpperCase()}</Text>
          <Text style={[styles.wishlistModel, { color: colors.textPrimary }]} numberOfLines={1}>{item.model_name || "—"}</Text>
        </View>
        {item.fulfilled && <View style={[styles.fulfilledBadge, { backgroundColor: "rgba(48,164,108,0.10)" }]}><MaterialCommunityIcons name="check" size={12} color={colors.success} /><Text style={[styles.fulfilledText, { color: colors.success }]}>Fulfilled</Text></View>}
      </View>
      {item.target_price && (
        <View style={styles.progressSection}>
          <View style={styles.progressInfo}><Text style={[styles.progressSaved, { color: colors.accent }]}>{formatCurrency(item.current_savings, item.currency)}</Text><Text style={[styles.progressTarget, { color: colors.textSecondary }]}>of {formatCurrency(item.target_price, item.currency)}</Text></View>
          <View style={[styles.progressBar, { backgroundColor: colors.border }]}><View style={[styles.progressFill, { backgroundColor: colors.accent, width: `${progress}%` }]} /></View>
          <Text style={[styles.progressPct, { color: colors.textSecondary }]}>{progress.toFixed(0)}% saved</Text>
        </View>
      )}
      {item.notes && <Text style={[styles.wishlistNotes, { color: colors.textSecondary }]} numberOfLines={2}>{item.notes}</Text>}
      <View style={styles.wishlistActions}>
        <TouchableOpacity onPress={() => { hapticLight(); Alert.alert('Coming Soon', 'This feature will be available in a future update.'); }} style={[styles.actionBtn, { borderColor: colors.border }]}><MaterialCommunityIcons name="bell-outline" size={14} color={colors.textPrimary} /><Text style={[styles.actionBtnText, { color: colors.textPrimary }]}>Drop Hint</Text></TouchableOpacity>
        <TouchableOpacity onPress={() => { hapticLight(); Alert.alert('Coming Soon', 'This feature will be available in a future update.'); }} style={[styles.actionBtn, { borderColor: colors.border }]}><MaterialCommunityIcons name="pencil-outline" size={14} color={colors.textPrimary} /><Text style={[styles.actionBtnText, { color: colors.textPrimary }]}>Edit</Text></TouchableOpacity>
      </View>
    </Card>
  );
}

function FriendCard({ item }: { item: WishlistItem }) {
  const colors = useThemeColors();
  const [reacted, setReacted] = useState(false);
  const [showComment, setShowComment] = useState(false);
  const [comment, setComment] = useState("");
  return (
    <Card style={styles.wishlistCard}>
      <View style={styles.friendHeader}><Avatar name={item.owner_name} size="sm" /><View style={{ flex: 1 }}><Text style={[styles.friendName, { color: colors.textPrimary }]}>{item.owner_name}</Text><Text style={[styles.friendTime, { color: colors.textSecondary }]}>{formatRelativeTime(item.created_at)}</Text></View></View>
      <View style={styles.friendItemRow}><ItemPhotoPlaceholder letter={item.brand} size={56} style={styles.friendPhoto} /><View style={{ flex: 1 }}><Text style={[styles.friendBrand, { color: colors.accent }]}>{item.brand.toUpperCase()}</Text><Text style={[styles.friendModel, { color: colors.textPrimary }]} numberOfLines={1}>{item.model_name || "—"}</Text>{item.target_price && <Text style={[styles.friendPrice, { color: colors.textSecondary }]}>Target: {formatCurrency(item.target_price, item.currency)}</Text>}</View></View>
      {item.notes && <Text style={[styles.friendNotes, { color: colors.textSecondary }]}>{item.notes}</Text>}
      <View style={styles.friendActions}>
        <TouchableOpacity onPress={() => { hapticLight(); setReacted(!reacted); Alert.alert('Coming Soon', 'Reactions will be shared with your circle soon.'); }} style={styles.friendAction}><MaterialCommunityIcons name={reacted ? "heart" : "heart-outline"} size={16} color={reacted ? colors.accent : colors.textSecondary} /><Text style={[styles.friendActionText, { color: reacted ? colors.accent : colors.textSecondary }]}>React</Text></TouchableOpacity>
        <TouchableOpacity onPress={() => { hapticLight(); setShowComment(!showComment); }} style={styles.friendAction}><MaterialCommunityIcons name="comment-outline" size={16} color={colors.textSecondary} /><Text style={[styles.friendActionText, { color: colors.textSecondary }]}>Comment</Text></TouchableOpacity>
      </View>
      {showComment && <View style={[styles.commentBox, { backgroundColor: colors.surfaceElevated }]}><TextInput style={[styles.commentInput, { color: colors.textPrimary }]} value={comment} onChangeText={setComment} placeholder="Write a comment..." placeholderTextColor={colors.textSecondary} /><TouchableOpacity onPress={() => { hapticSuccess(); Alert.alert('Coming Soon', 'Comments will be available soon.'); setComment(""); setShowComment(false); }}><MaterialCommunityIcons name="send" size={20} color={colors.accent} /></TouchableOpacity></View>}
    </Card>
  );
}

function AddModal({ visible, onClose, onAdded }: { visible: boolean; onClose: () => void; onAdded: () => void }) {
  const colors = useThemeColors();
  const { user } = useAuth();
  const [brand, setBrand] = useState(""); const [model, setModel] = useState("");
  const [targetPrice, setTargetPrice] = useState(""); const [notes, setNotes] = useState("");
  const [isPrivate, setIsPrivate] = useState(false); const [submitting, setSubmitting] = useState(false);
  const handleSubmit = async () => {
    if (!brand.trim() || !user?.id) return;
    setSubmitting(true);
    try {
      await createWishlistItem({ userId: user.id, brand: brand.trim(), model_name: model.trim() || null, target_price: targetPrice ? parseFloat(targetPrice) : null, notes: notes.trim() || null, is_private: isPrivate });
      hapticSuccess();
      setBrand(""); setModel(""); setTargetPrice(""); setNotes(""); setIsPrivate(false);
      onAdded(); onClose();
    } catch (e: any) {
      Alert.alert('Error', e?.message ?? 'Could not add wishlist item.');
    } finally {
      setSubmitting(false);
    }
  };
  return (
    <Modal visible={visible} transparent animationType="slide" onRequestClose={onClose}>
      <TouchableOpacity style={styles.modalOverlay} activeOpacity={1} onPress={onClose}>
        <View style={[styles.modalSheet, { backgroundColor: colors.surface }]} onStartShouldSetResponder={() => true}>
          <Text style={[styles.modalTitle, { color: colors.textPrimary }]}>Add to Wishlist</Text>
          <View style={styles.modalField}><Text style={[styles.fieldLabel, { color: colors.textSecondary }]}>BRAND *</Text><TextInput style={[styles.modalInput, { backgroundColor: colors.surfaceElevated, color: colors.textPrimary }]} value={brand} onChangeText={setBrand} placeholder="e.g. Bottega Veneta" placeholderTextColor={colors.textSecondary} /></View>
          <View style={styles.modalField}><Text style={[styles.fieldLabel, { color: colors.textSecondary }]}>MODEL</Text><TextInput style={[styles.modalInput, { backgroundColor: colors.surfaceElevated, color: colors.textPrimary }]} value={model} onChangeText={setModel} placeholder="e.g. The Pouch" placeholderTextColor={colors.textSecondary} /></View>
          <View style={styles.modalField}><Text style={[styles.fieldLabel, { color: colors.textSecondary }]}>TARGET PRICE (AED)</Text><TextInput style={[styles.modalInput, { backgroundColor: colors.surfaceElevated, color: colors.textPrimary }]} value={targetPrice} onChangeText={setTargetPrice} placeholder="e.g. 18000" placeholderTextColor={colors.textSecondary} keyboardType="numeric" /></View>
          <View style={styles.modalField}><Text style={[styles.fieldLabel, { color: colors.textSecondary }]}>NOTES</Text><TextInput style={[styles.modalInput, styles.modalTextArea, { backgroundColor: colors.surfaceElevated, color: colors.textPrimary }]} value={notes} onChangeText={setNotes} placeholder="What are you dreaming of?" placeholderTextColor={colors.textSecondary} multiline numberOfLines={2} textAlignVertical="top" /></View>
          <TouchableOpacity onPress={() => setIsPrivate(!isPrivate)} style={styles.privacyRow}><MaterialCommunityIcons name={isPrivate ? "lock" : "lock-open-outline"} size={18} color={colors.textSecondary} /><Text style={[styles.privacyText, { color: colors.textSecondary }]}>{isPrivate ? "Private" : "Visible to circle"}</Text></TouchableOpacity>
          <View style={{ marginTop: spacing.lg }}><PrimaryButton label={submitting ? "Adding..." : "Add to Wishlist"} onPress={handleSubmit} disabled={!brand.trim() || submitting} /></View>
        </View>
      </TouchableOpacity>
    </Modal>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  tabBar: { flexDirection: "row", margin: spacing.lg + 6, borderRadius: radius.pill, padding: 4 },
  tab: { flex: 1, alignItems: "center", paddingVertical: 10, borderRadius: radius.pill },
  tabText: { ...typography.bodyEmphasized, fontSize: 14 },
  list: { paddingHorizontal: spacing.lg + 6, paddingBottom: 100, gap: spacing.md },
  emptyState: { alignItems: "center", justifyContent: "center", paddingTop: spacing.xxl, gap: spacing.md },
  emptyTitle: { ...typography.body },
  wishlistCard: { gap: spacing.sm },
  wishlistHeader: { flexDirection: "row", alignItems: "flex-start", justifyContent: "space-between" },
  wishlistBrand: { ...typography.caption2, fontSize: 10, fontWeight: "500", letterSpacing: 1.2, marginBottom: 2 },
  wishlistModel: { ...typography.bodyEmphasized, fontSize: 15 },
  fulfilledBadge: { flexDirection: "row", alignItems: "center", gap: 3, paddingHorizontal: 8, paddingVertical: 4, borderRadius: 999 },
  fulfilledText: { ...typography.caption2, fontSize: 10, fontWeight: "500" },
  progressSection: { marginTop: spacing.sm },
  progressInfo: { flexDirection: "row", alignItems: "baseline", gap: spacing.xs, marginBottom: 6 },
  progressSaved: { ...typography.bodyEmphasized, fontSize: 15 },
  progressTarget: { ...typography.caption1, fontSize: 12 },
  progressBar: { height: 4, borderRadius: 2, overflow: "hidden" },
  progressFill: { height: "100%", borderRadius: 2 },
  progressPct: { ...typography.caption2, fontSize: 10, marginTop: 4 },
  wishlistNotes: { ...typography.footnote, fontSize: 13, lineHeight: 18 },
  wishlistActions: { flexDirection: "row", gap: spacing.sm, marginTop: spacing.xs },
  actionBtn: { flexDirection: "row", alignItems: "center", gap: 5, paddingHorizontal: 14, paddingVertical: 8, borderRadius: radius.pill, borderWidth: 0.5 },
  actionBtnText: { ...typography.footnote, fontSize: 12 },
  friendHeader: { flexDirection: "row", alignItems: "center", gap: spacing.sm, marginBottom: spacing.sm },
  friendName: { ...typography.bodyEmphasized, fontSize: 14 },
  friendTime: { ...typography.caption2, fontSize: 11 },
  friendItemRow: { flexDirection: "row", alignItems: "center", gap: spacing.md - 2 },
  friendPhoto: { borderRadius: radius.sm },
  friendBrand: { ...typography.caption2, fontSize: 10, fontWeight: "500", letterSpacing: 1.2 },
  friendModel: { ...typography.bodyEmphasized, fontSize: 14, marginTop: 1 },
  friendPrice: { ...typography.caption1, fontSize: 11, marginTop: 2 },
  friendNotes: { ...typography.footnote, fontSize: 13, lineHeight: 18, marginTop: spacing.sm },
  friendActions: { flexDirection: "row", gap: spacing.lg, marginTop: spacing.sm },
  friendAction: { flexDirection: "row", alignItems: "center", gap: 5 },
  friendActionText: { ...typography.caption1, fontSize: 12 },
  commentBox: { flexDirection: "row", alignItems: "center", gap: spacing.sm, borderRadius: radius.sm, paddingHorizontal: spacing.md - 2, paddingVertical: 8, marginTop: spacing.sm },
  commentInput: { flex: 1, fontSize: 14, padding: 0 },
  fab: { position: "absolute", bottom: spacing.xl, right: spacing.lg + 6, width: 56, height: 56, borderRadius: 28, alignItems: "center", justifyContent: "center", shadowColor: "#000", shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.15, shadowRadius: 8, elevation: 5 },
  modalOverlay: { flex: 1, backgroundColor: "rgba(0,0,0,0.5)", justifyContent: "flex-end" },
  modalSheet: { borderTopLeftRadius: radius.xl, borderTopRightRadius: radius.xl, padding: spacing.lg, paddingBottom: spacing.xl },
  modalTitle: { ...typography.title3, textAlign: "center", marginBottom: spacing.lg },
  modalField: { marginBottom: spacing.md },
  fieldLabel: { ...typography.caption2, fontSize: 10, fontWeight: "500", letterSpacing: 1.2, marginBottom: 6 },
  modalInput: { height: 46, borderRadius: radius.sm, paddingHorizontal: spacing.md - 2, fontSize: 15 },
  modalTextArea: { height: 70, paddingTop: spacing.sm },
  privacyRow: { flexDirection: "row", alignItems: "center", gap: spacing.sm, marginTop: spacing.sm },
  privacyText: { ...typography.footnote, fontSize: 14 },
});
