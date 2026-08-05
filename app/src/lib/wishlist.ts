/**
 * Wishlist API — manages wishlist items and savings goals.
 *
 * Each user has a wishlist (auto-created on first add). Wishlist items
 * track target_price, current_savings, and target_date for savings goals.
 * Circle members can see non-private wishlists (social wishlist).
 */

import { supabase } from '@/lib/supabase';
import { addActivityEntry } from '@/lib/activity';
import type { Wishlist, WishlistItem, Database } from '@/types';

type WishlistItemInsert = Database['public']['Tables']['wishlist_items']['Insert'];
type WishlistItemUpdate = Database['public']['Tables']['wishlist_items']['Update'];

/**
 * Ensure the user has a wishlist row. Creates one if missing.
 * Returns the wishlist ID.
 */
export async function ensureWishlist(userId: string): Promise<string> {
  const { data: existing, error: findError } = await supabase
    .from('wishlists')
    .select('id')
    .eq('user_id', userId)
    .maybeSingle();

  if (findError) throw findError;
  if (existing) return existing.id;

  const { data: created, error: createError } = await supabase
    .from('wishlists')
    .insert({ user_id: userId, name: 'My Wishlist', is_private: false })
    .select('id')
    .single();

  if (createError) throw createError;
  return created.id;
}

/**
 * Get the current user's wishlist items.
 */
export async function getWishlist(userId: string): Promise<WishlistItem[]> {
  const { data, error } = await supabase
    .from('wishlist_items')
    .select('*')
    .eq('user_id', userId)
    .order('priority', { ascending: false })
    .order('created_at', { ascending: false });

  if (error) throw error;
  return data ?? [];
}

/**
 * Add a new item to the user's wishlist.
 * Auto-creates a wishlist row if the user doesn't have one yet.
 */
export async function addToWishlist(data: Omit<WishlistItemInsert, 'wishlist_id' | 'user_id'> & {
  userId: string;
}): Promise<WishlistItem> {
  const wishlistId = await ensureWishlist(data.userId);

  const { data: item, error } = await supabase
    .from('wishlist_items')
    .insert({
      wishlist_id: wishlistId,
      user_id: data.userId,
      brand: data.brand ?? null,
      model_name: data.model_name ?? null,
      category: data.category ?? null,
      max_price: data.max_price ?? null,
      notes: data.notes ?? null,
      source_url: data.source_url ?? null,
      target_price: data.target_price ?? null,
      current_savings: data.current_savings ?? 0,
      target_date: data.target_date ?? null,
      image_url: data.image_url ?? null,
      priority: data.priority ?? 0,
    })
    .select()
    .single();

  if (error) throw error;
  return item;
}

/**
 * Remove a wishlist item.
 */
export async function removeFromWishlist(id: string): Promise<void> {
  const { error } = await supabase.from('wishlist_items').delete().eq('id', id);
  if (error) throw error;
}

/**
 * Update the savings amount for a wishlist item.
 */
export async function updateSavings(id: string, amount: number): Promise<WishlistItem> {
  const { data, error } = await supabase
    .from('wishlist_items')
    .update({ current_savings: amount })
    .eq('id', id)
    .select()
    .single();

  if (error) throw error;
  return data;
}

/**
 * Update a wishlist item (general purpose).
 */
export async function updateWishlistItem(
  id: string,
  updates: WishlistItemUpdate
): Promise<WishlistItem> {
  const { data, error } = await supabase
    .from('wishlist_items')
    .update(updates)
    .eq('id', id)
    .select()
    .single();

  if (error) throw error;
  return data;
}

/**
 * Drop a hint to the activity feed that the user is dreaming about an item.
 */
export async function dropHint(
  itemId: string,
  userId: string,
  circleId?: string | null,
  displayName?: string | null
): Promise<void> {
  const { data: item } = await supabase
    .from('items')
    .select('brand, model_name')
    .eq('id', itemId)
    .maybeSingle();

  const display = item ? [item.brand, item.model_name].filter(Boolean).join(' ') : 'an item';
  const actorName = displayName ?? 'Someone';

  await addActivityEntry({
    circleId: circleId ?? null,
    userId,
    type: 'wishlist_item_added',
    itemId,
    actorName,
    summary: `${actorName} is dreaming about ${display}`,
    metadata: { event: 'drop_hint', item_id: itemId, brand: item?.brand, model_name: item?.model_name },
  });
}

/**
 * Get all wishlist items for members of a circle (social wishlist).
 * Only returns non-private wishlist items.
 */
export async function getCircleWishlists(circleId: string): Promise<
  (WishlistItem & {
    profiles?: { display_name: string | null; avatar_url: string | null } | null;
  })[]
> {
  const { data: members, error: membersError } = await supabase
    .from('circle_members')
    .select('user_id')
    .eq('circle_id', circleId);

  if (membersError) throw membersError;

  const userIds = (members ?? []).map((m) => m.user_id);
  if (userIds.length === 0) return [];

  const { data, error } = await supabase
    .from('wishlist_items')
    .select('*, profiles!wishlist_items_user_id_fkey(display_name, avatar_url)')
    .in('user_id', userIds)
    .order('created_at', { ascending: false });

  if (error) throw error;
  return data ?? [];
}
