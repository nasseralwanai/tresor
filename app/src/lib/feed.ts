/**
 * Feed data aggregation — fetches all data for the segregated Circle Feed.
 *
 * Gathers items, active borrows, activities, and wishlists into a single
 * structured payload that the activity screen renders section by section.
 *
 * Feed interactions (likes, comments, votes) are persisted to the database
 * via migration 0019 and fetched in bulk for the feed.
 */

import { supabase } from '@/lib/supabase';
import { getItems } from '@/lib/items';
import { getCircleWishlists } from '@/lib/wishlist';
import { getActivityFeed } from '@/lib/activity';
import type { ActivityEntry, Item, WishlistItem, VoteType } from '@/types/items';
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
  activityId: string | null;
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
  commentCount: number;
  comments: ShareComment[];
  likedByMe: boolean;
  votes: VoteCounts;
  myVote: VoteType | null;
}

/** A comment on a share card. */
export interface ShareComment {
  id: string;
  authorName: string;
  authorId: string;
  text: string;
  createdAt: string;
}

/** Vote counts for an activity. */
export interface VoteCounts {
  love: number;
  want: number;
  been_there: number;
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
  activityId: string | null;
  brand: string;
  model: string | null;
  ownerName: string;
  ownerId: string;
  voteCount: number;
  imageUrl: string | null;
  myVote: VoteType | null;
  votes: VoteCounts;
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
 * Uses parallel queries for performance, including feed interactions.
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

  // Collect all activity IDs for batch fetching interactions
  const activityIds = activities.map((a) => a.id);

  // Fetch all interactions in parallel
  const [likes, comments, votes] = await Promise.all([
    fetchLikes(activityIds),
    fetchComments(activityIds),
    fetchVotes(activityIds),
  ]);

  const wishlists = groupWishlists(wishlistRows);
  const shares = buildShareCards(items, activities, members, likes, comments, votes, userId);
  const voteCandidates = buildVoteCandidates(items, activities, likes, comments, votes, userId);

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

// ─── Feed interaction fetchers ───

/** Fetch all likes for a set of activity IDs. */
async function fetchLikes(
  activityIds: string[]
): Promise<Map<string, { userId: string; createdAt: string }[]>> {
  if (activityIds.length === 0) return new Map();
  const { data, error } = await supabase
    .from('feed_likes')
    .select('user_id, activity_id, created_at')
    .in('activity_id', activityIds);

  if (error) {
    console.warn('[feed] fetchLikes error:', error.message);
    return new Map();
  }

  const map = new Map<string, { userId: string; createdAt: string }[]>();
  for (const row of data ?? []) {
    const arr = map.get(row.activity_id) ?? [];
    arr.push({ userId: row.user_id, createdAt: row.created_at });
    map.set(row.activity_id, arr);
  }
  return map;
}

/** Fetch all comments for a set of activity IDs, enriched with author names. */
async function fetchComments(
  activityIds: string[]
): Promise<Map<string, ShareComment[]>> {
  if (activityIds.length === 0) return new Map();
  const { data, error } = await supabase
    .from('feed_comments')
    .select(
      `id, activity_id, comment_text, created_at,
       profiles!feed_comments_user_id_fkey(display_name, id)`
    )
    .in('activity_id', activityIds)
    .order('created_at', { ascending: true });

  if (error) {
    console.warn('[feed] fetchComments error:', error.message);
    return new Map();
  }

  const map = new Map<string, ShareComment[]>();
  for (const row of (data ?? []) as any[]) {
    const arr = map.get(row.activity_id) ?? [];
    arr.push({
      id: row.id,
      authorName: row.profiles?.display_name ?? 'Unknown',
      authorId: row.profiles?.id ?? row.user_id,
      text: row.comment_text,
      createdAt: row.created_at,
    });
    map.set(row.activity_id, arr);
  }
  return map;
}

/** Fetch all votes for a set of activity IDs. */
async function fetchVotes(
  activityIds: string[]
): Promise<Map<string, { userId: string; voteType: VoteType }[]>> {
  if (activityIds.length === 0) return new Map();
  const { data, error } = await supabase
    .from('feed_votes')
    .select('user_id, activity_id, vote_type')
    .in('activity_id', activityIds);

  if (error) {
    console.warn('[feed] fetchVotes error:', error.message);
    return new Map();
  }

  const map = new Map<string, { userId: string; voteType: VoteType }[]>();
  for (const row of (data ?? []) as any[]) {
    const arr = map.get(row.activity_id) ?? [];
    arr.push({ userId: row.user_id, voteType: row.vote_type as VoteType });
    map.set(row.activity_id, arr);
  }
  return map;
}

/** Build a VoteCounts object from a list of votes. */
function countVotes(votes: { userId: string; voteType: VoteType }[] | undefined): VoteCounts {
  const counts: VoteCounts = { love: 0, want: 0, been_there: 0 };
  if (!votes) return counts;
  for (const v of votes) {
    counts[v.voteType]++;
  }
  return counts;
}

/** Find the current user's vote from a list of votes. */
function findMyVote(
  votes: { userId: string; voteType: VoteType }[] | undefined,
  userId: string
): VoteType | null {
  if (!votes) return null;
  const found = votes.find((v) => v.userId === userId);
  return found ? found.voteType : null;
}

// ─── Interaction mutation functions ───

/**
 * Toggle a like on an activity.
 * If the user has already liked, removes the like. Otherwise, adds one.
 */
export async function toggleLike(
  activityId: string,
  userId: string
): Promise<boolean> {
  // Check if already liked
  const { data: existing } = await supabase
    .from('feed_likes')
    .select('id')
    .eq('activity_id', activityId)
    .eq('user_id', userId)
    .maybeSingle();

  if (existing) {
    const { error } = await supabase
      .from('feed_likes')
      .delete()
      .eq('activity_id', activityId)
      .eq('user_id', userId);
    if (error) throw error;
    return false; // unliked
  }

  const { error } = await supabase
    .from('feed_likes')
    .insert({ activity_id: activityId, user_id: userId });
  if (error) throw error;
  return true; // liked
}

/**
 * Add a comment to an activity.
 * Returns the created comment with author name.
 */
export async function addComment(
  activityId: string,
  userId: string,
  text: string
): Promise<ShareComment> {
  const trimmed = text.trim();
  if (!trimmed) throw new Error('Comment cannot be empty');

  const { data, error } = await supabase
    .from('feed_comments')
    .insert({
      activity_id: activityId,
      user_id: userId,
      comment_text: trimmed,
    })
    .select(
      `id, activity_id, comment_text, created_at,
       profiles!feed_comments_user_id_fkey(display_name, id)`
    )
    .single();

  if (error) throw error;

  const row = data as any;
  return {
    id: row.id,
    authorName: row.profiles?.display_name ?? 'Unknown',
    authorId: row.profiles?.id ?? userId,
    text: row.comment_text,
    createdAt: row.created_at,
  };
}

/**
 * Cast a vote on an activity.
 * If the user already voted with a different type, the old vote is removed first.
 * If the user already voted with the same type, the vote is removed (toggle off).
 */
export async function castVote(
  activityId: string,
  userId: string,
  voteType: VoteType
): Promise<'voted' | 'unvoted'> {
  // Check existing vote
  const { data: existing } = await supabase
    .from('feed_votes')
    .select('id, vote_type')
    .eq('activity_id', activityId)
    .eq('user_id', userId)
    .maybeSingle();

  if (existing) {
    if ((existing as any).vote_type === voteType) {
      // Same vote type — toggle off
      const { error } = await supabase
        .from('feed_votes')
        .delete()
        .eq('activity_id', activityId)
        .eq('user_id', userId);
      if (error) throw error;
      return 'unvoted';
    }
    // Different vote type — remove old, insert new
    await supabase
      .from('feed_votes')
      .delete()
      .eq('activity_id', activityId)
      .eq('user_id', userId);
  }

  const { error } = await supabase
    .from('feed_votes')
    .insert({ activity_id: activityId, user_id: userId, vote_type: voteType });
  if (error) throw error;
  return 'voted';
}

/**
 * Remove the current user's vote on an activity.
 */
export async function removeVote(
  activityId: string,
  userId: string
): Promise<void> {
  const { error } = await supabase
    .from('feed_votes')
    .delete()
    .eq('activity_id', activityId)
    .eq('user_id', userId);
  if (error) throw error;
}

/**
 * Subscribe to realtime updates for feed interactions.
 * Returns an unsubscribe function.
 */
export function subscribeToFeedInteractions(
  activityIds: string[],
  onUpdate: () => void
): () => void {
  const subscription = supabase
    .channel('feed-interactions')
    .on(
      'postgres_changes',
      {
        event: '*',
        schema: 'public',
        table: 'feed_likes',
        filter: `activity_id=in.(${activityIds.join(',')})`,
      },
      () => onUpdate()
    )
    .on(
      'postgres_changes',
      {
        event: '*',
        schema: 'public',
        table: 'feed_comments',
        filter: `activity_id=in.(${activityIds.join(',')})`,
      },
      () => onUpdate()
    )
    .on(
      'postgres_changes',
      {
        event: '*',
        schema: 'public',
        table: 'feed_votes',
        filter: `activity_id=in.(${activityIds.join(',')})`,
      },
      () => onUpdate()
    )
    .subscribe();

  return () => {
    supabase.removeChannel(subscription);
  };
}

// ─── Internal helpers ───

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
 * Build share cards from items + activities + interactions.
 * Items with photos or recent "item_added" activities become share cards.
 * Like counts, comments, and votes are fetched from the DB.
 */
function buildShareCards(
  items: Item[],
  activities: ActivityEntry[],
  members: CircleMember[],
  likes: Map<string, { userId: string; createdAt: string }[]>,
  comments: Map<string, ShareComment[]>,
  votes: Map<string, { userId: string; voteType: VoteType }[]>,
  currentUserId: string
): ShareCard[] {
  const memberMap = new Map(members.map((m) => [m.id, m]));

  // Items that have been recently added or have images become share cards
  const shareable = items
    .filter((item) => !item.is_private)
    .slice(0, 6);

  return shareable.map((item) => {
    const member = memberMap.get(item.owner_id);
    const ownerName = member?.display_name ?? item.owner_name;

    // Find matching activity for timestamp + activity ID
    const matchingActivity = activities.find(
      (a) => a.item_id === item.id && a.type === 'item_added'
    );
    const activityId = matchingActivity?.id ?? null;

    // Fetch interactions for this activity
    const activityLikes = activityId ? likes.get(activityId) : undefined;
    const activityComments = activityId ? comments.get(activityId) ?? [] : [];
    const activityVotes = activityId ? votes.get(activityId) : undefined;

    const likedByMe = activityLikes
      ? activityLikes.some((l) => l.userId === currentUserId)
      : false;

    return {
      id: `share-${item.id}`,
      itemId: item.id,
      activityId,
      actorName: ownerName,
      actorId: item.owner_id,
      brand: item.brand,
      model: item.model_name,
      imageUrl: item.primary_image_url,
      caption: item.notes ?? `A beautiful ${item.brand} piece from the collection.`,
      createdAt: matchingActivity?.created_at ?? item.created_at,
      likeCount: activityLikes?.length ?? 0,
      saveCount: 0,
      verifiedCount: 0,
      starCount: 0,
      commentCount: activityComments.length,
      comments: activityComments,
      likedByMe,
      votes: countVotes(activityVotes),
      myVote: findMyVote(activityVotes, currentUserId),
    };
  });
}

/** Build vote candidates from items + activities — pick top items for "Who Wore It Best". */
function buildVoteCandidates(
  items: Item[],
  activities: ActivityEntry[],
  likes: Map<string, { userId: string; createdAt: string }[]>,
  comments: Map<string, ShareComment[]>,
  votes: Map<string, { userId: string; voteType: VoteType }[]>,
  currentUserId: string
): VoteCandidate[] {
  return items
    .filter((item) => !item.is_private && item.is_lendable)
    .slice(0, 3)
    .map((item) => {
      const matchingActivity = activities.find(
        (a) => a.item_id === item.id && a.type === 'item_added'
      );
      const activityId = matchingActivity?.id ?? null;
      const activityVotes = activityId ? votes.get(activityId) : undefined;

      return {
        itemId: item.id,
        activityId,
        brand: item.brand,
        model: item.model_name,
        ownerName: item.owner_name,
        ownerId: item.owner_id,
        voteCount: activityVotes?.length ?? 0,
        imageUrl: item.primary_image_url,
        myVote: findMyVote(activityVotes, currentUserId),
        votes: countVotes(activityVotes),
      };
    });
}
