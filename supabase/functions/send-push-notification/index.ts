// Edge Function: send-push-notification
//
// Accepts { user_id, title, body, data } and sends a push notification
// to the target user via the Expo Push API.
//
// Fetches push_token and notification_settings from the profiles table.
// Handles errors gracefully: no token, invalid token, API failure.
//
// Env vars:
//   SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY — injected by Supabase
//   EXPO_ACCESS_TOKEN — Expo push token for authentication

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

const EXPO_PUSH_URL = 'https://exp.host/--/api/v2/push/send';

// Notification type -> settings key mapping
const NOTIFICATION_TYPE_SETTINGS: Record<string, string> = {
  borrow_request: 'borrow_requests',
  borrow_requested: 'borrow_requests',
  borrow_approved: 'borrow_requests',
  borrow_returned: 'borrow_requests',
  borrow_completed: 'borrow_requests',
  borrow_nudge: 'borrow_nudges',
  borrow_nudges: 'borrow_nudges',
  circle_activity: 'circle_activity',
  feed_reaction: 'circle_activity',
  feed_comment: 'circle_activity',
  member_joined: 'circle_activity',
  item_shared: 'item_shares',
  item_shares: 'item_shares',
  wishlist_shared: 'item_shares',
};

interface PushRequest {
  user_id: string;
  title: string;
  body: string;
  data?: Record<string, unknown>;
  type?: string;
}

Deno.serve(async (req: Request) => {
  const optionsResponse = handleOptions(req);
  if (optionsResponse) return optionsResponse;

  try {
    const { user_id, title, body, data, type } =
      (await req.json()) as PushRequest;

    if (!user_id || !title || !body) {
      return new Response(
        JSON.stringify({
          success: false,
          error: 'Missing required fields: user_id, title, body',
        }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Fetch the user's push token and notification settings
    const { data: profile, error: profileError } = await supabaseAdmin
      .from('profiles')
      .select('push_token, notification_settings')
      .eq('id', user_id)
      .maybeSingle();

    if (profileError) {
      return new Response(
        JSON.stringify({
          success: false,
          error: 'database_error',
          detail: profileError.message,
        }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    if (!profile) {
      return new Response(
        JSON.stringify({
          success: false,
          error: 'user_not_found',
        }),
        { status: 404, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Check notification settings — skip if the user has disabled this type
    const settings = profile.notification_settings;
    if (settings && type) {
      const settingsKey = NOTIFICATION_TYPE_SETTINGS[type];
      if (settingsKey && settings[settingsKey] === false) {
        return new Response(
          JSON.stringify({
            success: false,
            error: 'notification_type_disabled',
            message: `User has disabled ${settingsKey} notifications`,
          }),
          { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }
    }

    // No push token — fail gracefully
    if (!profile.push_token) {
      return new Response(
        JSON.stringify({
          success: false,
          error: 'no_push_token',
          message: 'User has no registered push token',
        }),
        { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Send via Expo Push API
    const expoAccessToken = Deno.env.get('EXPO_ACCESS_TOKEN') ?? '';

    const pushPayload = {
      to: profile.push_token,
      title,
      body,
      data: data ?? {},
      sound: 'default',
      badge: 1,
    };

    const pushResponse = await fetch(EXPO_PUSH_URL, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        ...(expoAccessToken
          ? { Authorization: `Bearer ${expoAccessToken}` }
          : {}),
      },
      body: JSON.stringify(pushPayload),
    });

    const pushResult = await pushResponse.json();

    // Check if the push was successful
    if (!pushResponse.ok) {
      console.error('[send-push] Expo API error:', pushResult);
      return new Response(
        JSON.stringify({
          success: false,
          error: 'expo_api_error',
          detail: pushResult,
        }),
        { status: 502, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Check for per-ticket errors
    const tickets = pushResult.data;
    if (Array.isArray(tickets)) {
      const failed = tickets.filter(
        (t: { status: string }) => t.status === 'error'
      );
      if (failed.length > 0) {
        console.error('[send-push] Push ticket errors:', failed);
        return new Response(
          JSON.stringify({
            success: false,
            error: 'push_ticket_error',
            detail: failed,
          }),
          { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }
    }

    return new Response(
      JSON.stringify({
        success: true,
        message: 'Push notification sent',
      }),
      { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  } catch (e) {
    console.error('[send-push] Unexpected error:', e);
    return new Response(
      JSON.stringify({
        success: false,
        error: 'unexpected_error',
        detail: e instanceof Error ? e.message : String(e),
      }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
