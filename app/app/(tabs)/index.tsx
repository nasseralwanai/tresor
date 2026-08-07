/**
 * Home Screen — Your Collection
 * A premium personal luxury dashboard: time-aware greeting, Piece of the Day
 * spotlight, collection summary, gentle nudges, style of the week, recently
 * added, currently shared, circle activity, value card, and category shelves.
 *
 * Staggered entrance animations via moti, pull-to-refresh with haptics,
 * card press animations. Editorial typography: Georgia (serif) for headings,
 * system body font for labels.
 */

import { useState, useCallback, useMemo, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  RefreshControl,
} from 'react-native';
import { Stack, router } from 'expo-router';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { View as MotiView } from 'moti';
import { useThemeColors, typography, spacing, radius } from '@/theme';
import { Skeleton } from '@/components/Skeleton';
import { hapticLight } from '@/lib/haptics';
import { getMyItems } from '@/lib/items';
import { getCollectionInsights } from '@/lib/profile';
import { getActiveBorrows, type BorrowTransactionEnriched } from '@/lib/borrow';
import { getCircleMembers } from '@/lib/circle';
import { getActivityFeed } from '@/lib/activity';
import { formatCurrency, formatCurrencyCompact, capitalize } from '@/lib/format';
import { useAuth } from '@/hooks/useAuth';
import { useCircleId } from '@/hooks/useCircleId';
import type { Item, ActivityEntry } from '@/types/items';
import { CollectionSummary } from '@/components/home/CollectionSummary';
import { PieceOfTheDay } from '@/components/home/PieceOfTheDay';
import { GentleNudgeCard } from '@/components/home/GentleNudgeCard';
import { StyleOfTheWeek } from '@/components/home/StyleOfTheWeek';
import { RecentlyAddedCarousel } from '@/components/home/RecentlyAddedCarousel';
import {
  CurrentlyShared,
  type LentItem,
} from '@/components/home/CurrentlyShared';
import { CircleActivityPreview } from '@/components/home/CircleActivityPreview';
import { CollectionValueCard } from '@/components/home/CollectionValueCard';
import { CategoryShelf } from '@/components/home/CategoryShelf';
import { EmptyState } from '@/components/EmptyState';

const CATEGORY_LABELS: Record<string, string> = {
  bag: 'Your Bags',
  jewelry: 'Your Jewelry',
  watch: 'Your Watches',
  shoes: 'Your Shoes',
  clothing: 'Your Clothing',
  accessories: 'Your Accessories',
  other: 'Your Other',
};

export default function YourCollectionScreen() {
  const colors = useThemeColors();
  const { user, profile } = useAuth();
  const { circleId } = useCircleId();
  const [items, setItems] = useState<Item[]>([]);
  const [activities, setActivities] = useState<ActivityEntry[]>([]);
  const [borrows, setBorrows] = useState<BorrowTransactionEnriched[]>([]);
  const [circleMemberCount, setCircleMemberCount] = useState(0);
  const [insights, setInsights] = useState<{
    totalValue: number;
    totalItems: number;
    currency: string;
    mostValuableItem:
      | { brand: string; estimated_value: number | null; currency: string }
      | null;
    leastUsedItem: { brand: string; category: string | null } | null;
    itemsLent: number;
  } | null>(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const loadData = useCallback(async () => {
    if (!user?.id) {
      setLoading(false);
      return;
    }
    try {
      setError(null);
      const [itemsData, insightsData, borrowsData] = await Promise.all([
        getMyItems(user.id),
        getCollectionInsights(user.id),
        getActiveBorrows(user.id),
      ]);
      setItems(itemsData);
      setInsights(insightsData);
      setBorrows(borrowsData);

      // Fetch circle members + activity in parallel (awaited within try/catch
      // to avoid fire-and-forget race conditions / state updates on unmounted component)
      if (circleId) {
        const [members, activityData] = await Promise.all([
          getCircleMembers(user.id),
          getActivityFeed(circleId, 10),
        ]);
        setCircleMemberCount(members.length);
        setActivities(activityData);
      }
    } catch (e: any) {
      console.error('[home] loadData error:', e);
      setError(e?.message ?? 'Something went wrong. Pull to retry.');
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, [user?.id, circleId]);

  useEffect(() => {
    loadData();
  }, [loadData]);

  const onRefresh = useCallback(() => {
    hapticLight();
    setRefreshing(true);
    loadData();
  }, [loadData]);

  const handleItemPress = (item: Item) => {
    router.push(`/item/${item.id}` as any);
  };

  // Derived data for sections
  const itemsByCategory = useMemo(() => {
    const g: Record<string, Item[]> = {};
    for (const item of items) {
      const c = item.category ?? 'other';
      if (!g[c]) g[c] = [];
      g[c].push(item);
    }
    return g;
  }, [items]);

  // Piece of the Day: most valuable available item
  const pieceOfDay = useMemo(() => {
    if (items.length === 0) return null;
    const available = items.filter((i) => i.status === 'available');
    const pool = available.length > 0 ? available : items;
    return pool.reduce(
      (max, item) =>
        (item.estimated_value ?? 0) > (max?.estimated_value ?? 0)
          ? item
          : max,
      pool[0]
    );
  }, [items]);

  // Style of the Week: least-recently-used available item
  const styleOfWeek = useMemo(() => {
    if (items.length === 0) return null;
    const available = items.filter((i) => i.status === 'available');
    if (available.length === 0) return null;
    return available.sort(
      (a, b) =>
        new Date(a.updated_at).getTime() - new Date(b.updated_at).getTime()
    )[0];
  }, [items]);

  const styleOfWeekRestingDays = useMemo(() => {
    if (!styleOfWeek) return 0;
    const updated = new Date(styleOfWeek.updated_at).getTime();
    return Math.max(0, Math.floor((Date.now() - updated) / 86400000));
  }, [styleOfWeek]);

  const handleStyleOfWeekPress = useCallback(() => {
    if (styleOfWeek) {
      handleItemPress(styleOfWeek);
    }
  }, [styleOfWeek, handleItemPress]);

  // Currently shared: items I've lent out (borrower_id != me, lender_id == me, status active)
  const lentItems: LentItem[] = useMemo(() => {
    return borrows
      .filter((b) => b.lender_id === user?.id && b.status === 'active')
      .map((b) => {
        const item = items.find((i) => i.id === b.item_id);
        const borrowedAt = b.borrowed_at ?? b.created_at;
        const days = Math.floor(
          (Date.now() - new Date(borrowedAt).getTime()) / 86400000
        );
        const durationLabel =
          days < 1
            ? 'today'
            : days < 7
              ? `${days} days`
              : days < 14
                ? 'a week'
                : days < 30
                  ? 'two weeks'
                  : `${Math.floor(days / 7)} weeks`;
        return {
          item: item ?? {
            ...({} as Item),
            brand: b.item_brand,
            model_name: b.item_model,
            currency: 'AED',
          },
          borrowerName: b.borrower_name,
          durationLabel,
          borrowId: b.id,
        };
      });
  }, [borrows, items, user?.id]);

  // Sparkline data — no historical price data yet; use flat zeros to avoid
  // presenting fabricated trends as real.
  const sparkData = useMemo(() => {
    return [0, 0, 0, 0, 0, 0, 0, 0, 0, 0];
  }, []);

  const firstName = useMemo(() => {
    const name = profile?.display_name ?? user?.email ?? 'there';
    return name.split(' ')[0] || name;
  }, [profile?.display_name, user?.email]);

  // ── Loading state ──
  if (loading) {
    return (
      <>
        <Stack.Screen options={{ title: 'Your Collection' }} />
        <View style={[styles.container, { backgroundColor: colors.background }]}>
          <ScrollView showsVerticalScrollIndicator={false}>
            <HomeSkeleton />
          </ScrollView>
        </View>
      </>
    );
  }

  // ── Error state ──
  if (error && !loading) {
    return (
      <>
        <Stack.Screen options={{ title: 'Your Collection' }} />
        <View
          style={[
            styles.container,
            {
              backgroundColor: colors.background,
              alignItems: 'center',
              justifyContent: 'center',
            },
          ]}
        >
          <Text style={{ color: colors.textSecondary, marginBottom: spacing.md }}>
            {error}
          </Text>
          <TouchableOpacity
            onPress={loadData}
            style={{
              paddingHorizontal: spacing.lg,
              paddingVertical: spacing.sm,
              backgroundColor: colors.surface,
              borderRadius: radius.md,
            }}
          >
            <Text style={{ color: colors.accent }}>Retry</Text>
          </TouchableOpacity>
        </View>
      </>
    );
  }

  const empty = items.length === 0;

  // ── Main render ──
  return (
    <>
      <Stack.Screen options={{ title: 'Your Collection' }} />
      <View style={[styles.container, { backgroundColor: colors.background }]}>
        <ScrollView
          showsVerticalScrollIndicator={false}
          refreshControl={
            <RefreshControl
              refreshing={refreshing}
              onRefresh={onRefresh}
              tintColor={colors.accent}
            />
          }
        >
          {/* 1. Personal Greeting Header */}
          <MotiView
            from={{ opacity: 0, translateY: 10 }}
            animate={{ opacity: 1, translateY: 0 }}
            transition={{ type: 'timing', duration: 500 }}
            style={styles.header}
          >
            <View style={{ flex: 1 }}>
              <Text style={[styles.greeting, { color: colors.textSecondary }]}>
                {getGreeting()}, {firstName}
              </Text>
              <Text style={[styles.title, { color: colors.textPrimary }]}>
                Your Collection
              </Text>
              <Text style={[styles.subtitle, { color: colors.textSecondary }]}>
                {insights
                  ? `${insights.totalItems} ${insights.totalItems === 1 ? 'piece' : 'pieces'}`
                  : `${items.length} ${items.length === 1 ? 'piece' : 'pieces'}`}
                {insights && insights.itemsLent > 0
                  ? ` · ${insights.itemsLent} shared with your circle`
                  : ''}
              </Text>
            </View>
            <TouchableOpacity
              onPress={() => {
                hapticLight();
                router.push('/(tabs)/activity' as any);
              }}
              style={[styles.iconButton, { backgroundColor: colors.surface }]}
            >
              <MaterialCommunityIcons
                name="bell-outline"
                size={18}
                color={colors.textPrimary}
              />
            </TouchableOpacity>
          </MotiView>

          {/* 2. Piece of the Day Spotlight */}
          {pieceOfDay && !empty && (
            <View style={styles.section}>
              <PieceOfTheDay item={pieceOfDay} />
            </View>
          )}

          {/* 3. Collection Summary Strip */}
          {!empty && insights && (
            <View style={styles.section}>
              <CollectionSummary
                pieces={insights.totalItems}
                aedValue={formatCurrencyCompact(insights.totalValue, insights.currency).replace('AED ', '')}
                lentOut={insights.itemsLent}
                inCircle={circleMemberCount}
              />
            </View>
          )}

          {/* 4. Gentle Nudge Card — hidden until real nudge data source exists */}
          {getNudgeTitle() && !empty && (
            <View style={styles.section}>
              <GentleNudgeCard
                title={getNudgeTitle()!}
                subtitle={getNudgeSubtitle()}
                iconName={getNudgeIcon()}
                onPress={() => {
                  hapticLight();
                  router.push('/(tabs)/circle' as any);
                }}
                delay={350}
              />
            </View>
          )}

          {/* 5. Style of the Week */}
          {!empty && styleOfWeek && (
            <View style={styles.section}>
              <StyleOfTheWeek
                item={styleOfWeek}
                restingDays={styleOfWeekRestingDays}
                onPress={() => handleItemPress(styleOfWeek)}
                onStyle={() => handleItemPress(styleOfWeek)}
                delay={400}
              />
            </View>
          )}

          {/* 6. Recently Added Carousel */}
          {!empty && items.length > 0 && (
            <View style={[styles.section, { paddingHorizontal: 0 }]}>
              <RecentlyAddedCarousel
                items={items.slice(0, 5)}
                onPressItem={handleItemPress}
                delay={450}
              />
            </View>
          )}

          {/* 7. Currently Shared Section */}
          {!empty && lentItems.length > 0 && (
            <View style={[styles.section, { paddingHorizontal: 0 }]}>
              <CurrentlyShared
                lentItems={lentItems}
                onPressItem={handleItemPress}
                delay={500}
              />
            </View>
          )}

          {/* 8. Circle Activity Preview */}
          {!empty && activities.length > 0 && (
            <View style={[styles.section, { paddingHorizontal: 0 }]}>
              <CircleActivityPreview
                activities={activities}
                onSeeAll={() => router.push('/(tabs)/activity' as any)}
                delay={550}
              />
            </View>
          )}

          {/* 9. Collection Value Card */}
          {!empty && insights && (
            <View style={styles.section}>
              <CollectionValueCard
                totalValue={formatCurrency(insights.totalValue, insights.currency)}
                quarterlyChange="+AED 0k"
                quarterlyChangePositive
                pieceCount={insights.totalItems}
                sparkData={sparkData}
                sparkLabels={['Jan', 'Apr', 'Aug']}
                delay={600}
              />
            </View>
          )}

          {/* 10. Category Shelves */}
          {!empty &&
            Object.entries(itemsByCategory).map(([category, catItems]) => (
              <CategoryShelf
                key={category}
                title={CATEGORY_LABELS[category] ?? `Your ${capitalize(category)}`}
                items={catItems}
                onPressItem={handleItemPress}
                delay={650}
              />
            ))}

          {/* Empty state */}
          {empty && (
            <EmptyState
              icon="treasure-chest"
              title="Your Collection Awaits"
              subtitle="Tap the + button to add your first luxury piece"
            />
          )}

          <View style={{ height: spacing.xl }} />
        </ScrollView>
      </View>
    </>
  );
}

// ── Helpers ──

function getGreeting(): string {
  const h = new Date().getHours();
  if (h < 12) return 'Good morning';
  if (h < 18) return 'Good afternoon';
  return 'Good evening';
}

/**
 * Determine a contextual nudge message based on day/time.
 * Returns null until a real data source (birthdays, events) is connected.
 */
function getNudgeTitle(): string | null {
  return null;
}

function getNudgeSubtitle(): string {
  return '';
}

function getNudgeIcon(): string {
  return 'clock-outline';
}

// ── Skeleton ──

function HomeSkeleton() {
  const colors = useThemeColors();
  return (
    <View style={styles.section}>
      <Skeleton width={120} height={14} style={{ marginBottom: spacing.xs }} />
      <Skeleton width={200} height={28} style={{ marginBottom: spacing.xs }} />
      <Skeleton width={100} height={14} style={{ marginBottom: spacing.lg }} />
      <View
        style={{
          borderRadius: radius.lg,
          borderWidth: 0.5,
          borderColor: colors.border,
          overflow: 'hidden',
          marginBottom: spacing.md,
        }}
      >
        <Skeleton width="100%" height={152} borderRadius={0} />
        <View style={{ padding: 15 }}>
          <Skeleton width={80} height={10} style={{ marginBottom: 6 }} />
          <Skeleton width={180} height={18} style={{ marginBottom: 8 }} />
          <Skeleton width="100%" height={12} style={{ marginBottom: 10 }} />
          <View style={{ flexDirection: 'row', gap: 8 }}>
            <Skeleton width="48%" height={34} />
            <Skeleton width="48%" height={34} />
          </View>
        </View>
      </View>
      <Skeleton width="100%" height={56} style={{ marginBottom: spacing.md }} />
      <Skeleton width={120} height={10} style={{ marginBottom: spacing.sm }} />
      <View style={{ flexDirection: 'row', gap: 10 }}>
        {[1, 2, 3].map((i) => (
          <View
            key={i}
            style={[
              styles.skeletonCard,
              {
                backgroundColor: colors.surface,
                borderColor: colors.border,
              },
            ]}
          >
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
  );
}

// ── Styles ──

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    justifyContent: 'space-between',
    paddingHorizontal: spacing.lg + 6,
    paddingTop: spacing.sm,
    paddingBottom: spacing.md,
  },
  greeting: {
    fontFamily: 'Jost',
    fontSize: 13,
    fontWeight: '300',
    marginBottom: 2,
  },
  title: {
    fontFamily: 'Georgia',
    fontSize: 26,
    fontWeight: '500',
    lineHeight: 32,
  },
  subtitle: {
    fontFamily: 'Jost',
    fontSize: 12,
    fontWeight: '300',
    marginTop: 4,
  },
  iconButton: {
    width: 30,
    height: 30,
    borderRadius: 15,
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 4,
  },
  section: {
    paddingHorizontal: spacing.lg + 6,
    marginBottom: spacing.md,
  },
  emptyWrap: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingTop: spacing.xxl,
    paddingHorizontal: spacing.xl,
  },
  emptyIcon: {
    width: 80,
    height: 80,
    borderRadius: 24,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: spacing.lg,
  },
  emptyTitle: {
    fontFamily: 'Georgia',
    fontSize: 20,
    fontWeight: '500',
    textAlign: 'center',
    marginBottom: spacing.sm,
  },
  emptySub: {
    fontFamily: 'Jost',
    fontSize: 15,
    fontWeight: '300',
    textAlign: 'center',
  },
  skeletonCard: {
    width: 210,
    borderRadius: radius.lg,
    borderWidth: 0.5,
    overflow: 'hidden',
  },
});


