// Edge Function: notify-nudge
//
// Triggered by database webhook on borrow_nudges insert.
// Sends a push notification to the borrower with the nudge message.
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

interface NudgeRecord {
  id: string;
  borrow_id: string;
  lender_id: string;
  borrower_id: string;
  message_variant: string;
  nudged_at: string;
}

interface WebhookPayload {
  type: 'INSERT';
  table: string;
  record: NudgeRecord;
}

// Message variants for different borrow durations
const NUDGE_MESSAGES: Record<
  string,
  { title: string; bodyTemplate: string }
> = {
  early: {
    title: 'Gentle Reminder',
    bodyTemplate: '{lender} sent a reminder about the {item}. No rush — return it when you can.',
  },
  standard: {
    title: 'Borrow Reminder',
    bodyTemplate: '{lender} is wondering about the {item} you borrowed. No rush — return it when you can.',
  },
  extended: {
    title: 'Item Reminder',
    bodyTemplate: 'The {item} from {lender} has been borrowed for a while. Consider returning it soon.',
  },
  long: {
    title: 'Time to Return',
    bodyTemplate: 'The {item} borrowed from {lender} has been out for quite some time. Please arrange its return.',
  },
};

Deno.serve(async (req: Request) => {
  const optionsResponse = handleOptions(req);
  if (optionsResponse) return optionsResponse;

  try {
    const payload = (await req.json()) as WebhookPayload;
    const nudge = payload.record;

    if (!nudge) {
      return new Response(
        JSON.stringify({ success: false, error: 'no_record' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Fetch the borrow transaction to get item and timing info
    const { data: borrow } = await supabaseAdmin
      .from('borrow_transactions')
      .select('item_id, borrowed_at, lender_id')
      .eq('id', nudge.borrow_id)
      .maybeSingle();

    if (!borrow) {
      return new Response(
        JSON.stringify({ success: false, error: 'borrow_not_found' }),
        { status: 404, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Fetch item display name
    const { data: item } = await supabaseAdmin
      .from('items')
      .select('brand, model_name')
      .eq('id', borrow.item_id)
      .maybeSingle();

    const itemDisplay = item
      ? [item.brand, item.model_name].filter(Boolean).join(' ')
      : 'item';

    // Fetch lender name
    const { data: lenderProfile } = await supabaseAdmin
      .from('profiles')
      .select('display_name')
      .eq('id', nudge.lender_id)
      .maybeSingle();

    const lenderName = lenderProfile?.display_name ?? 'The owner';

    // Build nudge message
    const variant = NUDGE_MESSAGES[nudge.message_variant] ?? NUDGE_MESSAGES.standard;
    const body = variant.bodyTemplate
      .replace('{lender}', lenderName)
      .replace('{item}', itemDisplay);

    // Send push notification to the borrower
    try {
      await fetch(functionUrl, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${serviceRoleKey}`,
        },
        body: JSON.stringify({
          user_id: nudge.borrower_id,
          title: variant.title,
          body,
          type: 'borrow_nudge',
          data: {
            type: 'borrow_nudge',
            borrowId: nudge.borrow_id,
            nudgeId: nudge.id,
          },
        }),
      });
    } catch (e) {
      console.error('[notify-nudge] send-push call failed:', e);
    }

    return new Response(
      JSON.stringify({ success: true }),
      { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  } catch (e) {
    console.error('[notify-nudge] error:', e);
    return new Response(
      JSON.stringify({
        success: false,
        error: e instanceof Error ? e.message : String(e),
      }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
