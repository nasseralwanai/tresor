/**
 * Activity Feed — Segregated Circle Feed (Muaath's Phase 2 redesign).
 *
 * Five clearly separated zones replace the flat chronological list:
 *   1. Featured — Who Wore It Best voting + active borrows summary
 *   2. Latest Items — horizontal scroll of item cards
 *   3. Circle Activity — compact single-line rows with type icons
 *   4. Shared Wishlists — wishlist cards with brand chips
 *   5. Recent Shares — full-width share cards with reactions + comments
 *
 * Filter pills (All/Borrows/Items/Wishlists/Shares) control section visibility.
 * Comment bottom sheet (@expo/ui BottomSheet) opens on comment interaction.
 */

import { useState, useCallback, useMemo, useEffect, useRef } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  RefreshControl,
} from 'react-native';
import { Stack, router } from 'expo-router';
import { useThemeColors, spacing, radius } from '@/theme';
import { Skeleton } from '@/components/Skeleton';
import { NotificationBell } from '@/components/NotificationBell';
import { EmptyState } from '@/components/EmptyState';
import { ErrorView } from '@/components/ErrorView';
import { classifyError, type AppError } from '@/lib/errors';
import { getFeedData, subscribeToFeedInteractions, type FeedData, type ShareCard, type ShareComment } from '@/lib/feed';
import { useCircleId } from '@/hooks/useCircleId';
import { useAuth } from '@/hooks/useAuth';
import {
  FilterPills,
  type FeedFilter,
  FeaturedSection,
  LatestItemsSection,
  CircleActivitySection,
  SharedWishlistsSection,
  RecentSharesSection,
  CommentSheet,
} from '@/components/feed';
import type { VoteType } from '@/types/items';

export default function ActivityScreen() {
  const colors = useThemeColors();
  const { user } = useAuth();
  const { circleId } = useCircleId();
  const [feedData, setFeedData] = useState<FeedData | null>(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState<AppError | null>(null);
  const [activeFilter, setActiveFilter] = useState<FeedFilter>('all');
  const [commentShare, setCommentShare] = useState<ShareCard | null>(null);

  const currentUserId = user?.id ?? '';

  const loadData = useCallback(async () => {
    if (!circleId || !user?.id) {
      setLoading(false);
      return;
    }
    try {
      setError(null);
      const data = await getFeedData(circleId, user.id);
      setFeedData(data);
    } catch (e: unknown) {
      console.error('[activity] loadData error:', e);
      setError(classifyError(e));
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, [circleId, user?.id]);

  useEffect(() => {
    let cancelled = false;
    const load = async () => {
      if (!cancelled) await loadData();
    };
    load();
    return () => { cancelled = true; };
  }, [loadData]);

  // Subscribe to realtime feed interaction updates
  const unsubscribeRef = useRef<(() => void) | null>(null);
  useEffect(() => {
    if (!feedData || feedData.activities.length === 0) return;

    const activityIds = feedData.activities.map((a) => a.id);
    if (activityIds.length === 0) return;

    const unsub = subscribeToFeedInteractions(activityIds, () => {
      // Silently reload feed data on any interaction change
      loadData();
    });
    unsubscribeRef.current = unsub;

    return () => {
      unsub();
      unsubscribeRef.current = null;
    };
  }, [feedData?.activities.length, loadData]);

  const onRefresh = useCallback(() => {
    setRefreshing(true);
    loadData();
  }, [loadData]);

  const handleFilterChange = useCallback((filter: FeedFilter) => {
    setActiveFilter(filter);
  }, []);

  const handleDismissComment = useCallback(() => {
    setCommentShare(null);
  }, []);

  // When a comment is added in the sheet, update the feed data optimistically
  const handleCommentAdded = useCallback((shareId: string, comment: ShareComment) => {
    setFeedData((prev) => {
      if (!prev) return prev;
      return {
        ...prev,
        shares: prev.shares.map((s) =>
          s.id === shareId
            ? { ...s, comments: [...s.comments, comment], commentCount: s.commentCount + 1 }
            : s
        ),
      };
    });
  }, []);

  // Filter activities based on active filter pill
  const filteredActivities = useMemo(() => {
    if (!feedData) return [];
    if (activeFilter === 'all') return feedData.activities;

    const borrowTypes = [
      'borrow_requested',
      'borrow_approved',
      'borrow_active',
      'borrow_returned',
      'borrow_completed',
      'borrow_declined',
    ];
    const itemTypes = ['item_added', 'item_updated', 'item_removed'];
    const wishlistTypes = ['wishlist_item_added'];

    return feedData.activities.filter((a) => {
      if (activeFilter === 'borrows') return borrowTypes.includes(a.type);
      if (activeFilter === 'items') return itemTypes.includes(a.type);
      if (activeFilter === 'wishlists') return wishlistTypes.includes(a.type);
      if (activeFilter === 'shares') return a.type === 'item_added' && a.item_brand;
      return true;
    });
  }, [feedData, activeFilter]);

  // Determine which sections to show based on filter
  const showFeatured = activeFilter === 'all' || activeFilter === 'borrows';
  const showLatestItems = activeFilter === 'all' || activeFilter === 'items';
  const showCircleActivity =
    activeFilter === 'all' || activeFilter === 'borrows' || activeFilter === 'items';
  const showWishlists = activeFilter === 'all' || activeFilter === 'wishlists';
  const showShares = activeFilter === 'all' || activeFilter === 'shares';

  // Error state
  if (error && !loading) {
    return (
      <>
        <Stack.Screen options={{ title: 'Activity', headerShown: false }} />
        <ErrorView error={error} onRetry={loadData} />
      </>
    );
  }

  // Loading state
  if (loading) {
    return (
      <>
        <Stack.Screen options={{ title: 'Activity', headerShown: false }} />
        <View style={[styles.container, { backgroundColor: colors.background }]}>
          <View style={styles.loadingContainer}>
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
                <View style={{ flexDirection: 'row', alignItems: 'center', gap: 10 }}>
                  <Skeleton width={26} height={26} borderRadius={13} />
                  <View style={{ flex: 1 }}>
                    <Skeleton width={200} height={12} style={{ marginBottom: 4 }} />
                    <Skeleton width={50} height={9} />
                  </View>
                </View>
              </View>
            ))}
          </View>
        </View>
      </>
    );
  }

  // Empty state
  if (!feedData || (feedData.activities.length === 0 && feedData.items.length === 0)) {
    return (
      <>
        <Stack.Screen options={{ title: 'Activity', headerShown: false }} />
        <View style={[styles.container, { backgroundColor: colors.background }]}>
          <EmptyState
            icon="bell-off-outline"
            title="Nothing Happening Yet"
            subtitle="Share an item with your circle to start the conversation."
            actionLabel="Share an Item"
            onAction={() => router.push('/(tabs)/add' as any)}
          />
        </View>
      </>
    );
  }

  return (
    <>
      <Stack.Screen options={{ title: 'Activity', headerShown: false }} />
      <View style={[styles.container, { backgroundColor: colors.background }]}>
        {/* Header */}
        <View style={[styles.header, { borderBottomColor: colors.border }]}>
          <View>
            <Text style={[styles.headerTitle, { color: colors.textPrimary }]}>
              Activity
            </Text>
            <Text style={[styles.headerSub, { color: colors.textSecondary }]}>
              The Atelier Circle · Live
            </Text>
          </View>
          <NotificationBell size={30} />
        </View>

        {/* Filter pills */}
        <FilterPills active={activeFilter} onChange={handleFilterChange} />

        {/* Feed sections */}
        <ScrollView
          showsVerticalScrollIndicator={false}
          refreshControl={
            <RefreshControl
              refreshing={refreshing}
              onRefresh={onRefresh}
              tintColor={colors.gold}
            />
          }
        >
          {showFeatured && (
            <FeaturedSection
              voteCandidates={feedData.voteCandidates}
              activeBorrowCount={feedData.activeBorrowCount}
            />
          )}

          {showLatestItems && (
            <LatestItemsSection items={feedData.items} />
          )}

          {showCircleActivity && (
            <CircleActivitySection
              activities={filteredActivities}
              currentUserId={currentUserId}
              onActivityChanged={loadData}
            />
          )}

          {showWishlists && (
            <SharedWishlistsSection wishlists={feedData.wishlists} />
          )}

          {showShares && (
            <RecentSharesSection
              shares={feedData.shares}
              onOpenComments={setCommentShare}
            />
          )}

          <View style={{ height: spacing.xl }} />
        </ScrollView>

        {/* Comment bottom sheet */}
        <CommentSheet
          share={commentShare}
          onDismiss={handleDismissComment}
          onCommentAdded={handleCommentAdded}
        />
      </View>
    </>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingTop: 6,
    paddingHorizontal: 22,
    paddingBottom: 18,
    borderBottomWidth: StyleSheet.hairlineWidth,
  },
  headerTitle: {
    fontFamily: 'Georgia',
    fontSize: 26,
    fontWeight: '400',
    letterSpacing: -0.3,
    lineHeight: 1.1,
  },
  headerSub: {
    fontFamily: 'Jost',
    fontSize: 11,
    fontWeight: '300',
    marginTop: 4,
  },
  bellBtn: {
    width: 30,
    height: 30,
    borderRadius: 15,
    alignItems: 'center',
    justifyContent: 'center',
    position: 'relative',
  },
  bellBadge: {
    position: 'absolute',
    top: -4,
    right: -4,
    minWidth: 15,
    height: 15,
    borderRadius: 7.5,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 3,
  },
  bellBadgeText: {
    fontFamily: 'Jost',
    fontSize: 8,
    fontWeight: '600',
    color: '#FFFFFF',
  },
  loadingContainer: {
    paddingHorizontal: 22,
    paddingTop: spacing.md,
    gap: 10,
  },
  skeletonCard: {
    borderRadius: radius.lg,
    borderWidth: 0.5,
    padding: spacing.md,
  },
  emptyText: {
    fontFamily: 'Georgia',
    fontSize: 20,
    fontWeight: '500',
    marginTop: spacing.md,
  },
  emptySub: {
    fontFamily: 'Jost',
    fontSize: 14,
    fontWeight: '300',
    marginTop: spacing.xs,
    textAlign: 'center',
    paddingHorizontal: spacing.xl,
  },
});
