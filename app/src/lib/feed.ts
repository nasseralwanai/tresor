/**
 * Feed data aggregation — fetches all data for the segregated Circle Feed.
 *
 * Gathers items, active borrows, activities, and wishlists into a single
 * structured payload that the activity screen renders section by section.
 */

import { supabase } from '@/lib/supabase';
import { getItems } from '@/lib/items';
import { getCircleWishlists } from '@/lib/wishlist';
import { getActivityFeed } from '@/lib/activity';
import type { ActivityEntry, Item, WishlistItem } from '@/types/items';
import type { Database } from '@/types';

/** A circle member with basic profile info. */
export interface CircleMember {
  id: string;
  display_name: string | null;
  avatar_url: string | null;
}

/** A share card — an item shared to the circle feed with social context. */
export interface ShareCard {
  id: string;
  itemId: string;
  actorName: string;
  actorId: string;
  brand: string;
  model: string | null;
  imageUrl: string | null;
  caption: string | null;
  createdAt: string;
  likeCount: number;
  saveCount: number;
  verifiedCount: number;
  starCount: number;
  comments: ShareComment[];
}

/** A comment on a share card. */
export interface ShareComment {
  id: string;
  authorName: string;
  text: string;
  createdAt: string;
}

/** A wishlist grouped by user — used for the Shared Wishlists section. */
export interface SharedWishlist {
  id: string;
  ownerName: string;
  ownerId: string;
  name: string;
  itemCount: number;
  brandChips: string[];
  reactionCount: number;
}

/** A candidate for the "Who Wore It Best" voting card. */
export interface VoteCandidate {
  itemId: string;
  brand: string;
  model: string | null;
  ownerName: string;
  ownerId: string;
  voteCount: number;
  imageUrl: string | null;
}

/** The full aggregated feed data for the Circle Feed screen. */
export interface FeedData {
  items: Item[];
  activities: ActivityEntry[];
  wishlists: SharedWishlist[];
  shares: ShareCard[];
  activeBorrowCount: number;
  voteCandidates: VoteCandidate[];
  members: CircleMember[];
}

type BorrowRow = Database['public']['Tables']['borrow_transactions']['Row'];

/**
 * Fetch all data for the segregated feed in a single call.
 * Uses parallel queries for performance.
 */
export async function getFeedData(
  circleId: string,
  userId: string
): Promise<FeedData> {
  const [items, activities, wishlistRows, borrowRows, members] = await Promise.all([
    getItems(circleId),
    getActivityFeed(circleId, 50),
    getCircleWishlists(circleId),
    getCircleActiveBorrows(circleId),
    getCircleMembers(circleId),
  ]);

  const activeBorrowCount = borrowRows.filter(
    (b) => b.status === 'active' || b.status === 'approved'
  ).length;

  const wishlists = groupWishlists(wishlistRows);
  const shares = buildShareCards(items, activities, members);
  const voteCandidates = buildVoteCandidates(items);

  return {
    items,
    activities,
    wishlists,
    shares,
    activeBorrowCount,
    voteCandidates,
    members,
  };
}

/** Get all active/approved borrows in a circle. */
async function getCircleActiveBorrows(
  circleId: string
): Promise<BorrowRow[]> {
  const { data, error } = await supabase
    .from('borrow_transactions')
    .select('*')
    .eq('circle_id', circleId)
    .in('status', ['active', 'approved', 'requested', 'returned_pending'])
    .order('created_at', { ascending: false })
    .limit(50);

  if (error) throw error;
  return data ?? [];
}

/** Get all members of a circle with profile info. */
async function getCircleMembers(
  circleId: string
): Promise<CircleMember[]> {
  const { data, error } = await supabase
    .from('circle_members')
    .select(
      'user_id, profiles!circle_members_user_id_fkey(display_name, avatar_url)'
    )
    .eq('circle_id', circleId)
    .limit(50);

  if (error) throw error;
  return (data ?? []).map((row: any) => ({
    id: row.user_id,
    display_name: row.profiles?.display_name ?? 'Unknown',
    avatar_url: row.profiles?.avatar_url ?? null,
  }));
}

/**
 * Group wishlist items by user to create shared wishlist cards.
 * Each card shows the wishlist name (owner's name + "Dreams"), brand chips,
 * and item count.
 */
function groupWishlists(
  wishlistRows: (WishlistItem & {
    profiles?: { display_name: string | null; avatar_url: string | null } | null;
  })[]
): SharedWishlist[] {
  const byUser = new Map<
    string,
    { ownerName: string; ownerId: string; items: WishlistItem[] }
  >();

  for (const row of wishlistRows) {
    const ownerId = row.user_id;
    const ownerName = row.profiles?.display_name ?? 'Unknown';
    if (!byUser.has(ownerId)) {
      byUser.set(ownerId, { ownerName, ownerId, items: [] });
    }
    byUser.get(ownerId)!.items.push(row);
  }

  return Array.from(byUser.entries()).map(([ownerId, group], idx) => {
    const brands = Array.from(
      new Set(
        group.items
          .map((i) => i.brand)
          .filter((b): b is string => Boolean(b))
      )
    ).slice(0, 4);

    return {
      id: `wishlist-${ownerId}-${idx}`,
      ownerName: group.ownerName,
      ownerId,
      name: `${group.ownerName.split(' ')[0]}'s Dreams`,
      itemCount: group.items.length,
      brandChips: brands,
      reactionCount: 0,
    };
  });
}

/**
 * Build share cards from items + activities.
 * Items with photos or recent "item_added" activities become share cards.
 */
function buildShareCards(
  items: Item[],
  activities: ActivityEntry[],
  members: CircleMember[]
): ShareCard[] {
  const memberMap = new Map(members.map((m) => [m.id, m]));

  // Items that have been recently added or have images become share cards
  const shareable = items
    .filter((item) => !item.is_private)
    .slice(0, 6);

  return shareable.map((item) => {
    const member = memberMap.get(item.owner_id);
    const ownerName = member?.display_name ?? item.owner_name;

    // Find matching activity for timestamp
    const matchingActivity = activities.find(
      (a) => a.item_id === item.id && a.type === 'item_added'
    );

    return {
      id: `share-${item.id}`,
      itemId: item.id,
      actorName: ownerName,
      actorId: item.owner_id,
      brand: item.brand,
      model: item.model_name,
      imageUrl: item.primary_image_url,
      caption: item.notes ?? `A beautiful ${item.brand} piece from the collection.`,
      createdAt: matchingActivity?.created_at ?? item.created_at,
      likeCount: 0,
      saveCount: 0,
      verifiedCount: 0,
      starCount: 0,
      comments: [],
    };
  });
}

/** Build vote candidates from items — pick top items for "Who Wore It Best". */
function buildVoteCandidates(items: Item[]): VoteCandidate[] {
  return items
    .filter((item) => !item.is_private && item.is_lendable)
    .slice(0, 3)
    .map((item) => ({
      itemId: item.id,
      brand: item.brand,
      model: item.model_name,
      ownerName: item.owner_name,
      ownerId: item.owner_id,
      voteCount: 0,
      imageUrl: item.primary_image_url,
    }));
}
