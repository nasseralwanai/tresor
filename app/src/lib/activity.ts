/**
 * Activity feed API.
 *
 * Activity entries are auto-created by database triggers (see migrations
 * 0001 and 0002). This module provides read access to the feed.
 */

import { supabase } from '@/lib/supabase';
import type { ActivityType } from '@/types';
import type { ActivityEntry } from '@/types/items';

/**
 * Get the activity feed for a circle.
 * Returns recent entries ordered by created_at desc, limit 50.
 */
export async function getActivityFeed(
  circleId: string,
  limit: number = 50
): Promise<ActivityEntry[]> {
  const { data, error } = await supabase
    .from('activity_feed')
    .select('*, items!activity_feed_item_id_fkey(brand)')
    .eq('circle_id', circleId)
    .order('created_at', { ascending: false })
    .limit(limit);

  if (error) throw error;
  return (data ?? []).map((row: any) => ({
    ...row,
    actor_name: row.actor_name ?? 'Unknown',
    summary: row.summary ?? '',
    item_brand: row.items?.brand ?? null,
  }));
}

/**
 * Insert a manual activity entry (e.g. dropHint for wishlist).
 * RLS allows insert when user_id = auth.uid().
 */
export async function addActivityEntry(params: {
  circleId?: string | null;
  userId: string;
  type: ActivityEntry['type'];
  itemId?: string | null;
  borrowId?: string | null;
  actorName?: string | null;
  summary?: string | null;
  metadata?: Record<string, unknown> | null;
}): Promise<ActivityEntry | null> {
  const { data, error } = await supabase
    .from('activity_feed')
    .insert({
      circle_id: params.circleId ?? null,
      user_id: params.userId,
      type: params.type,
      item_id: params.itemId ?? null,
      borrow_id: params.borrowId ?? null,
      actor_name: params.actorName ?? null,
      summary: params.summary ?? null,
      metadata: params.metadata ?? null,
    })
    .select()
    .maybeSingle();

  if (error) throw error;
  return data;
}

/**
 * Mark a borrow as returned (via the activity feed action).
 * Delegates to the borrow lib's markReturned function.
 */
export async function markReturned(borrowId: string): Promise<void> {
  const { markReturned: markReturnedBorrow } = await import('@/lib/borrow');
  await markReturnedBorrow(borrowId);
}
