// Edge Function: check-overdue-borrows
//
// Cron-triggered Edge Function (runs daily).
// Checks borrow_transactions where item is still lent out.
// For borrows older than 7 days, creates a borrow_nudge record.
// The nudge triggers notify-nudge function via database webhook.
//
// Rate limits: max 3 nudges per borrow, 24h cooldown between nudges.
//
// Env vars:
//   SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY — injected by Supabase

import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';
import { corsHeaders, handleOptions } from '../_shared/cors.ts';

const supabaseUrl = Deno.env.get('SUPABASE_URL') ?? '';
const serviceRoleKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? '';

if (!supabaseUrl || !serviceRoleKey) {
  throw new Error('Missing SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY');
}

const supabaseAdmin = createClient(supabaseUrl, serviceRoleKey, {
  auth: { persistSession: false, autoRefreshToken: false },
});

// 7 days in milliseconds
const OVERDUE_THRESHOLD_MS = 7 * 24 * 60 * 60 * 1000;
// 24 hours in milliseconds (cooldown)
const COOLDOWN_MS = 24 * 60 * 60 * 1000;
// Max nudges per borrow
const MAX_NUDGES = 3;

Deno.serve(async (req: Request) => {
  const optionsResponse = handleOptions(req);
  if (optionsResponse) return optionsResponse;

  try {
    const now = new Date();
    const overdueThreshold = new Date(now.getTime() - OVERDUE_THRESHOLD_MS);

    // Fetch active borrows where borrowed_at is older than 7 days
    const { data: overdueBorrows, error: fetchError } = await supabaseAdmin
      .from('borrow_transactions')
      .select('id, item_id, borrower_id, lender_id, circle_id, borrowed_at, nudge_count, last_nudged_at')
      .eq('status', 'active')
      .not('borrowed_at', 'is', null)
      .lt('borrowed_at', overdueThreshold.toISOString())
      .lt('nudge_count', MAX_NUDGES);

    if (fetchError) {
      console.error('[check-overdue] fetch error:', fetchError);
      return new Response(
        JSON.stringify({ success: false, error: fetchError.message }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    if (!overdueBorrows || overdueBorrows.length === 0) {
      return new Response(
        JSON.stringify({ success: true, checked: 0, nudged: 0 }),
        { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    let nudgedCount = 0;
    const nudgesToInsert: Array<{
      borrow_id: string;
      lender_id: string;
      borrower_id: string;
      message_variant: string;
    }> = [];

    for (const borrow of overdueBorrows) {
      // Check 24h cooldown
      if (borrow.last_nudged_at) {
        const lastNudge = new Date(borrow.last_nudged_at);
        const elapsed = now.getTime() - lastNudge.getTime();
        if (elapsed < COOLDOWN_MS) {
          continue; // Still in cooldown
        }
      }

      // Calculate days borrowed for message variant
      const borrowedAt = new Date(borrow.borrowed_at);
      const daysBorrowed = Math.floor(
        (now.getTime() - borrowedAt.getTime()) / (24 * 60 * 60 * 1000)
      );

      const messageVariant =
        daysBorrowed < 7
          ? 'early'
          : daysBorrowed < 14
            ? 'standard'
            : daysBorrowed < 28
              ? 'extended'
              : 'long';

      nudgesToInsert.push({
        borrow_id: borrow.id,
        lender_id: borrow.lender_id,
        borrower_id: borrow.borrower_id,
        message_variant: messageVariant,
      });
    }

    // Insert nudge records (batch)
    if (nudgesToInsert.length > 0) {
      const { data: insertedNudges, error: insertError } = await supabaseAdmin
        .from('borrow_nudges')
        .insert(nudgesToInsert)
        .select('borrow_id, lender_id');

      if (insertError) {
        console.error('[check-overdue] insert error:', insertError);
        return new Response(
          JSON.stringify({ success: false, error: insertError.message }),
          { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }

      nudgedCount = insertedNudges?.length ?? 0;

      // Update borrow_transactions with new nudge count and last_nudged_at
      const updatePromises = nudgesToInsert.map((nudge) =>
        supabaseAdmin
          .from('borrow_transactions')
          .update({
            last_nudged_at: now.toISOString(),
            nudge_count: (overdueBorrows.find(
              (b) => b.id === nudge.borrow_id
            )?.nudge_count ?? 0) + 1,
          })
          .eq('id', nudge.borrow_id)
      );

      await Promise.all(updatePromises);

      // Note: The borrow_nudges insert will trigger the notify-nudge
      // edge function via database webhook, which sends the push notification.
      // No need to call it directly here.
    }

    return new Response(
      JSON.stringify({
        success: true,
        checked: overdueBorrows.length,
        nudged: nudgedCount,
        threshold_days: 7,
      }),
      { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  } catch (e) {
    console.error('[check-overdue] error:', e);
    return new Response(
      JSON.stringify({
        success: false,
        error: e instanceof Error ? e.message : String(e),
      }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
