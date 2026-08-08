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

import { useState, useCallback, useMemo } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  RefreshControl,
  FlatList,
} from 'react-native';
import { Stack, router, useFocusEffect } from 'expo-router';
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
import { getPriceHistoryForUserItems, computeValueTrend } from '@/lib/priceHistory';
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
import { ErrorView } from '@/components/ErrorView';
import { SearchBar } from '@/components/SearchBar';
import { FilterChip } from '@/components/FilterChip';
import { classifyError, type AppError } from '@/lib/errors';
import type { ItemCategory } from '@/types/items';

const CATEGORY_LABELS: Record<string, string> = {
  bag: 'Your Bags',
  jewelry: 'Your Jewelry',
  watch: 'Your Watches',
  shoes: 'Your Shoes',
  clothing: 'Your Clothing',
  accessories: 'Your Accessories',
  other: 'Your Other',
};

/** Category filter chips shown below the search bar on Home. */
const CATEGORY_CHIPS: { label: string; value: ItemCategory | 'all' }[] = [
  { label: 'All', value: 'all' },
  { label: 'Bags', value: 'bag' },
  { label: 'Jewelry', value: 'jewelry' },
  { label: 'Watches', value: 'watch' },
  { label: 'Shoes', value: 'shoes' },
  { label: 'Clothing', value: 'clothing' },
  { label: 'Accessories', value: 'accessories' },
  { label: 'Other', value: 'other' },
];

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
  const [error, setError] = useState<AppError | null>(null);
  const [valueTrend, setValueTrend] = useState<{
    sparkData: number[];
    sparkLabels: string[];
    quarterlyChange: string;
    quarterlyChangePositive: boolean;
  } | null>(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [activeCategory, setActiveCategory] = useState<ItemCategory | 'all'>(
    'all'
  );

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

      // Fetch real price history and compute value trend (non-blocking —
      // if it fails the card just doesn't render, not a hard error)
      try {
        const priceHistory = await getPriceHistoryForUserItems(user.id);
        setValueTrend(computeValueTrend(priceHistory));
      } catch (phErr) {
        console.warn('[home] price history fetch failed:', phErr);
        setValueTrend(null);
      }

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
    } catch (e: unknown) {
      console.error('[home] loadData error:', e);
      setError(classifyError(e));
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, [user?.id, circleId]);

  // Reload data whenever the Home tab gains focus (e.g. after adding an item).
  // This replaces the plain useEffect so returning from another tab refreshes.
  useFocusEffect(
    useCallback(() => {
      loadData();
    }, [loadData])
  );

  const onRefresh = useCallback(() => {
    hapticLight();
    setRefreshing(true);
    loadData();
  }, [loadData]);

  const handleItemPress = useCallback((item: Item) => {
    router.push(`/item/${item.id}` as any);
  }, []);

  const handleAddItem = useCallback(() => {
    hapticLight();
    router.push('/(tabs)/add' as any);
  }, []);

  const handleSeeAllActivity = useCallback(() => {
    router.push('/(tabs)/activity' as any);
  }, []);

  // ── Nudge: derive from real active borrows where the user is the lender ──
  // A nudge is surfaced when the user has an active lend that has been out
  // past the 48h grace period (matching the nudge_borrower() RPC constraint).
  // If no qualifying borrow exists, the card simply doesn't render.
  const nudgeInfo = useMemo(() => {
    if (!user?.id) return null;
    const myLent = borrows.filter(
      (b) => b.lender_id === user.id && b.status === 'active'
    );
    if (myLent.length === 0) return null;

    // Find the oldest active lend to surface as the nudge
    const oldest = myLent.reduce((old, b) => {
      const borrowedAt = b.borrowed_at ?? b.created_at;
      return new Date(borrowedAt).getTime() < new Date(old.borrowed_at ?? old.created_at).getTime()
        ? b
        : old;
    });

    const borrowedAt = oldest.borrowed_at ?? oldest.created_at;
    const daysOut = Math.floor(
      (Date.now() - new Date(borrowedAt).getTime()) / 86400000
    );

    // Only surface a nudge if the borrow is past the 48h grace period
    if (daysOut < 2) return null;

    const nudgeCount = oldest.nudge_count ?? 0;
    const title =
      nudgeCount > 0
        ? `${oldest.borrower_name} has had your ${oldest.item_brand} for ${daysOut} days`
        : `${oldest.item_brand} has been with ${oldest.borrower_name} for ${daysOut} days`;
    const subtitle =
      nudgeCount > 0
        ? `You've nudged ${nudgeCount} time${nudgeCount > 1 ? 's' : ''}. Tap to send another gentle reminder.`
        : 'Tap to send a gentle reminder to bring it home.';

    return { title, subtitle, iconName: 'hand-heart-outline', borrowId: oldest.id };
  }, [borrows, user?.id]);

  const handleGentleNudgePress = useCallback(() => {
    hapticLight();
    router.push('/(tabs)/circle' as any);
  }, []);

  // ── Search & category filter ──
  const isSearchActive = searchQuery.trim().length > 0;

  const filteredItems = useMemo(() => {
    let result = items;

    // Category filter (active even when search is empty — chips drive this)
    if (activeCategory !== 'all') {
      result = result.filter((i) => i.category === activeCategory);
    }

    // Text search across brand, model_name, color, category
    if (isSearchActive) {
      const q = searchQuery.trim().toLowerCase();
      result = result.filter((i) => {
        const brand = (i.brand ?? '').toLowerCase();
        const model = (i.model_name ?? '').toLowerCase();
        const color = (i.color ?? '').toLowerCase();
        const category = (i.category ?? '').toLowerCase();
        return (
          brand.includes(q) ||
          model.includes(q) ||
          color.includes(q) ||
          category.includes(q)
        );
      });
    }

    return result;
  }, [items, searchQuery, activeCategory, isSearchActive]);

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
        <ErrorView error={error} onRetry={loadData} />
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
              onPress={handleAddItem}
              accessibilityRole="button"
              accessibilityLabel="Add a new piece"
              accessibilityHint="Open the add item screen"
              hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
              style={[styles.iconButton, { backgroundColor: colors.surface }]}
            >
              <MaterialCommunityIcons
                name="plus"
                size={18}
                color={colors.textPrimary}
              />
            </TouchableOpacity>
          </MotiView>

          {/* Search Bar + Category Chips */}
          {!empty && (
            <View style={styles.searchSection}>
              <SearchBar
                value={searchQuery}
                onChangeText={setSearchQuery}
                placeholder="Search by brand, model, color, category"
              />
              <ScrollView
                horizontal
                showsHorizontalScrollIndicator={false}
                style={styles.chipsRow}
                contentContainerStyle={styles.chipsContent}
              >
                {CATEGORY_CHIPS.map((chip) => (
                  <FilterChip
                    key={chip.value}
                    label={chip.label}
                    selected={activeCategory === chip.value}
                    onPress={() =>
                      setActiveCategory(chip.value as ItemCategory | 'all')
                    }
                  />
                ))}
              </ScrollView>
            </View>
          )}

          {/* Search Results — flat list when query is active */}
          {!empty && isSearchActive && (
            <View style={styles.section}>
              <Text style={[styles.resultsHeader, { color: colors.textSecondary }]}>
                {filteredItems.length}{' '}
                {filteredItems.length === 1 ? 'result' : 'results'}
              </Text>
              {filteredItems.length === 0 ? (
                <View style={styles.searchEmpty}>
                  <MaterialCommunityIcons
                    name="magnify"
                    size={48}
                    color={colors.textSecondary}
                  />
                  <Text
                    style={[styles.searchEmptyText, { color: colors.textSecondary }]}
                  >
                    No pieces match your search
                  </Text>
                </View>
              ) : (
                <FlatList
                  data={filteredItems}
                  keyExtractor={(item) => item.id}
                  scrollEnabled={false}
                  contentContainerStyle={styles.resultsList}
                  renderItem={({ item }) => (
                    <SearchResultRow
                      item={item}
                      colors={colors}
                      onPress={handleItemPress}
                    />
                  )}
                />
              )}
            </View>
          )}

          {/* 2. Piece of the Day Spotlight */}
          {pieceOfDay && !empty && !isSearchActive && (
            <View style={styles.section}>
              <PieceOfTheDay item={pieceOfDay} />
            </View>
          )}

          {/* 3. Collection Summary Strip */}
          {!empty && !isSearchActive && insights && (
            <View style={styles.section}>
              <CollectionSummary
                pieces={insights.totalItems}
                aedValue={formatCurrencyCompact(insights.totalValue, insights.currency).replace('AED ', '')}
                lentOut={insights.itemsLent}
                inCircle={circleMemberCount}
              />
            </View>
          )}

          {/* 4. Gentle Nudge Card — shown when the user has an active lend past the 48h grace period */}
          {nudgeInfo && !empty && !isSearchActive && (
            <View style={styles.section}>
              <GentleNudgeCard
                title={nudgeInfo.title}
                subtitle={nudgeInfo.subtitle}
                iconName={nudgeInfo.iconName}
                onPress={handleGentleNudgePress}
                delay={350}
              />
            </View>
          )}

          {/* 5. Style of the Week */}
          {!empty && !isSearchActive && styleOfWeek && (
            <View style={styles.section}>
              <StyleOfTheWeek
                item={styleOfWeek}
                restingDays={styleOfWeekRestingDays}
                onPress={handleStyleOfWeekPress}
                onStyle={handleStyleOfWeekPress}
                delay={400}
              />
            </View>
          )}

          {/* 6. Recently Added Carousel */}
          {!empty && !isSearchActive && items.length > 0 && (
            <View style={[styles.section, { paddingHorizontal: 0 }]}>
              <RecentlyAddedCarousel
                items={items.slice(0, 5)}
                onPressItem={handleItemPress}
                delay={450}
              />
            </View>
          )}

          {/* 7. Currently Shared Section */}
          {!empty && !isSearchActive && lentItems.length > 0 && (
            <View style={[styles.section, { paddingHorizontal: 0 }]}>
              <CurrentlyShared
                lentItems={lentItems}
                onPressItem={handleItemPress}
                delay={500}
              />
            </View>
          )}

          {/* 8. Circle Activity Preview */}
          {!empty && !isSearchActive && activities.length > 0 && (
            <View style={[styles.section, { paddingHorizontal: 0 }]}>
              <CircleActivityPreview
                activities={activities}
                onSeeAll={handleSeeAllActivity}
                delay={550}
              />
            </View>
          )}

          {/* 9. Collection Value Card — only shown when real price history exists */}
          {!empty && !isSearchActive && insights && valueTrend && (
            <View style={styles.section}>
              <CollectionValueCard
                totalValue={formatCurrency(insights.totalValue, insights.currency)}
                quarterlyChange={valueTrend.quarterlyChange}
                quarterlyChangePositive={valueTrend.quarterlyChangePositive}
                pieceCount={insights.totalItems}
                sparkData={valueTrend.sparkData}
                sparkLabels={valueTrend.sparkLabels}
                delay={600}
              />
            </View>
          )}

          {/* 10. Category Shelves */}
          {!empty &&
            !isSearchActive &&
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
              subtitle="Add your first luxury piece to begin building your private collection."
              actionLabel="Add Your First Item"
              onAction={handleAddItem}
            />
          )}

          <View style={{ height: spacing.xl }} />
        </ScrollView>
      </View>
    </>
  );
}

// ── Search Result Row ──

type ThemeColors = ReturnType<typeof useThemeColors>;

function SearchResultRow({
  item,
  colors,
  onPress,
}: {
  item: Item;
  colors: ThemeColors;
  onPress: (item: Item) => void;
}) {
  return (
    <TouchableOpacity
      onPress={() => onPress(item)}
      activeOpacity={0.85}
      accessibilityRole="button"
      accessibilityLabel={`${item.brand} ${item.model_name || 'item'}`}
      accessibilityHint="View item details"
      hitSlop={{ top: 10, bottom: 10, left: 5, right: 5 }}
      style={[searchResultStyles.row, { backgroundColor: colors.surface, borderColor: colors.border }]}
    >
      <View style={searchResultStyles.info}>
        <Text style={[searchResultStyles.brand, { color: colors.accent }]} numberOfLines={1}>
          {item.brand.toUpperCase()}
        </Text>
        <Text style={[searchResultStyles.model, { color: colors.textPrimary }]} numberOfLines={1}>
          {item.model_name || '—'}
        </Text>
        {item.category && (
          <View style={[searchResultStyles.badge, { backgroundColor: 'rgba(201,169,97,0.10)' }]}>
            <Text style={[searchResultStyles.badgeText, { color: colors.accent }]}>
              {capitalize(item.category)}
            </Text>
          </View>
        )}
      </View>
      <Text style={[searchResultStyles.value, { color: colors.textSecondary }]}>
        {formatCurrency(item.estimated_value, item.currency)}
      </Text>
      <MaterialCommunityIcons name="chevron-right" size={20} color={colors.textSecondary} />
    </TouchableOpacity>
  );
}

const searchResultStyles = StyleSheet.create({
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: spacing.md,
    paddingHorizontal: spacing.md,
    borderRadius: radius.md,
    borderWidth: 0.5,
    marginBottom: spacing.sm,
  },
  info: {
    flex: 1,
  },
  brand: {
    ...typography.caption2,
    fontSize: 11,
    fontWeight: '600',
    letterSpacing: 1.2,
    textTransform: 'uppercase',
    marginBottom: 2,
  },
  model: {
    ...typography.body,
    fontSize: 15,
    fontWeight: '500',
  },
  badge: {
    alignSelf: 'flex-start',
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 999,
    marginTop: 6,
  },
  badgeText: {
    ...typography.caption2,
    fontSize: 10,
    fontWeight: '500',
  },
  value: {
    ...typography.subheadline,
    fontSize: 14,
    fontWeight: '600',
    marginRight: spacing.xs,
  },
});

// ── Helpers ──

function getGreeting(): string {
  const h = new Date().getHours();
  if (h < 12) return 'Good morning';
  if (h < 18) return 'Good afternoon';
  return 'Good evening';
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
  searchSection: {
    paddingHorizontal: spacing.lg + 6,
    marginBottom: spacing.sm,
  },
  chipsRow: {
    marginTop: spacing.sm,
    flexGrow: 0,
  },
  chipsContent: {
    paddingRight: spacing.lg + 6,
  },
  resultsHeader: {
    ...typography.footnote,
    fontSize: 13,
    marginBottom: spacing.sm,
  },
  resultsList: {
    paddingBottom: spacing.sm,
  },
  searchEmpty: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: spacing.xxl,
    gap: spacing.md,
  },
  searchEmptyText: {
    ...typography.body,
    fontSize: 15,
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


