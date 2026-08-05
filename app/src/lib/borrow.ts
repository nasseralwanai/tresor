/**
 * Borrow logic — manages borrow_transactions lifecycle.
 *
 * Flow: requested → active → returned_pending → completed
 *       (or declined / cancelled at any point)
 *
 * RLS: borrower or lender can read; borrower creates; parties can update.
 */

import { supabase } from '@/lib/supabase';
import type { BorrowTransaction, Database } from '@/types';

type BorrowInsert = Database['public']['Tables']['borrow_transactions']['Insert'];

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
}): Promise<BorrowTransaction> {
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
    .select()
    .single();

  if (error) throw error;
  return data;
}

/**
 * Accept a borrow request — sets status to 'active' and marks borrowed_at.
 */
export async function acceptBorrow(transactionId: string): Promise<BorrowTransaction> {
  const { data, error } = await supabase
    .from('borrow_transactions')
    .update({
      status: 'active',
      approved_at: new Date().toISOString(),
      borrowed_at: new Date().toISOString(),
    })
    .eq('id', transactionId)
    .select()
    .single();

  if (error) throw error;
  return data;
}

/**
 * Mark an item as returned — sets status to 'returned_pending'.
 * Called by the lender when they receive the item back.
 */
export async function markReturned(transactionId: string): Promise<BorrowTransaction> {
  const { data, error } = await supabase
    .from('borrow_transactions')
    .update({
      status: 'returned_pending',
      returned_at: new Date().toISOString(),
    })
    .eq('id', transactionId)
    .select()
    .single();

  if (error) throw error;
  return data;
}

/**
 * Confirm receipt — sets status to 'completed'.
 * Called by the borrower to confirm they've returned the item.
 */
export async function confirmReceived(transactionId: string): Promise<BorrowTransaction> {
  const { data, error } = await supabase
    .from('borrow_transactions')
    .update({
      status: 'completed',
      completed_at: new Date().toISOString(),
    })
    .eq('id', transactionId)
    .select()
    .single();

  if (error) throw error;
  return data;
}

/**
 * Decline a borrow request.
 */
export async function declineBorrow(transactionId: string): Promise<BorrowTransaction> {
  const { data, error } = await supabase
    .from('borrow_transactions')
    .update({ status: 'declined' })
    .eq('id', transactionId)
    .select()
    .single();

  if (error) throw error;
  return data;
}

/**
 * Get active borrows for a user (items they've borrowed or lent).
 */
export async function getActiveBorrows(userId: string): Promise<BorrowTransaction[]> {
  const { data, error } = await supabase
    .from('borrow_transactions')
    .select('*')
    .or(`borrower_id.eq.${userId},lender_id.eq.${userId}`)
    .in('status', ['requested', 'approved', 'active', 'returned_pending'])
    .order('created_at', { ascending: false });

  if (error) throw error;
  return data ?? [];
}

/**
 * Get the lending history for a specific item.
 */
export async function getBorrowHistory(itemId: string): Promise<BorrowTransaction[]> {
  const { data, error } = await supabase
    .from('borrow_transactions')
    .select('*')
    .eq('item_id', itemId)
    .order('created_at', { ascending: false });

  if (error) throw error;
  return data ?? [];
}
