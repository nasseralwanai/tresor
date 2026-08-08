/**
 * Circle Screen — member cards with taste labels (Plate XIII).
 *
 * Changes from v4:
 * - Member cards show taste labels instead of "N items"
 * - NO monetary values anywhere (pricing privacy)
 * - Non-financial stats: Pieces, Members, On loan
 * - Collection highlight image per member
 * - Logo in header (Ironwork mark)
 */

import { useState, useCallback, useEffect } from "react";
import {
  View, Text, StyleSheet, ScrollView, TouchableOpacity, FlatList,
  ActivityIndicator, RefreshControl, Alert,
} from "react-native";
import { Stack, router } from "expo-router";
import { MaterialCommunityIcons } from "@expo/vector-icons";
import { useThemeColors, typography, spacing, radius } from "@/theme";
import { Card } from "@/components/Card";
import { Avatar } from "@/components/Avatar";
import { ItemPhotoPlaceholder } from "@/components/ItemPhotoPlaceholder";
import { IronworkMark } from "@/components/IronworkMark";
import { Skeleton } from "@/components/Skeleton";
import { hapticLight } from "@/lib/haptics";
import { getCircleMembers, getMyCircle } from "@/lib/circle";
import { getUserItems } from "@/lib/items";
import { useAuth } from "@/hooks/useAuth";
import type { CircleMemberWithItems } from "@/lib/circle";
import type { Item } from "@/types/items";
import { EmptyState } from "@/components/EmptyState";
import { ErrorView } from "@/components/ErrorView";
import { SearchBar } from "@/components/SearchBar";
import { classifyError, type AppError } from "@/lib/errors";

export default function CircleScreen() {
  const colors = useThemeColors();
  const { user } = useAuth();
  const [members, setMembers] = useState<CircleMemberWithItems[]>([]);
  const [circleInfo, setCircleInfo] = useState<{ id: string; name: string } | null>(null);
  const [selectedMember, setSelectedMember] = useState<CircleMemberWithItems | null>(null);
  const [memberItems, setMemberItems] = useState<Item[]>([]);
  const [onlyLendable, setOnlyLendable] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const [loading, setLoading] = useState(true);
  const [loadingItems, setLoadingItems] = useState(false);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState<AppError | null>(null);

  const loadMembers = useCallback(async () => {
    if (!user?.id) { setLoading(false); return; }
    try {
      setError(null);
      const [data, circle] = await Promise.all([
        getCircleMembers(user.id),
        getMyCircle(user.id),
      ]);
      setMembers(data);
      setCircleInfo(circle);
    } catch (e: unknown) {
      console.error('[circle] loadMembers error:', e);
      setError(classifyError(e));
    } finally {
      setLoading(false); setRefreshing(false);
    }
  }, [user?.id]);
  useEffect(() => { loadMembers(); }, [loadMembers]);
  const onRefresh = useCallback(() => { setRefreshing(true); loadMembers(); }, [loadMembers]);

  const handleMemberPress = useCallback(async (member: CircleMemberWithItems) => {
    hapticLight(); setSelectedMember(member); setLoadingItems(true);
    try {
      const items = await getUserItems(member.id);
      setMemberItems(items);
    } catch (e: any) {
      console.error('[circle] handleMemberPress error:', e);
      Alert.alert('Error', e?.message ?? 'Could not load items.');
    } finally {
      setLoadingItems(false);
    }
  }, []);

  const handleBack = () => { hapticLight(); setSelectedMember(null); setMemberItems([]); };

  const toggleLendable = async () => {
    hapticLight();
    const newValue = !onlyLendable;
    setOnlyLendable(newValue);
    if (selectedMember) {
      setLoadingItems(true);
      try {
        const items = await getUserItems(selectedMember.id, newValue);
        setMemberItems(items);
      } catch (e: any) {
        console.error('[circle] toggleLendable error:', e);
        Alert.alert('Error', e?.message ?? 'Could not load items.');
      } finally {
        setLoadingItems(false);
      }
    }
  };

  const refreshMemberItems = useCallback(async () => {
    if (!selectedMember) return;
    setRefreshing(true);
    try {
      const items = await getUserItems(selectedMember.id, onlyLendable);
      setMemberItems(items);
    } catch (e: any) {
      console.error('[circle] refreshMemberItems error:', e);
      Alert.alert('Error', e?.message ?? 'Could not load items.');
    } finally {
      setRefreshing(false);
    }
  }, [selectedMember, onlyLendable]);

  const displayItems = memberItems.filter((i) => {
    if (onlyLendable && (!i.is_lendable || i.is_private)) return false;
    const q = searchQuery.trim().toLowerCase();
    if (q) {
      const brand = (i.brand ?? "").toLowerCase();
      const model = (i.model_name ?? "").toLowerCase();
      const category = (i.category ?? "").toLowerCase();
      if (!brand.includes(q) && !model.includes(q) && !category.includes(q)) return false;
    }
    return true;
  });

  const handleItemPress = (item: Item) => { router.push(`/item/${item.id}` as any); };

  if (loading) {
    return (<><Stack.Screen options={{ title: "Circle" }} /><View style={[styles.container, { backgroundColor: colors.background }]}><View style={styles.listWrap}>{[1,2,3,4].map((i) => (<Card key={i} style={styles.skeletonCard}><View style={{ flexDirection: "row", alignItems: "center", gap: spacing.md }}><Skeleton width={46} height={46} borderRadius={23} /><View style={{ flex: 1 }}><Skeleton width={120} height={16} style={{ marginBottom: 4 }} /><Skeleton width={80} height={12} /></View></View></Card>))}</View></View></>);
  }
  if (error && !loading) {
    return (
      <>
        <Stack.Screen options={{ title: "Circle" }} />
        <ErrorView error={error} onRetry={loadMembers} />
      </>
    );
  }

  if (selectedMember) {
    return (
      <>
        <Stack.Screen options={{ title: selectedMember.display_name ?? 'Unknown' }} />
        <View style={[styles.container, { backgroundColor: colors.background }]}>
          <ScrollView showsVerticalScrollIndicator={false} refreshControl={<RefreshControl refreshing={refreshing} onRefresh={refreshMemberItems} tintColor={colors.accent} />}>
            <View style={styles.memberHeader}>
              <TouchableOpacity onPress={handleBack} style={styles.backBtn}><MaterialCommunityIcons name="chevron-left" size={24} color={colors.textPrimary} /></TouchableOpacity>
              <Avatar name={selectedMember.display_name ?? 'Unknown'} size="lg" />
              <View style={{ flex: 1, marginLeft: spacing.md }}>
                <Text style={[styles.memberName, { color: colors.textPrimary }]}>{selectedMember.display_name ?? 'Unknown'}</Text>
                {selectedMember.taste_label && (
                  <Text style={[styles.memberTaste, { color: colors.accent }]}>{selectedMember.taste_label}</Text>
                )}
                <Text style={[styles.memberCount, { color: colors.textSecondary }]}>{selectedMember.item_count} pieces</Text>
              </View>
            </View>
            <View style={styles.searchWrap}>
              <SearchBar
                value={searchQuery}
                onChangeText={setSearchQuery}
                placeholder="Search brand, model, category"
              />
            </View>
            <TouchableOpacity onPress={toggleLendable} style={[styles.filterToggle, { backgroundColor: onlyLendable ? colors.accent : colors.surface, borderColor: colors.border }]}>
              <MaterialCommunityIcons name={onlyLendable ? "check-circle" : "check-circle-outline"} size={16} color={onlyLendable ? colors.charcoal : colors.textSecondary} />
              <Text style={[styles.filterText, { color: onlyLendable ? colors.charcoal : colors.textSecondary }]}>Only show lendable</Text>
            </TouchableOpacity>
            {loadingItems ? (<View style={styles.gridLoading}><ActivityIndicator color={colors.accent} /></View>) : displayItems.length === 0 ? (
              <EmptyState icon="package-variant" title="No Items to Show" subtitle={onlyLendable ? "No lendable pieces in this collection yet" : "This member hasn't added any items yet"} />
            ) : (
              <FlatList data={displayItems} keyExtractor={(item) => item.id} numColumns={2} scrollEnabled={false} contentContainerStyle={styles.grid} renderItem={({ item }) => (
                <TouchableOpacity onPress={() => { hapticLight(); handleItemPress(item); }} activeOpacity={0.85} style={[styles.gridCard, { backgroundColor: colors.surface, borderColor: colors.border }]}>
                  <View style={{ position: "relative" }}>
                    <ItemPhotoPlaceholder letter={item.brand} size={150} imageUrl={item.primary_image_url} seed={item.id} style={styles.gridPhoto} />
                    <View style={styles.gridBadgeRow}>
                      {item.is_private && <View style={[styles.gridLock, { backgroundColor: colors.surface }]}><MaterialCommunityIcons name="lock" size={11} color={colors.textSecondary} /></View>}
                      {!item.is_lendable && <View style={[styles.gridNoLend, { backgroundColor: colors.surfaceElevated }]}><Text style={[styles.gridNoLendText, { color: colors.textSecondary }]}>Not for lending</Text></View>}
                    </View>
                  </View>
                  <View style={styles.gridInfo}>
                    <Text style={[styles.gridBrand, { color: colors.accent }]} numberOfLines={1}>{item.brand.toUpperCase()}</Text>
                    <Text style={[styles.gridModel, { color: colors.textPrimary }]} numberOfLines={1}>{item.model_name || "—"}</Text>
                  </View>
                </TouchableOpacity>
              )} />
            )}
            <View style={{ height: spacing.xl }} />
          </ScrollView>
        </View>
      </>
    );
  }

  return (
    <>
      <Stack.Screen options={{ title: "Circle" }} />
      <View style={[styles.container, { backgroundColor: colors.background }]}>
        <ScrollView showsVerticalScrollIndicator={false} refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={colors.accent} />}>
          {/* Circle header with logo */}
          {circleInfo && (
            <View style={styles.circleHeader}>
              <IronworkMark size={32} variant="ink-on-light" style={styles.headerLogo} />
              <Text style={[styles.circleName, { color: colors.textPrimary }]}>{circleInfo.name}</Text>
              <Text style={[styles.circleMeta, { color: colors.textSecondary }]}>By invitation</Text>
            </View>
          )}
          {members.length === 0 ? (
            <EmptyState icon="account-group-outline" title="Your Circle Is Empty" subtitle="Invite friends to start sharing your collections" />
          ) : (
            <View style={styles.listWrap}>
              {members.map((member) => (
                <TouchableOpacity key={member.id} onPress={() => handleMemberPress(member)} activeOpacity={0.85}>
                  <Card style={styles.memberCard}>
                    <View style={{ flexDirection: "row", alignItems: "center", gap: spacing.md }}>
                      <Avatar name={member.display_name ?? 'Unknown'} size="md" />
                      <View style={{ flex: 1 }}>
                        <Text style={[styles.memberListName, { color: colors.textPrimary }]}>{member.display_name ?? 'Unknown'}</Text>
                        {member.taste_label ? (
                          <Text style={[styles.memberListTaste, { color: colors.accent }]}>{member.taste_label}</Text>
                        ) : (
                          <Text style={[styles.memberListCount, { color: colors.textSecondary }]}>{member.item_count} pieces</Text>
                        )}
                      </View>
                      <MaterialCommunityIcons name="chevron-right" size={22} color={colors.textSecondary} />
                    </View>
                  </Card>
                </TouchableOpacity>
              ))}
            </View>
          )}
          <View style={{ height: spacing.xl }} />
        </ScrollView>
      </View>
    </>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  circleHeader: { alignItems: "center", paddingTop: spacing.lg, paddingBottom: spacing.md, gap: 4 },
  headerLogo: { marginBottom: 4 },
  circleName: { ...typography.title2, fontSize: 22, textAlign: "center" },
  circleMeta: { ...typography.caption2, fontSize: 10, letterSpacing: 1.5, textTransform: "uppercase" },
  listWrap: { paddingHorizontal: spacing.lg + 6, paddingTop: spacing.md, gap: spacing.sm },
  memberCard: { padding: spacing.md },
  memberListName: { ...typography.bodyEmphasized, fontSize: 16 },
  memberListTaste: { ...typography.caption1, fontSize: 12, marginTop: 2, fontStyle: "italic" },
  memberListCount: { ...typography.caption1, marginTop: 2 },
  memberHeader: { flexDirection: "row", alignItems: "center", paddingHorizontal: spacing.lg + 6, paddingTop: spacing.sm, paddingBottom: spacing.md, gap: spacing.md },
  backBtn: { width: 44, height: 44, alignItems: "center", justifyContent: "center", marginLeft: -spacing.sm },
  memberName: { ...typography.title3, fontSize: 18 },
  memberTaste: { ...typography.caption1, fontSize: 13, fontStyle: "italic", marginTop: 2 },
  memberCount: { ...typography.caption1, marginTop: 2 },
  filterToggle: { flexDirection: "row", alignItems: "center", gap: spacing.sm, paddingHorizontal: spacing.md, paddingVertical: 10, borderRadius: radius.pill, borderWidth: 0.5, marginHorizontal: spacing.lg + 6, marginBottom: spacing.md, alignSelf: "flex-start" },
  searchWrap: { paddingHorizontal: spacing.lg + 6, marginBottom: spacing.md },
  filterText: { ...typography.footnote, fontSize: 13 },
  grid: { paddingHorizontal: spacing.lg + 6, gap: 10 },
  gridLoading: { paddingVertical: spacing.xl, alignItems: "center" },
  gridCard: { flex: 1 / 2, borderRadius: radius.lg, borderWidth: 0.5, overflow: "hidden", maxWidth: "50%" },
  gridPhoto: { width: "100%", height: 150, borderRadius: 0 },
  gridBadgeRow: { position: "absolute", top: 8, left: 8, right: 8, flexDirection: "row", justifyContent: "space-between", alignItems: "flex-start" },
  gridLock: { width: 24, height: 24, borderRadius: 12, alignItems: "center", justifyContent: "center" },
  gridNoLend: { paddingHorizontal: 8, paddingVertical: 4, borderRadius: 999 },
  gridNoLendText: { ...typography.caption2, fontSize: 9 },
  gridInfo: { padding: spacing.md - 2, gap: 1 },
  gridBrand: { ...typography.caption2, fontSize: 9, fontWeight: "500", letterSpacing: 1.2 },
  gridModel: { ...typography.body, fontSize: 14, fontWeight: "500", lineHeight: 18 },
  skeletonCard: { padding: spacing.md },
});
