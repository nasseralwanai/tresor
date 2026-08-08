/**
 * Borrow logic — manages borrow_transactions lifecycle.
 *
 * Flow: requested → active → returned_pending → completed
 *       (or declined / cancelled at any point)
 *
 * RLS: borrower or lender can read; borrower creates; parties can update.
 *
 * Functions return enriched types with item_brand, item_model, borrower_name,
 * and lender_name by joining items and profiles tables.
 */

import { supabase } from '@/lib/supabase';
import type { Database } from '@/types';

type BorrowInsert = Database['public']['Tables']['borrow_transactions']['Insert'];

/** A borrow transaction enriched with item and party names. */
export type BorrowTransactionEnriched = Database['public']['Tables']['borrow_transactions']['Row'] & {
  item_brand: string;
  item_model: string | null;
  item_primary_image_url: string | null;
  borrower_name: string;
  lender_name: string;
};

/**
 * Request to borrow an item.
 * Creates a borrow_transaction with status 'requested'.
 */
export async function requestBorrow(params: {
  itemId: string;
  borrowerId: string;
  lenderId: string;
  circleId?: string | null;
  note?: string | null;
}): Promise<BorrowTransactionEnriched> {
  const insert: BorrowInsert = {
    item_id: params.itemId,
    borrower_id: params.borrowerId,
    lender_id: params.lenderId,
    circle_id: params.circleId ?? null,
    status: 'requested',
    borrower_note: params.note ?? null,
  };

  const { data, error } = await supabase
    .from('borrow_transactions')
    .insert(insert)
    .select(
      `*,
      items!borrow_transactions_item_id_fkey(brand, model_name, primary_image_url),
      borrower:profiles!borrow_transactions_borrower_id_fkey(display_name),
      lender:profiles!borrow_transactions_lender_id_fkey(display_name)
      `
    )
    .single();

  if (error) throw error;
  return {
    ...data,
    item_brand: (data as any).items?.brand ?? 'Unknown',
    item_model: (data as any).items?.model_name ?? null,
    item_primary_image_url: (data as any).items?.primary_image_url ?? null,
    borrower_name: (data as any).borrower?.display_name ?? 'Unknown',
    lender_name: (data as any).lender?.display_name ?? 'Unknown',
  };
}

/**
 * Accept a borrow request — sets status to 'active' and marks borrowed_at.
 */
export async function acceptBorrow(transactionId: string): Promise<BorrowTransactionEnriched> {
  const { data, error } = await supabase
    .from('borrow_transactions')
    .update({
      status: 'active',
      approved_at: new Date().toISOString(),
      borrowed_at: new Date().toISOString(),
    })
    .eq('id', transactionId)
    .select(
      `*,
      items!borrow_transactions_item_id_fkey(brand, model_name, primary_image_url),
      borrower:profiles!borrow_transactions_borrower_id_fkey(display_name),
      lender:profiles!borrow_transactions_lender_id_fkey(display_name)
      `
    )
    .single();

  if (error) throw error;
  return {
    ...data,
    item_brand: (data as any).items?.brand ?? 'Unknown',
    item_model: (data as any).items?.model_name ?? null,
    item_primary_image_url: (data as any).items?.primary_image_url ?? null,
    borrower_name: (data as any).borrower?.display_name ?? 'Unknown',
    lender_name: (data as any).lender?.display_name ?? 'Unknown',
  };
}

/**
 * Mark an item as returned — sets status to 'returned_pending'.
 * Called by the lender when they receive the item back.
 */
export async function markReturned(transactionId: string): Promise<BorrowTransactionEnriched> {
  const { data, error } = await supabase
    .from('borrow_transactions')
    .update({
      status: 'returned_pending',
      returned_at: new Date().toISOString(),
    })
    .eq('id', transactionId)
    .select(
      `*,
      items!borrow_transactions_item_id_fkey(brand, model_name, primary_image_url),
      borrower:profiles!borrow_transactions_borrower_id_fkey(display_name),
      lender:profiles!borrow_transactions_lender_id_fkey(display_name)
      `
    )
    .single();

  if (error) throw error;
  return {
    ...data,
    item_brand: (data as any).items?.brand ?? 'Unknown',
    item_model: (data as any).items?.model_name ?? null,
    item_primary_image_url: (data as any).items?.primary_image_url ?? null,
    borrower_name: (data as any).borrower?.display_name ?? 'Unknown',
    lender_name: (data as any).lender?.display_name ?? 'Unknown',
  };
}

/**
 * Confirm receipt — sets status to 'completed'.
 * Called by the borrower to confirm they've returned the item.
 */
export async function confirmReceived(transactionId: string): Promise<BorrowTransactionEnriched> {
  const { data, error } = await supabase
    .from('borrow_transactions')
    .update({
      status: 'completed',
      completed_at: new Date().toISOString(),
    })
    .eq('id', transactionId)
    .select(
      `*,
      items!borrow_transactions_item_id_fkey(brand, model_name, primary_image_url),
      borrower:profiles!borrow_transactions_borrower_id_fkey(display_name),
      lender:profiles!borrow_transactions_lender_id_fkey(display_name)
      `
    )
    .single();

  if (error) throw error;
  return {
    ...data,
    item_brand: (data as any).items?.brand ?? 'Unknown',
    item_model: (data as any).items?.model_name ?? null,
    item_primary_image_url: (data as any).items?.primary_image_url ?? null,
    borrower_name: (data as any).borrower?.display_name ?? 'Unknown',
    lender_name: (data as any).lender?.display_name ?? 'Unknown',
  };
}

/**
 * Decline a borrow request.
 */
export async function declineBorrow(transactionId: string): Promise<BorrowTransactionEnriched> {
  const { data, error } = await supabase
    .from('borrow_transactions')
    .update({ status: 'declined' })
    .eq('id', transactionId)
    .select(
      `*,
      items!borrow_transactions_item_id_fkey(brand, model_name, primary_image_url),
      borrower:profiles!borrow_transactions_borrower_id_fkey(display_name),
      lender:profiles!borrow_transactions_lender_id_fkey(display_name)
      `
    )
    .single();

  if (error) throw error;
  return {
    ...data,
    item_brand: (data as any).items?.brand ?? 'Unknown',
    item_model: (data as any).items?.model_name ?? null,
    item_primary_image_url: (data as any).items?.primary_image_url ?? null,
    borrower_name: (data as any).borrower?.display_name ?? 'Unknown',
    lender_name: (data as any).lender?.display_name ?? 'Unknown',
  };
}

/**
 * Get active borrows for a user (items they've borrowed or lent).
 * Returns enriched transactions with item and party names.
 *
 * Uses two parameterized queries (by borrower_id and lender_id) instead of
 * a string-interpolated `.or()` filter to avoid PostgREST filter injection.
 */
export async function getActiveBorrows(userId: string): Promise<BorrowTransactionEnriched[]> {
  const activeStatuses = ['requested', 'approved', 'active', 'returned_pending'];
  const select = `*,
      items!borrow_transactions_item_id_fkey(brand, model_name, primary_image_url),
      borrower:profiles!borrow_transactions_borrower_id_fkey(display_name),
      lender:profiles!borrow_transactions_lender_id_fkey(display_name)
      `;

  // Query borrows where the user is the borrower (parameterized — no interpolation)
  const { data: borrowed, error: borrowerError } = await supabase
    .from('borrow_transactions')
    .select(select)
    .eq('borrower_id', userId)
    .in('status', activeStatuses)
    .order('created_at', { ascending: false })
    .limit(50);

  if (borrowerError) throw borrowerError;

  // Query borrows where the user is the lender (parameterized — no interpolation)
  const { data: lent, error: lenderError } = await supabase
    .from('borrow_transactions')
    .select(select)
    .eq('lender_id', userId)
    .in('status', activeStatuses)
    .order('created_at', { ascending: false })
    .limit(50);

  if (lenderError) throw lenderError;

  // Merge, deduplicate by id, and sort by created_at descending
  const seen = new Set<string>();
  const merged = [...(borrowed ?? []), ...(lent ?? [])].filter((row: any) => {
    if (seen.has(row.id)) return false;
    seen.add(row.id);
    return true;
  });
  merged.sort(
    (a: any, b: any) =>
      new Date(b.created_at).getTime() - new Date(a.created_at).getTime()
  );

  return merged.map((row: any) => ({
    ...row,
    item_brand: row.items?.brand ?? 'Unknown',
    item_model: row.items?.model_name ?? null,
    item_primary_image_url: row.items?.primary_image_url ?? null,
    borrower_name: row.borrower?.display_name ?? 'Unknown',
    lender_name: row.lender?.display_name ?? 'Unknown',
  }));
}

/**
 * Get the lending history for a specific item.
 * Returns enriched transactions with item and party names.
 */
export async function getBorrowHistory(itemId: string): Promise<BorrowTransactionEnriched[]> {
  const { data, error } = await supabase
    .from('borrow_transactions')
    .select(
      `*,
      items!borrow_transactions_item_id_fkey(brand, model_name, primary_image_url),
      borrower:profiles!borrow_transactions_borrower_id_fkey(display_name),
      lender:profiles!borrow_transactions_lender_id_fkey(display_name)
      `
    )
    .eq('item_id', itemId)
    .order('created_at', { ascending: false })
    .limit(50);

  if (error) throw error;
  return (data ?? []).map((row: any) => ({
    ...row,
    item_brand: row.items?.brand ?? 'Unknown',
    item_model: row.items?.model_name ?? null,
    item_primary_image_url: row.items?.primary_image_url ?? null,
    borrower_name: row.borrower?.display_name ?? 'Unknown',
    lender_name: row.lender?.display_name ?? 'Unknown',
  }));
}

/**
 * Send a gentle nudge reminder to a borrower.
 * Currently a no-op placeholder — in production this would send a push notification.
 * UI callers show a "Coming Soon" alert; this function can remain a silent no-op.
 */
export async function nudgeBorrower(_transactionId: string): Promise<void> {
  // TODO(phase3): Send a push notification via expo-notifications
  // For now, this is a silent no-op.
}
