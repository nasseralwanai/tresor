/**
 * Borrow API — request, approve, return, and query borrow transactions.
 *
 * TODO(backend): Replace mock with real Supabase queries:
 *   supabase.from('borrow_transactions').select('*, items(*), profiles!borrower_id(*), profiles!lender_id(*)')
 */

import type { BorrowTransaction } from '@/types/items';
import { mockBorrowTransactions, mockCurrentUser } from './mockData';

function delay(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

/** Request to borrow an item. */
export async function requestBorrow(itemId: string, note?: string): Promise<void> {
  await delay(500);
  // TODO(backend): Insert a borrow_transactions row with status='requested'
  console.log('Borrow requested for item', itemId, 'with note:', note);
}

/** Mark an item as returned (borrower action). */
export async function markReturned(borrowId: string): Promise<void> {
  await delay(500);
  const tx = mockBorrowTransactions.find((t) => t.id === borrowId);
  if (tx) {
    tx.status = 'returned_pending';
    tx.returned_at = new Date().toISOString();
  }
}

/** Nudge a borrower (lender action). */
export async function nudgeBorrower(borrowId: string): Promise<void> {
  await delay(400);
  // TODO(backend): Send a push notification
  console.log('Nudge sent for borrow', borrowId);
}

/** Get the active borrow for an item, if any. */
export async function getActiveBorrowForItem(itemId: string): Promise<BorrowTransaction | null> {
  await delay(300);
  return (
    mockBorrowTransactions.find(
      (t) => t.item_id === itemId && (t.status === 'active' || t.status === 'approved'),
    ) ?? null
  );
}

/** Get all active borrows involving the current user. */
export async function getMyActiveBorrows(): Promise<BorrowTransaction[]> {
  await delay(400);
  return mockBorrowTransactions.filter(
    (t) =>
      (t.borrower_id === mockCurrentUser.id || t.lender_id === mockCurrentUser.id) &&
      t.status === 'active',
  );
}

/** Get borrow history for a specific item. */
export async function getItemBorrowHistory(itemId: string): Promise<BorrowTransaction[]> {
  await delay(300);
  return mockBorrowTransactions.filter((t) => t.item_id === itemId);
}
