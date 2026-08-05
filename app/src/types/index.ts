/**
 * Shared domain types for Trésor.
 * These mirror the Supabase schema and are consumed by hooks/lib functions.
 */

/** A user's profile row from the `profiles` table. */
export interface Profile {
  id: string;
  full_name: string;
  avatar_url: string | null;
  phone: string | null;
  circle_id: string | null;
  created_at: string;
}

/** A circle (private group) the user belongs to. */
export interface Circle {
  id: string;
  name: string;
  created_at: string;
}

/** Lightweight member representation for circle previews. */
export interface CircleMember {
  id: string;
  full_name: string;
  avatar_url: string | null;
}

/** Result of validating an invite code. */
export interface InviteCodeValidation {
  valid: boolean;
  circle?: {
    id: string;
    name: string;
    members: CircleMember[];
  };
  error?: string;
}

/** Auth session state surfaced by useAuth. */
export interface AuthSession {
  userId: string | null;
  phone: string | null;
}

/** Result of creating/updating a profile. */
export interface ProfileResult {
  profile: Profile;
}
