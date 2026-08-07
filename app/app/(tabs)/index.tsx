/**
 * Home Screen — My Trésor
 * Boutique shelf layout: collection insights, category rows, pull-to-refresh, skeleton state.
 */

import { useState, useCallback, useMemo, useEffect } from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity, RefreshControl, Alert } from 'react-native';
import { Stack, router } from 'expo-router';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { useThemeColors, typography, spacing, radius } from '@/theme';
import { Card } from '@/components/Card';
import { ItemCard } from '@/components/ItemCard';
import { Avatar } from '@/components/Avatar';
import { Skeleton } from '@/components/Skeleton';
import { ItemPhotoPlaceholder } from '@/components/ItemPhotoPlaceholder';
import { hapticLight } from '@/lib/haptics';
import { getMyItems } from '@/lib/items';
import { getCollectionInsights } from '@/lib/profile';
import { formatCurrency, formatCurrencyCompact, capitalize } from '@/lib/format';
import { useAuth } from '@/hooks/useAuth';
import type { Item } from '@/types/items';

const CATEGORY_LABELS: Record<string, string> = { bag: 'Bags', jewelry: 'Jewelry', watch: 'Watches', shoes: 'Shoes', clothing: 'Clothing', accessories: 'Accessories', other: 'Other' };

export default function MyTresorScreen() {
  const colors = useThemeColors();
  const { user } = useAuth();
  const [items, setItems] = useState<Item[]>([]);
  const [insights, setInsights] = useState<{
    totalValue: number;
    totalItems: number;
    currency: string;
    mostValuableItem: { brand: string; estimated_value: number | null; currency: string } | null;
    leastUsedItem: { brand: string; category: string | null } | null;
    itemsLent: number;
  } | null>(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const loadData = useCallback(async () => {
    if (!user?.id) { setLoading(false); return; }
    try {
      setError(null);
      const [itemsData, insightsData] = await Promise.all([
        getMyItems(user.id),
        getCollectionInsights(user.id),
      ]);
      setItems(itemsData); setInsights(insightsData);
    } catch (e: any) {
      console.error('[home] loadData error:', e);
      setError(e?.message ?? 'Something went wrong. Pull to retry.');
    } finally {
      setLoading(false); setRefreshing(false);
    }
  }, [user?.id]);
  useEffect(() => { loadData(); }, [loadData]);
  const onRefresh = useCallback(() => { setRefreshing(true); loadData(); }, [loadData]);

  const itemsByCategory = useMemo(() => {
    const g: Record<string, Item[]> = {};
    for (const item of items) { const c = item.category ?? 'other'; if (!g[c]) g[c] = []; g[c].push(item); }
    return g;
  }, [items]);

  const handleItemPress = (item: Item) => { router.push(`/item/${item.id}` as any); };

  if (loading) {
    return (<><Stack.Screen options={{ title: 'My Trésor' }} /><View style={[styles.container, { backgroundColor: colors.background }]}><ScrollView showsVerticalScrollIndicator={false}><HomeSkeleton /></ScrollView></View></>);
  }
  if (error && !loading) {
    return (
      <>
        <Stack.Screen options={{ title: 'My Trésor' }} />
        <View style={[styles.container, { backgroundColor: colors.background, alignItems: 'center', justifyContent: 'center' }]}>
          <Text style={{ color: colors.textSecondary, marginBottom: spacing.md }}>{error}</Text>
          <TouchableOpacity onPress={loadData} style={{ paddingHorizontal: spacing.lg, paddingVertical: spacing.sm, backgroundColor: colors.surface, borderRadius: radius.md }}>
            <Text style={{ color: colors.accent }}>Retry</Text>
          </TouchableOpacity>
        </View>
      </>
    );
  }
  const empty = items.length === 0;
  return (
    <>
      <Stack.Screen options={{ title: 'My Trésor' }} />
      <View style={[styles.container, { backgroundColor: colors.background }]}>
        <ScrollView showsVerticalScrollIndicator={false} refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={colors.accent} />}>
          <View style={styles.header}>
            <View style={{ flex: 1 }}>
              <Text style={[styles.greeting, { color: colors.textSecondary }]}>{getGreeting()}</Text>
              <Text style={[styles.title, { color: colors.textPrimary }]}>My Trésor</Text>
              <Text style={[styles.subtitle, { color: colors.textSecondary }]}>{insights ? `${insights.totalItems} items` : `${items.length} items`}{insights && insights.itemsLent > 0 ? ` · ${insights.itemsLent} currently lent` : ''}</Text>
            </View>
            <TouchableOpacity onPress={() => { hapticLight(); router.push('/(tabs)/activity'); }} style={[styles.iconButton, { backgroundColor: colors.surface }]}>
              <MaterialCommunityIcons name="bell-outline" size={18} color={colors.textPrimary} />
            </TouchableOpacity>
          </View>
          {insights && !empty && (
            <View style={styles.section}>
              <Card>
                <Text style={[styles.kicker, { color: colors.accent }]}>COLLECTION INSIGHTS</Text>
                <Text style={[styles.insightValue, { color: colors.textPrimary }]}>{formatCurrency(insights.totalValue, insights.currency)}</Text>
                <Text style={[styles.insightSub, { color: colors.textSecondary }]}>across {insights.totalItems} items</Text>
                <View style={styles.insightRow}>
                  {insights.mostValuableItem && (
                    <View style={[styles.insightCard, { backgroundColor: colors.surfaceElevated }]}>
                      <Text style={[styles.insightLabel, { color: colors.textSecondary }]}>Most Valuable</Text>
                      <Text style={[styles.insightItemBrand, { color: colors.textPrimary }]} numberOfLines={1}>{insights.mostValuableItem.brand}</Text>
                      <Text style={[styles.insightItemValue, { color: colors.accent }]}>{formatCurrencyCompact(insights.mostValuableItem.estimated_value, insights.mostValuableItem.currency)}</Text>
                    </View>
                  )}
                  {insights.leastUsedItem && (
                    <View style={[styles.insightCard, { backgroundColor: colors.surfaceElevated }]}>
                      <Text style={[styles.insightLabel, { color: colors.textSecondary }]}>Least Used</Text>
                      <Text style={[styles.insightItemBrand, { color: colors.textPrimary }]} numberOfLines={1}>{insights.leastUsedItem.brand}</Text>
                      <Text style={[styles.insightItemValue, { color: colors.textSecondary }]}>{capitalize(insights.leastUsedItem.category ?? 'item')}</Text>
                    </View>
                  )}
                </View>
              </Card>
            </View>
          )}
          {insights && insights.itemsLent > 0 && (
            <View style={styles.section}>
              <View style={[styles.nudgeCard, { backgroundColor: colors.surfaceElevated }]}>
                <Avatar name="Mona A." size="sm" />
                <View style={{ flex: 1 }}>
                  <Text style={[styles.nudgeItem, { color: colors.textPrimary }]} numberOfLines={1}>Chanel Classic Flap</Text>
                  <Text style={[styles.nudgeSub, { color: colors.textSecondary }]}>Still with Mona A. — two weeks</Text>
                </View>
                <TouchableOpacity onPress={() => { hapticLight(); Alert.alert('Coming Soon', 'Nudge notifications will be available soon.'); }} style={[styles.nudgeBtn, { backgroundColor: colors.surface }]}><Text style={[styles.nudgeBtnText, { color: colors.textPrimary }]}>Nudge</Text></TouchableOpacity>
              </View>
            </View>
          )}
          {empty && (
            <View style={styles.emptyWrap}>
              <View style={[styles.emptyIcon, { backgroundColor: colors.surface }]}><MaterialCommunityIcons name="treasure-chest" size={40} color={colors.accent} /></View>
              <Text style={[styles.emptyTitle, { color: colors.textPrimary }]}>Your Collection Awaits</Text>
              <Text style={[styles.emptySub, { color: colors.textSecondary }]}>Tap the + button to add your first luxury piece</Text>
            </View>
          )}
          {!empty && items.length > 0 && (
            <View style={styles.section}>
              <Text style={[styles.sectionLabel, { color: colors.textSecondary }]}>RECENTLY ADDED</Text>
              <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.carousel}>
                {items.slice(0, 5).map((item) => <ItemCard key={item.id} item={item} onPress={handleItemPress} />)}
              </ScrollView>
            </View>
          )}
          {!empty && Object.entries(itemsByCategory).map(([category, catItems]) => (
            <View key={category} style={styles.shelfSection}>
              <View style={styles.shelfHeader}>
                <Text style={[styles.shelfName, { color: colors.textPrimary }]}>{CATEGORY_LABELS[category] ?? capitalize(category)}</Text>
                <Text style={[styles.shelfCount, { color: colors.textSecondary }]}>{catItems.length} {catItems.length === 1 ? 'item' : 'items'}</Text>
              </View>
              <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.shelfRow}>
                {catItems.map((item) => (
                  <TouchableOpacity key={item.id} onPress={() => { hapticLight(); handleItemPress(item); }} activeOpacity={0.85} style={styles.shelfItem}>
                    <View style={{ position: 'relative' }}>
                      <ItemPhotoPlaceholder letter={item.brand} size={100} style={styles.shelfPhoto} />
                      {item.status === 'borrowed' && <View style={[styles.shelfDot, { backgroundColor: colors.gold }]} />}
                    </View>
                    <Text style={[styles.shelfBrand, { color: colors.textPrimary }]} numberOfLines={1}>{item.brand}</Text>
                    <Text style={[styles.shelfModel, { color: colors.textSecondary }]} numberOfLines={1}>{item.model_name || '—'}</Text>
                    <Text style={[styles.shelfPrice, { color: colors.accent }]}>{formatCurrencyCompact(item.estimated_value, item.currency)}</Text>
                  </TouchableOpacity>
                ))}
              </ScrollView>
            </View>
          ))}
          <View style={{ height: spacing.xl }} />
        </ScrollView>
      </View>
    </>
  );
}

function HomeSkeleton() {
  const colors = useThemeColors();
  return (
    <View style={styles.section}>
      <Skeleton width={120} height={14} style={{ marginBottom: spacing.xs }} />
      <Skeleton width={200} height={28} style={{ marginBottom: spacing.xs }} />
      <Skeleton width={100} height={14} style={{ marginBottom: spacing.lg }} />
      <Card>
        <Skeleton width={120} height={10} style={{ marginBottom: spacing.sm }} />
        <Skeleton width={180} height={26} style={{ marginBottom: spacing.xs }} />
        <Skeleton width={140} height={12} />
      </Card>
      <View style={{ marginTop: spacing.lg }}>
        <Skeleton width={120} height={10} style={{ marginBottom: spacing.sm }} />
        <View style={{ flexDirection: 'row', gap: 10 }}>
          {[1, 2, 3].map((i) => (
            <View key={i} style={[styles.skeletonCard, { backgroundColor: colors.surface, borderColor: colors.border }]}>
              <Skeleton width="100%" height={130} borderRadius={0} />
              <View style={{ padding: 11 }}>
                <Skeleton width={60} height={9} style={{ marginBottom: 4 }} />
                <Skeleton width={100} height={14} style={{ marginBottom: 4 }} />
                <Skeleton width={50} height={11} />
              </View>
            </View>
          ))}
        </View>
      </View>
    </View>
  );
}

function getGreeting(): string {
  const h = new Date().getHours();
  if (h < 12) return 'Good morning'; if (h < 18) return 'Good afternoon'; return 'Good evening';
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  header: { flexDirection: 'row', alignItems: 'flex-start', justifyContent: 'space-between', paddingHorizontal: spacing.lg + 6, paddingTop: spacing.sm, paddingBottom: spacing.md },
  greeting: { ...typography.footnote, marginBottom: 2 },
  title: { ...typography.title1, fontSize: 26, lineHeight: 32 },
  subtitle: { ...typography.caption1, marginTop: 4 },
  iconButton: { width: 30, height: 30, borderRadius: 15, alignItems: 'center', justifyContent: 'center', marginTop: 4 },
  section: { paddingHorizontal: spacing.lg + 6, marginBottom: spacing.lg },
  kicker: { ...typography.caption2, fontSize: 10, fontWeight: '500', letterSpacing: 1.5, marginBottom: 6 },
  insightValue: { fontSize: 24, fontWeight: '500', letterSpacing: -0.3 },
  insightSub: { ...typography.caption1, marginTop: 2 },
  insightRow: { flexDirection: 'row', gap: spacing.sm, marginTop: spacing.md },
  insightCard: { flex: 1, borderRadius: radius.md, padding: spacing.md - 2 },
  insightLabel: { ...typography.caption2, fontSize: 10, marginBottom: 4 },
  insightItemBrand: { ...typography.bodyEmphasized, fontSize: 13, marginBottom: 2 },
  insightItemValue: { ...typography.caption1, fontSize: 11, fontWeight: '500' },
  nudgeCard: { flexDirection: 'row', alignItems: 'center', gap: spacing.md - 2, padding: spacing.md - 2, borderRadius: radius.lg },
  nudgeItem: { ...typography.bodyEmphasized, fontSize: 13 },
  nudgeSub: { ...typography.caption1, fontSize: 10, marginTop: 1 },
  nudgeBtn: { paddingHorizontal: 12, paddingVertical: 7, borderRadius: radius.sm },
  nudgeBtnText: { ...typography.caption2, fontSize: 11 },
  sectionLabel: { ...typography.caption2, fontSize: 10, fontWeight: '500', letterSpacing: 1.5, marginBottom: spacing.sm },
  carousel: { gap: 10, paddingRight: spacing.lg + 6 },
  shelfSection: { marginBottom: spacing.lg },
  shelfHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'baseline', paddingHorizontal: spacing.lg + 6, marginBottom: spacing.sm },
  shelfName: { ...typography.bodyEmphasized, fontSize: 15 },
  shelfCount: { ...typography.caption1, fontSize: 10 },
  shelfRow: { gap: 10, paddingHorizontal: spacing.lg + 6, paddingRight: spacing.lg + 6 },
  shelfItem: { width: 100, flexShrink: 0 },
  shelfPhoto: { width: 100, height: 100, marginBottom: 5 },
  shelfDot: { position: 'absolute', top: 6, right: 6, width: 6, height: 6, borderRadius: 3 },
  shelfBrand: { ...typography.caption2, fontSize: 9, fontWeight: '500' },
  shelfModel: { ...typography.caption1, fontSize: 10, lineHeight: 13, marginTop: 1 },
  shelfPrice: { ...typography.caption1, fontSize: 10, fontWeight: '500', marginTop: 1 },
  emptyWrap: { flex: 1, alignItems: 'center', justifyContent: 'center', paddingTop: spacing.xxl, paddingHorizontal: spacing.xl },
  emptyIcon: { width: 80, height: 80, borderRadius: 24, alignItems: 'center', justifyContent: 'center', marginBottom: spacing.lg },
  emptyTitle: { ...typography.title3, textAlign: 'center', marginBottom: spacing.sm },
  emptySub: { ...typography.body, textAlign: 'center' },
  skeletonCard: { width: 210, borderRadius: radius.lg, borderWidth: 0.5, overflow: 'hidden' },
});
