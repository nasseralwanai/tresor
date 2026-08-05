/**
 * Invite code API interface.
 *
 * TODO(backend): Sonny is implementing the real invite-code validation
 * endpoint as a Supabase Edge Function (`validate-invite-code`).
 * Replace the placeholder below with a real `supabase.functions.invoke`
 * call once the function is deployed.
 *
 * Expected backend contract:
 *   POST /functions/v1/validate-invite-code
 *   Body: { code: string }
 *   Response: InviteCodeValidation
 */

import type { InviteCodeValidation } from '@/types';

/**
 * Validate an invite code against the backend.
 *
 * Placeholder: simulates a network call and accepts the code "TRESOR"
 * for demo purposes. Returns a mock circle preview.
 *
 * TODO(backend): Replace with:
 *   const { data, error } = await supabase.functions.invoke('validate-invite-code', {
 *     body: { code },
 *   });
 *   if (error) throw error;
 *   return data as InviteCodeValidation;
 */
export async function validateInviteCode(code: string): Promise<InviteCodeValidation> {
  // Simulate latency
  await new Promise((resolve) => setTimeout(resolve, 600));

  const normalized = code.trim().toUpperCase();

  // TODO(backend): Remove mock — real validation happens server-side.
  if (normalized === 'TRESOR' || normalized === 'DEMO') {
    return {
      valid: true,
      circle: {
        id: 'mock-circle-id',
        name: 'The Vault',
        members: [
          { id: '1', full_name: 'Sara', avatar_url: null },
          { id: '2', full_name: 'Khalid', avatar_url: null },
          { id: '3', full_name: 'Lina', avatar_url: null },
        ],
      },
    };
  }

  return {
    valid: false,
    error: 'This invite code is not valid or has expired.',
  };
}
