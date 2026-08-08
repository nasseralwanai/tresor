/**
 * Circle API — fetch circle members and info via Supabase.
 *
 * Returns enriched member data with item counts.
 */

import { supabase } from '@/lib/supabase';
import { withRetry } from '@/lib/retry';
import type { CircleMemberPreview } from '@/types';

/** A circle member with their item count and taste label (for UI display). */
export interface CircleMemberWithItems extends CircleMemberPreview {
  item_count: number;
  taste_label: string | null;
}

/** Fetch the current user's circle info. */
export async function getMyCircle(userId: string): Promise<{ id: string; name: string } | null> {
  return withRetry(async () => {
    const { data, error } = await supabase
      .from('circle_members')
      .select('circle_id, circles!circle_members_circle_id_fkey(id, name)')
      .eq('user_id', userId)
      .limit(1)
      .maybeSingle();

    if (error) throw error;
    if (!data) return null;

    const circle = (data as any).circles;
    return circle ? { id: circle.id, name: circle.name } : null;
  });
}

/**
 * Fetch all members of the current user's circle.
 * Returns members with their display name, avatar, and item count.
 */
export async function getCircleMembers(userId: string): Promise<CircleMemberWithItems[]> {
  return withRetry(async () => {
    // 1. Get the user's circle
    const { data: membership, error: memberError } = await supabase
      .from('circle_members')
      .select('circle_id')
      .eq('user_id', userId)
      .limit(1)
      .maybeSingle();

    if (memberError) throw memberError;
    if (!membership) return [];

    // 2. Get all members of this circle with their profiles (including taste labels)
    const { data: members, error: membersError } = await supabase
      .from('circle_members')
      .select(
        'user_id, profiles!circle_members_user_id_fkey(id, display_name, avatar_url, taste_label)'
      )
      .eq('circle_id', membership.circle_id)
      .limit(50);

    if (membersError) throw membersError;

    // 3. Fetch all non-private items in this circle in a single query,
    //    then count per-member client-side (avoids N+1 queries).
    //    Uses items_visible view (pricing privacy — migration 0016).
    const { data: itemRows, error: itemError } = await supabase
      .from('items_visible')
      .select('owner_id, id')
      .eq('circle_id', membership.circle_id)
      .eq('is_private', false)
      .limit(50);

    if (itemError) throw itemError;

    // Count items per owner
    const countByOwner = new Map<string, number>();
    for (const row of itemRows ?? []) {
      countByOwner.set(row.owner_id, (countByOwner.get(row.owner_id) ?? 0) + 1);
    }

    const enriched: CircleMemberWithItems[] = [];
    for (const m of members ?? []) {
      const profile = (m as any).profiles;
      if (!profile) continue;

      enriched.push({
        id: profile.id,
        display_name: profile.display_name ?? 'Unknown',
        avatar_url: profile.avatar_url,
        item_count: countByOwner.get(profile.id) ?? 0,
        taste_label: profile.taste_label ?? null,
      });
    }

    return enriched;
  });
}

/**
 * Fetch the current user's circle ID.
 */
export async function getUserCircleId(userId: string): Promise<string | null> {
  return withRetry(async () => {
    const { data, error } = await supabase
      .from('circle_members')
      .select('circle_id')
      .eq('user_id', userId)
      .limit(1)
      .maybeSingle();

    if (error) throw error;
    return data?.circle_id ?? null;
  });
}
