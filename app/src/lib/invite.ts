/**
 * Invite code API.
 *
 * Validates invite codes against the `circles` table and joins users to
 * circles by inserting into `circle_members`.
 */

import { supabase } from '@/lib/supabase';
import type { InviteCodeValidation } from '@/types';

/**
 * Validate an invite code against the circles table.
 * Returns the circle info plus a preview of its members.
 */
export async function validateInviteCode(code: string): Promise<InviteCodeValidation> {
  const normalized = code.trim().toUpperCase();
  if (!normalized) {
    return { valid: false, error: 'Please enter an invite code.' };
  }

  try {
    // Query the circle by invite_code
    const { data: circle, error } = await supabase
      .from('circles')
      .select('id, name, description, invite_code')
      .eq('invite_code', normalized)
      .maybeSingle();

    if (error) throw error;

    if (!circle) {
      return { valid: false, error: 'This invite code is not valid or has expired.' };
    }

    // Fetch members for the preview — circle_members + profiles join
    const { data: members, error: membersError } = await supabase
      .from('circle_members')
      .select(
        'user_id, profiles!circle_members_user_id_fkey(id, display_name, avatar_url)'
      )
      .eq('circle_id', circle.id)
      .limit(10);

    if (membersError) throw membersError;

    const memberPreviews = (members ?? [])
      .map((m: any) => m.profiles)
      .filter(Boolean)
      .map((p: any) => ({
        id: p.id,
        display_name: p.display_name,
        avatar_url: p.avatar_url,
      }));

    return {
      valid: true,
      circle: {
        id: circle.id,
        name: circle.name,
        description: circle.description,
        invite_code: circle.invite_code,
        members: memberPreviews,
      },
    };
  } catch (e) {
    console.error('[invite] validateInviteCode error:', e);
    return {
      valid: false,
      error: 'Could not validate invite code. Please try again.',
    };
  }
}

/**
 * Join a circle by inserting a row into circle_members.
 * RLS allows self-insert (user_id = auth.uid()).
 */
export async function joinCircle(
  circleId: string,
  userId: string,
  role: string = 'member'
): Promise<void> {
  const { error } = await supabase.from('circle_members').insert({
    circle_id: circleId,
    user_id: userId,
    role,
  });

  if (error) {
    // 23505 = unique_violation (already a member)
    if (error.code === '23505') {
      return; // Already a member — that's fine
    }
    throw error;
  }
}
