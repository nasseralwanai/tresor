// Edge Function: notify-borrow-event
//
// Triggered by database webhook on borrow_transactions insert/update.
// Sends push notification to the item owner when someone borrows.
// Sends push notification to borrower when item is returned.
//
// Env vars:
//   SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY — injected by Supabase
//   EXPO_ACCESS_TOKEN — Expo push token (set locally for testing)

import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';
import { corsHeaders, handleOptions } from '../_shared/cors.ts';

const supabaseUrl = Deno.env.get('SUPABASE_URL') ?? '';
const serviceRoleKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? '';
const functionUrl = `${supabaseUrl}/functions/v1/send-push-notification`;

if (!supabaseUrl || !serviceRoleKey) {
  throw new Error('Missing SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY');
}

const supabaseAdmin = createClient(supabaseUrl, serviceRoleKey, {
  auth: { persistSession: false, autoRefreshToken: false },
});

interface BorrowRecord {
  id: string;
  item_id: string;
  borrower_id: string;
  lender_id: string;
  circle_id: string | null;
  status: string;
  borrowed_at: string | null;
  returned_at: string | null;
}

interface WebhookPayload {
  type: 'INSERT' | 'UPDATE';
  table: string;
  record: BorrowRecord;
  old_record?: BorrowRecord;
}

async function callSendPush(
  userId: string,
  title: string,
  body: string,
  type: string,
  data: Record<string, unknown>
): Promise<void> {
  try {
    await fetch(functionUrl, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${serviceRoleKey}`,
      },
      body: JSON.stringify({ user_id: userId, title, body, type, data }),
    });
  } catch (e) {
    console.error('[notify-borrow-event] send-push call failed:', e);
  }
}

Deno.serve(async (req: Request) => {
  const optionsResponse = handleOptions(req);
  if (optionsResponse) return optionsResponse;

  try {
    const payload = (await req.json()) as WebhookPayload;
    const borrow = payload.record;

    if (!borrow) {
      return new Response(
        JSON.stringify({ success: false, error: 'no_record' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Fetch item info for the notification message
    const { data: item } = await supabaseAdmin
      .from('items')
      .select('brand, model_name')
      .eq('id', borrow.item_id)
      .maybeSingle();

    const itemDisplay = item
      ? [item.brand, item.model_name].filter(Boolean).join(' ')
      : 'an item';

    // Fetch borrower and lender names
    const { data: borrower } = await supabaseAdmin
      .from('profiles')
      .select('display_name')
      .eq('id', borrow.borrower_id)
      .maybeSingle();

    const { data: lender } = await supabaseAdmin
      .from('profiles')
      .select('display_name')
      .eq('id', borrow.lender_id)
      .maybeSingle();

    const borrowerName = borrower?.display_name ?? 'Someone';
    const lenderName = lender?.display_name ?? 'Someone';

    const notifications: Promise<void>[] = [];

    // INSERT: new borrow request — notify the lender (item owner)
    if (payload.type === 'INSERT' && borrow.status === 'requested') {
      notifications.push(
        callSendPush(
          borrow.lender_id,
          'New Borrow Request',
          `${borrowerName} wants to borrow your ${itemDisplay}`,
          'borrow_request',
          {
            type: 'borrow_request',
            itemId: borrow.item_id,
            borrowId: borrow.id,
          }
        )
      );
    }

    // UPDATE: status changed
    if (payload.type === 'UPDATE' && payload.old_record) {
      const oldStatus = payload.old_record.status;
      const newStatus = borrow.status;

      // Borrow approved/active — notify borrower
      if (
        (newStatus === 'active' || newStatus === 'approved') &&
        oldStatus === 'requested'
      ) {
        notifications.push(
          callSendPush(
            borrow.borrower_id,
            'Borrow Approved',
            `${lenderName} approved your request to borrow the ${itemDisplay}`,
            'borrow_request',
            {
              type: 'borrow_request',
              itemId: borrow.item_id,
              borrowId: borrow.id,
            }
          )
        );
      }

      // Item returned — notify borrower
      if (
        newStatus === 'returned_pending' &&
        oldStatus === 'active'
      ) {
        notifications.push(
          callSendPush(
            borrow.borrower_id,
            'Item Returned',
            `${lenderName} has marked the ${itemDisplay} as returned`,
            'borrow_request',
            {
              type: 'borrow_request',
              itemId: borrow.item_id,
              borrowId: borrow.id,
            }
          )
        );
      }

      // Borrow declined — notify borrower
      if (newStatus === 'declined' && oldStatus === 'requested') {
        notifications.push(
          callSendPush(
            borrow.borrower_id,
            'Borrow Declined',
            `${lenderName} declined your request to borrow the ${itemDisplay}`,
            'borrow_request',
            {
              type: 'borrow_request',
              itemId: borrow.item_id,
              borrowId: borrow.id,
            }
          )
        );
      }

      // Borrow completed — notify both parties
      if (newStatus === 'completed' && oldStatus === 'returned_pending') {
        notifications.push(
          callSendPush(
            borrow.borrower_id,
            'Borrow Completed',
            `Your borrow of the ${itemDisplay} is complete`,
            'borrow_request',
            {
              type: 'borrow_request',
              itemId: borrow.item_id,
              borrowId: borrow.id,
            }
          )
        );
      }
    }

    await Promise.all(notifications);

    return new Response(
      JSON.stringify({
        success: true,
        notifications_sent: notifications.length,
      }),
      { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  } catch (e) {
    console.error('[notify-borrow-event] error:', e);
    return new Response(
      JSON.stringify({
        success: false,
        error: e instanceof Error ? e.message : String(e),
      }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
