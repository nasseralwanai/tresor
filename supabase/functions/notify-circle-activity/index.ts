// Edge Function: notify-circle-activity
//
// Triggered by database webhook on activity_feed insert.
// Sends push notification to circle members for shares/wishes.
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

interface ActivityRecord {
  id: string;
  circle_id: string | null;
  user_id: string | null;
  type: string;
  item_id: string | null;
  borrow_id: string | null;
  actor_name: string | null;
  summary: string | null;
  metadata: Record<string, unknown> | null;
  created_at: string;
}

interface WebhookPayload {
  type: 'INSERT';
  table: string;
  record: ActivityRecord;
}

// Activity types that should trigger push notifications
const NOTIFY_TYPES = new Set([
  'item_added',
  'item_shared',
  'wishlist_shared',
  'wish_added',
  'member_joined',
]);

Deno.serve(async (req: Request) => {
  const optionsResponse = handleOptions(req);
  if (optionsResponse) return optionsResponse;

  try {
    const payload = (await req.json()) as WebhookPayload;
    const activity = payload.record;

    if (!activity) {
      return new Response(
        JSON.stringify({ success: false, error: 'no_record' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Only notify for certain activity types
    if (!NOTIFY_TYPES.has(activity.type)) {
      return new Response(
        JSON.stringify({ success: true, skipped: true, reason: 'type_not_notifiable' }),
        { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    if (!activity.circle_id) {
      return new Response(
        JSON.stringify({ success: true, skipped: true, reason: 'no_circle' }),
        { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Fetch all circle members (excluding the actor)
    const { data: members, error: membersError } = await supabaseAdmin
      .from('circle_members')
      .select('user_id')
      .eq('circle_id', activity.circle_id)
      .neq('user_id', activity.user_id ?? '00000000-0000-0000-0000-000000000000');

    if (membersError || !members) {
      return new Response(
        JSON.stringify({
          success: false,
          error: 'failed_to_fetch_members',
          detail: membersError?.message,
        }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    if (members.length === 0) {
      return new Response(
        JSON.stringify({ success: true, skipped: true, reason: 'no_members' }),
        { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Build the notification title and body based on activity type
    const actorName = activity.actor_name ?? 'Someone';
    let title: string;
    let body: string;
    let pushType: string;

    switch (activity.type) {
      case 'item_added':
      case 'item_shared':
        title = 'New Item Shared';
        body = activity.summary ?? `${actorName} shared a new item in your circle`;
        pushType = 'item_shared';
        break;
      case 'wishlist_shared':
        title = 'Wishlist Shared';
        body = activity.summary ?? `${actorName} shared a wishlist in your circle`;
        pushType = 'item_shared';
        break;
      case 'wish_added':
        title = 'New Wish';
        body = activity.summary ?? `${actorName} added a wish to the circle`;
        pushType = 'circle_activity';
        break;
      case 'member_joined':
        title = 'New Circle Member';
        body = activity.summary ?? `${actorName} joined your circle`;
        pushType = 'circle_activity';
        break;
      default:
        title = 'Circle Activity';
        body = activity.summary ?? `${actorName} posted in your circle`;
        pushType = 'circle_activity';
    }

    // Send push notifications to all circle members (except the actor)
    const pushPromises = members.map((member: { user_id: string }) =>
      fetch(functionUrl, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${serviceRoleKey}`,
        },
        body: JSON.stringify({
          user_id: member.user_id,
          title,
          body,
          type: pushType,
          data: {
            type: pushType,
            activityId: activity.id,
            circleId: activity.circle_id,
            itemId: activity.item_id,
          },
        }),
      }).catch((e) => {
        console.error(`[notify-circle-activity] push failed for user ${member.user_id}:`, e);
      })
    );

    await Promise.all(pushPromises);

    return new Response(
      JSON.stringify({
        success: true,
        notifications_sent: pushPromises.length,
      }),
      { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  } catch (e) {
    console.error('[notify-circle-activity] error:', e);
    return new Response(
      JSON.stringify({
        success: false,
        error: e instanceof Error ? e.message : String(e),
      }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
