/**
 * Item CRUD API — operations on the `items` table via Supabase.
 *
 * RLS: owners have full access to their items; circle members can SELECT
 * items in their circle. Soft-delete sets status to 'unavailable'.
 */

import { supabase } from '@/lib/supabase';
import type {
  Item,
  ItemPhoto,
  Database,
} from '@/types';

type ItemInsert = Database['public']['Tables']['items']['Insert'];
type ItemUpdate = Database['public']['Tables']['items']['Update'];

/** Item with its photos joined. */
export type ItemWithPhotos = Item & { item_photos?: ItemPhoto[] };

/** Fetch all items in a circle (RLS filters to circle members). */
export async function getItems(circleId: string): Promise<Item[]> {
  const { data, error } = await supabase
    .from('items')
    .select('*')
    .eq('circle_id', circleId)
    .order('created_at', { ascending: false });
  if (error) throw error;
  return data ?? [];
}

/** Fetch a single item by ID, including its photos. */
export async function getItem(id: string): Promise<ItemWithPhotos | null> {
  const { data, error } = await supabase
    .from('items')
    .select('*, item_photos(*)')
    .eq('id', id)
    .maybeSingle();
  if (error) throw error;
  return data;
}

/** Create a new item. */
export async function createItem(data: ItemInsert): Promise<Item> {
  const { data: item, error } = await supabase
    .from('items')
    .insert(data)
    .select()
    .single();
  if (error) throw error;
  return item;
}

/** Update an existing item. */
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

/** Soft-delete an item by setting status to 'unavailable'. */
export async function deleteItem(id: string): Promise<void> {
  const { error } = await supabase
    .from('items')
    .update({ status: 'unavailable' })
    .eq('id', id);
  if (error) throw error;
}

/** Fetch all items owned by a user. */
export async function getMyItems(userId: string): Promise<Item[]> {
  const { data, error } = await supabase
    .from('items')
    .select('*')
    .eq('owner_id', userId)
    .order('created_at', { ascending: false });
  if (error) throw error;
  return data ?? [];
}
