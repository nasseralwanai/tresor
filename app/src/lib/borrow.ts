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
      items!borrow_transactions_item_id_fkey(brand, model_name),
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
      items!borrow_transactions_item_id_fkey(brand, model_name),
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
      items!borrow_transactions_item_id_fkey(brand, model_name),
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
      items!borrow_transactions_item_id_fkey(brand, model_name),
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
      items!borrow_transactions_item_id_fkey(brand, model_name),
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
    borrower_name: (data as any).borrower?.display_name ?? 'Unknown',
    lender_name: (data as any).lender?.display_name ?? 'Unknown',
  };
}

/**
 * Get active borrows for a user (items they've borrowed or lent).
 * Returns enriched transactions with item and party names.
 */
export async function getActiveBorrows(userId: string): Promise<BorrowTransactionEnriched[]> {
  const { data, error } = await supabase
    .from('borrow_transactions')
    .select(
      `*,
      items!borrow_transactions_item_id_fkey(brand, model_name),
      borrower:profiles!borrow_transactions_borrower_id_fkey(display_name),
      lender:profiles!borrow_transactions_lender_id_fkey(display_name)
      `
    )
    .or(`borrower_id.eq.${userId},lender_id.eq.${userId}`)
    .in('status', ['requested', 'approved', 'active', 'returned_pending'])
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

/**
 * Get the lending history for a specific item.
 * Returns enriched transactions with item and party names.
 */
export async function getBorrowHistory(itemId: string): Promise<BorrowTransactionEnriched[]> {
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

/**
 * Send a gentle nudge reminder to a borrower.
 * Currently a no-op placeholder — in production this would send a push notification.
 */
export async function nudgeBorrower(_transactionId: string): Promise<void> {
  // TODO(phase3): Send a push notification via expo-notifications
  // For now, this is a silent no-op.
}
