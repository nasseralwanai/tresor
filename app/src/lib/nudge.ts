/**
 * Nudge library — client-side functions for the borrow nudge feature.
 *
 * Calls the `nudge_borrower()` Postgres RPC function which enforces:
 * - 48h grace period after borrow starts
 * - 24h cooldown between nudges on the same borrow
 * - Max 3 nudges per borrow transaction
 * - Max 5 nudges per lender per day
 *
 * The RPC returns push notification data which the app can send to an
 * Edge Function for push delivery (not yet implemented).
 */

import { supabase } from './supabase';

export type NudgeErrorCode =
  | 'grace_period_active'
  | 'cooldown_active'
  | 'max_nudges_reached'
  | 'daily_limit_reached'
  | 'borrow_not_found_or_not_active'
  | 'rpc_error'
  | 'exception';

export interface NudgeResult {
  success: boolean;
  error?: NudgeErrorCode;
  message?: string;
  next_available_at?: string;
  notification_id?: string;
  push_token?: string | null;
  push_title?: string;
  push_body?: string;
  push_data?: Record<string, unknown>;
}

export interface NudgeStatus {
  nudge_count: number;
  last_nudged_at: string | null;
  can_nudge: boolean;
  next_available_at?: string | null;
}

/** Notification row from the notifications table. */
export interface Notification {
  id: string;
  user_id: string;
  circle_id: string | null;
  type: string;
  title: string;
  body: string | null;
  data: Record<string, unknown> | null;
  read_at: string | null;
  created_at: string;
}

/**
 * Send a gentle reminder to the borrower of an active lend.
 * Uses the current authenticated user as the lender (auth.uid() in the RPC).
 * @param borrowId — The borrow transaction ID
 * @returns NudgeResult with success or rate-limit error details
 */
export async function nudgeBorrower(borrowId: string): Promise<NudgeResult> {
  try {
    // Get current user ID for the RPC call
    const {
      data: { user },
    } = await supabase.auth.getUser();
    if (!user) {
      return { success: false, error: 'exception', message: 'Not authenticated' };
    }

    const { data, error } = await supabase.rpc('nudge_borrower', {
      _borrow_id: borrowId,
      _lender_id: user.id,
    });

    if (error) {
      return {
        success: false,
        error: 'rpc_error',
        message: error.message,
      };
    }

    return (data as NudgeResult) ?? { success: false, error: 'exception' };
  } catch (e: unknown) {
    const msg = e instanceof Error ? e.message : 'Unknown error';
    return { success: false, error: 'exception', message: msg };
  }
}

/**
 * Get the nudge status for a borrow transaction.
 * Returns nudge_count, last_nudged_at, and whether a nudge is currently allowed.
 */
export async function getNudgeStatus(borrowId: string): Promise<NudgeStatus> {
  const { data, error } = await supabase
    .from('borrow_transactions')
    .select('nudge_count, last_nudged_at')
    .eq('id', borrowId)
    .single();

  if (error || !data) {
    return { nudge_count: 0, last_nudged_at: null, can_nudge: true };
  }

  const nudge_count = data.nudge_count ?? 0;
  const last_nudged_at = data.last_nudged_at;

  // Check if nudge is allowed (basic client-side check; server enforces authoritatively)
  let can_nudge = true;
  let next_available_at: string | null = null;

  if (nudge_count >= 3) {
    can_nudge = false;
  } else if (last_nudged_at) {
    const last = new Date(last_nudged_at).getTime();
    const hoursSince = (Date.now() - last) / 3600000;
    if (hoursSince < 24) {
      can_nudge = false;
      next_available_at = new Date(last + 86400000).toISOString();
    }
  }

  return { nudge_count, last_nudged_at, can_nudge, next_available_at };
}

/**
 * Human-readable error messages for rate-limit failures.
 */
export function nudgeErrorMessage(code: NudgeErrorCode): string {
  switch (code) {
    case 'grace_period_active':
      return 'This piece was borrowed recently. Wait a day before sending a reminder.';
    case 'cooldown_active':
      return 'You already sent a reminder recently. Give it some time.';
    case 'max_nudges_reached':
      return 'You have sent all allowed reminders for this borrow.';
    case 'daily_limit_reached':
      return 'You have sent too many reminders today. Try again tomorrow.';
    case 'borrow_not_found_or_not_active':
      return 'This borrow is no longer active.';
    default:
      return 'Something went wrong. Please try again.';
  }
}

/**
 * Get the nudge history for a borrow transaction.
 * Both lender and borrower can view this (RLS enforced).
 */
export async function getNudgeHistory(borrowId: string) {
  const { data, error } = await supabase
    .from('borrow_nudges')
    .select('id, message_variant, nudged_at, lender_id')
    .eq('borrow_id', borrowId)
    .order('nudged_at', { ascending: false });

  if (error) throw error;
  return data ?? [];
}

/**
 * Get unread notification count for the current user.
 */
export async function getUnreadNotificationCount(): Promise<number> {
  const { count, error } = await supabase
    .from('notifications')
    .select('id', { count: 'exact', head: true })
    .is('read_at', null);

  if (error) return 0;
  return count ?? 0;
}

/**
 * Get recent notifications for the current user.
 */
export async function getNotifications(limit = 20) {
  const { data, error } = await supabase
    .from('notifications')
    .select('*')
    .order('created_at', { ascending: false })
    .limit(limit);

  if (error) throw error;
  return data ?? [];
}

/**
 * Mark a notification as read.
 */
export async function markNotificationRead(notificationId: string) {
  const { error } = await supabase
    .from('notifications')
    .update({ read_at: new Date().toISOString() })
    .eq('id', notificationId);

  if (error) throw error;
}

/**
 * Mark all notifications as read for the current user.
 */
export async function markAllNotificationsRead() {
  const { error } = await supabase
    .from('notifications')
    .update({ read_at: new Date().toISOString() })
    .is('read_at', null);

  if (error) throw error;
}
