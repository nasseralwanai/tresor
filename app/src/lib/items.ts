/**
 * Item CRUD API — operations on the `items` table via Supabase.
 *
 * RLS: owners have full access to their items; circle members can SELECT
 * non-private items in their circle. Soft-delete sets status to 'unavailable'.
 *
 * Functions return UI-enriched types (with owner_name) by joining profiles.
 */

import { supabase } from '@/lib/supabase';
import type {
  ItemPhoto,
  Database,
} from '@/types';
import type { Item as ItemUI } from '@/types/items';

type ItemInsert = Database['public']['Tables']['items']['Insert'];
type ItemUpdate = Database['public']['Tables']['items']['Update'];

/** Item with its photos joined. */
export type ItemWithPhotos = ItemUI & { item_photos?: ItemPhoto[] };

/**
 * Fetch all items in a circle (RLS filters to circle members).
 * Returns items enriched with the owner's display_name as owner_name.
 */
export async function getItems(circleId: string): Promise<ItemUI[]> {
  const { data, error } = await supabase
    .from('items')
    .select('*, profiles!items_owner_id_fkey(display_name)')
    .eq('circle_id', circleId)
    .order('created_at', { ascending: false });
  if (error) throw error;
  return (data ?? []).map((row: any) => ({
    ...row,
    owner_name: row.profiles?.display_name ?? 'Unknown',
  }));
}

/**
 * Fetch a single item by ID, including its photos.
 * Returns the item enriched with owner_name.
 */
export async function getItem(id: string): Promise<ItemWithPhotos | null> {
  const { data, error } = await supabase
    .from('items')
    .select('*, item_photos(*), profiles!items_owner_id_fkey(display_name)')
    .eq('id', id)
    .maybeSingle();
  if (error) throw error;
  if (!data) return null;
  return {
    ...data,
    owner_name: (data as any).profiles?.display_name ?? 'Unknown',
  };
}

/** Create a new item. Returns the created item enriched with owner_name. */
export async function createItem(data: ItemInsert): Promise<ItemUI> {
  const { data: item, error } = await supabase
    .from('items')
    .insert(data)
    .select('*, profiles!items_owner_id_fkey(display_name)')
    .single();
  if (error) throw error;
  return {
    ...item,
    owner_name: (item as any).profiles?.display_name ?? 'Unknown',
  };
}

/** Update an existing item. Returns the updated item enriched with owner_name. */
export async function updateItem(id: string, data: ItemUpdate): Promise<ItemUI> {
  const { data: item, error } = await supabase
    .from('items')
    .update(data)
    .eq('id', id)
    .select('*, profiles!items_owner_id_fkey(display_name)')
    .single();
  if (error) throw error;
  return {
    ...item,
    owner_name: (item as any).profiles?.display_name ?? 'Unknown',
  };
}

/** Soft-delete an item by setting status to 'unavailable'. */
export async function deleteItem(id: string): Promise<void> {
  const { error } = await supabase
    .from('items')
    .update({ status: 'unavailable' })
    .eq('id', id);
  if (error) throw error;
}

/**
 * Fetch all items owned by a user.
 * Returns items enriched with owner_name.
 */
export async function getMyItems(userId: string): Promise<ItemUI[]> {
  const { data, error } = await supabase
    .from('items')
    .select('*, profiles!items_owner_id_fkey(display_name)')
    .eq('owner_id', userId)
    .order('created_at', { ascending: false });
  if (error) throw error;
  return (data ?? []).map((row: any) => ({
    ...row,
    owner_name: row.profiles?.display_name ?? 'Unknown',
  }));
}

/**
 * Fetch items owned by a specific user (for circle browsing).
 * Optionally filter to only lendable, non-private items.
 */
export async function getUserItems(
  userId: string,
  onlyLendable = false
): Promise<ItemUI[]> {
  let query = supabase
    .from('items')
    .select('*, profiles!items_owner_id_fkey(display_name)')
    .eq('owner_id', userId)
    .order('created_at', { ascending: false });

  if (onlyLendable) {
    query = query.eq('is_lendable', true).eq('is_private', false);
  }

  const { data, error } = await query;
  if (error) throw error;
  return (data ?? []).map((row: any) => ({
    ...row,
    owner_name: row.profiles?.display_name ?? 'Unknown',
  }));
}

/**
 * Get the active borrow for an item (status 'active' or 'approved').
 * Returns the borrow transaction enriched with item and party names.
 */
export async function getActiveBorrowForItem(
  itemId: string
): Promise<BorrowTransactionEnriched | null> {
  const { data, error } = await supabase
    .from('borrow_transactions')
    .select(
      `*,
      items!borrow_transactions_item_id_fkey(brand, model_name),
      borrower:profiles!borrow_transactions_borrower_id_fkey(display_name),
      lender:profiles!borrow_transactions_lender_id_fkey(display_name)
      `
    )
    .eq('item_id', itemId)
    .in('status', ['active', 'approved'])
    .order('created_at', { ascending: false })
    .limit(1)
    .maybeSingle();

  if (error) throw error;
  if (!data) return null;

  return {
    ...data,
    item_brand: (data as any).items?.brand ?? 'Unknown',
    item_model: (data as any).items?.model_name ?? null,
    borrower_name: (data as any).borrower?.display_name ?? 'Unknown',
    lender_name: (data as any).lender?.display_name ?? 'Unknown',
  };
}

/**
 * Get borrow history for an item.
 * Returns transactions enriched with item and party names.
 */
export async function getItemBorrowHistory(
  itemId: string
): Promise<BorrowTransactionEnriched[]> {
  const { data, error } = await supabase
    .from('borrow_transactions')
    .select(
      `*,
      items!borrow_transactions_item_id_fkey(brand, model_name),
      borrower:profiles!borrow_transactions_borrower_id_fkey(display_name),
      lender:profiles!borrow_transactions_lender_id_fkey(display_name)
      `
    )
    .eq('item_id', itemId)
    .order('created_at', { ascending: false });

  if (error) throw error;
  return (data ?? []).map((row: any) => ({
    ...row,
    item_brand: row.items?.brand ?? 'Unknown',
    item_model: row.items?.model_name ?? null,
    borrower_name: row.borrower?.display_name ?? 'Unknown',
    lender_name: row.lender?.display_name ?? 'Unknown',
  }));
}

/** Type for enriched borrow transactions with names. */
export type BorrowTransactionEnriched = Database['public']['Tables']['borrow_transactions']['Row'] & {
  item_brand: string;
  item_model: string | null;
  borrower_name: string;
  lender_name: string;
};
