/**
 * Item CRUD API — operations on the `items` table via Supabase.
 *
 * RLS: owners have full access to their items; circle members can SELECT
 * items in their circle. Soft-delete sets status to 'unavailable' (there's
 * no 'removed' enum value; the schema uses 'available', 'borrowed', 'unavailable').
 */

import { supabase } from '@/lib/supabase';
import type {
  Item,
  ItemPhoto,
  Database,
} from '@/types';
import type { CollectionInsights } from '@/types/items';

type ItemInsert = Database['public']['Tables']['items']['Insert'];
type ItemUpdate = Database['public']['Tables']['items']['Update'];

/** Item with its photos joined. */
export type ItemWithPhotos = Item & { item_photos?: ItemPhoto[] };

/**
 * Fetch all items in a circle (RLS filters to circle members).
 */
export async function getItems(circleId: string): Promise<Item[]> {
  const { data, error } = await supabase
    .from('items')
    .select('*')
    .eq('circle_id', circleId)
    .order('created_at', { ascending: false });

  if (error) throw error;
  return data ?? [];
}

/**
 * Fetch a single item by ID, including its photos.
 */
export async function getItem(id: string): Promise<ItemWithPhotos | null> {
  const { data, error } = await supabase
    .from('items')
    .select('*, item_photos(*)')
    .eq('id', id)
    .maybeSingle();

  if (error) throw error;
  return data;
}

/**
 * Create a new item.
 */
export async function createItem(data: ItemInsert): Promise<Item> {
  const { data: item, error } = await supabase
    .from('items')
    .insert(data)
    .select()
    .single();

  if (error) throw error;
  return item;
}

/**
 * Update an existing item.
 */
export async function updateItem(id: string, data: ItemUpdate): Promise<Item> {
  const { data: item, error } = await supabase
    .from('items')
    .update(data)
    .eq('id', id)
    .select()
    .single();

  if (error) throw error;
  return item;
}

/**
 * Soft-delete an item by setting status to 'unavailable'.
 * (The item_status enum has no 'removed' value.)
 */
export async function deleteItem(id: string): Promise<void> {
  const { error } = await supabase
    .from('items')
    .update({ status: 'unavailable' })
    .eq('id', id);

  if (error) throw error;
}

/**
 * Fetch all items owned by a user.
 */
export async function getMyItems(userId: string): Promise<Item[]> {
  const { data, error } = await supabase
    .from('items')
    .select('*')
    .eq('owner_id', userId)
    .order('created_at', { ascending: false });

  if (error) throw error;
  return data ?? [];
}

/**
 * Fetch the current user's items (uses auth.uid() via RLS).
 * Returns items where owner_id matches the authenticated user.
 */
export async function getMyItemsForCurrentUser(): Promise<Item[]> {
  const { data, error } = await supabase
    .from('items')
    .select('*')
    .order('created_at', { ascending: false });

  if (error) throw error;
  return data ?? [];
}

/**
 * Compute collection insights for the current user's items.
 */
export async function getCollectionInsights(): Promise<CollectionInsights | null> {
  const items = await getMyItemsForCurrentUser();
  if (items.length === 0) {
    return {
      totalValue: 0,
      totalItems: 0,
      currency: 'AED',
      mostValuableItem: null,
      leastUsedItem: null,
      itemsLent: 0,
    };
  }

  const totalValue = items.reduce((sum, item) => sum + (item.estimated_value ?? 0), 0);
  const itemsLent = items.filter((item) => item.status === 'borrowed').length;

  const valuedItems = items.filter((item) => item.estimated_value != null);
  const mostValuableItem = valuedItems.length > 0
    ? valuedItems.reduce((max, item) => (item.estimated_value! > (max.estimated_value ?? 0) ? item : max))
    : null;

  // "Least used" = unavailable items, or just the oldest
  const leastUsedItem = items.find((item) => item.status === 'unavailable') ?? items[items.length - 1];

  return {
    totalValue,
    totalItems: items.length,
    currency: items[0]?.currency ?? 'AED',
    mostValuableItem: mostValuableItem as unknown as CollectionInsights['mostValuableItem'],
    leastUsedItem: leastUsedItem as unknown as CollectionInsights['leastUsedItem'],
    itemsLent,
  };
}
