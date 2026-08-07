/**
 * Nudge logic — sends gentle reminders to borrowers and manages notifications.
 *
 * Calls the `nudge_borrower()` Postgres RPC via Supabase, which enforces
 * server-side rate limits: 48h grace period, 24h cooldown, max 3 per borrow,
 * max 5 per lender per day.
 *
 * Also provides helpers to fetch and mark-as-read the user's notifications.
 */

import { supabase } from '@/lib/supabase';
import type { Database } from '@/types';
import type { Json } from '@/types/database.types';

// ── Types ──

/** Error codes returned by the nudge_borrower() RPC when rate-limited. */
export type NudgeErrorCode =
  | 'cooldown_active'
  | 'grace_period_active'
  | 'max_nudges_reached'
  | 'daily_limit_reached';

/** Result of a successful nudge. */
export interface NudgeSuccess {
  success: true;
  notification_id: string;
  push_title: string;
  push_body: string;
}

/** Result of a rate-limited or failed nudge. */
export interface NudgeFailure {
  success: false;
  error: NudgeErrorCode;
}

/** Union result type returned by nudgeBorrower(). */
export type NudgeResult = NudgeSuccess | NudgeFailure;

/** A notification row from the `notifications` table. */
export type Notification = Database['public']['Tables']['notifications']['Row'];

/** Nudge status for a specific borrow transaction. */
export interface NudgeStatus {
  nudge_count: number;
  last_nudged_at: string | null;
  can_nudge: boolean;
}

// ── Functions ──

/**
 * Send a nudge reminder to a borrower.
 * Calls the `nudge_borrower(_borrow_id, _lender_id)` Postgres RPC.
 * The current authenticated user is used as the lender.
 *
 * Rate limits enforced server-side:
 * - 48h grace period after borrow starts
 * - 24h cooldown between nudges
 * - Max 3 nudges per borrow transaction
 * - Max 5 nudges per lender per day
 */
export async function nudgeBorrower(borrowId: string): Promise<NudgeResult> {
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return { success: false, error: 'daily_limit_reached' };
  }

  const { data, error } = await supabase.rpc('nudge_borrower', {
    _borrow_id: borrowId,
    _lender_id: user.id,
  });

  if (error) {
    throw error;
  }

  // The RPC returns JSON; cast to our typed result shape.
  return data as unknown as NudgeResult;
}

/**
 * Fetch the current user's unread notifications (read_at is null).
 * RLS ensures users can only see their own.
 */
export async function getNotifications(): Promise<Notification[]> {
  const { data, error } = await supabase
    .from('notifications')
    .select('*')
    .is('read_at', null)
    .order('created_at', { ascending: false })
    .limit(50);

  if (error) throw error;
  return data ?? [];
}

/**
 * Count the current user's unread notifications.
 * Useful for badge counts without fetching full rows.
 */
export async function getUnreadNotificationCount(): Promise<number> {
  const { count, error } = await supabase
    .from('notifications')
    .select('*', { count: 'exact', head: true })
    .is('read_at', null);

  if (error) throw error;
  return count ?? 0;
}

/**
 * Mark a notification as read by setting read_at to the current timestamp.
 * RLS ensures users can only update their own notifications.
 */
export async function markNotificationRead(id: string): Promise<void> {
  const { error } = await supabase
    .from('notifications')
    .update({ read_at: new Date().toISOString() })
    .eq('id', id);

  if (error) throw error;
}

/**
 * Get the nudge status for a specific borrow transaction.
 * Returns the nudge_count, last_nudged_at timestamp, and a can_nudge
 * boolean indicating whether the lender can nudge right now.
 *
 * Note: can_nudge is a client-side approximation based on the 24h cooldown.
 * The server enforces the full rules (grace period, max per borrow, daily limit).
 */
export async function getNudgeStatus(borrowId: string): Promise<NudgeStatus> {
  const { data, error } = await supabase
    .from('borrow_transactions')
    .select('nudge_count, last_nudged_at')
    .eq('id', borrowId)
    .single();

  if (error) throw error;

  const nudge_count = data?.nudge_count ?? 0;
  const last_nudged_at = data?.last_nudged_at ?? null;

  // Client-side cooldown check: 24h since last nudge.
  // The server is the source of truth — this is just for UI hints.
  let can_nudge = true;
  if (last_nudged_at) {
    const elapsed = Date.now() - new Date(last_nudged_at).getTime();
    const COOLDOWN_MS = 24 * 60 * 60 * 1000; // 24 hours
    if (elapsed < COOLDOWN_MS) can_nudge = false;
  }
  if (nudge_count >= 3) can_nudge = false;

  return { nudge_count, last_nudged_at, can_nudge };
}

/**
 * Map a nudge error code to a human-readable message for the UI.
 */
export function nudgeErrorMessage(error: NudgeErrorCode): string {
  switch (error) {
    case 'grace_period_active':
      return 'Grace period active. You can nudge 48 hours after the borrow starts.';
    case 'cooldown_active':
      return 'You can send one nudge every 24 hours. Please wait a bit longer.';
    case 'max_nudges_reached':
      return 'Maximum nudges reached for this borrow (3 of 3).';
    case 'daily_limit_reached':
      return 'Daily nudge limit reached (5 per day). Try again tomorrow.';
    default:
      return 'Unable to send nudge at this time.';
  }
}

// Re-export Json type for consumers that need it.
export type { Json };
