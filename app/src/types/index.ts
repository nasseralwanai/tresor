/**
 * Shared domain types for Trésor.
 * These mirror the Supabase schema (database.types.ts) and are consumed
 * by hooks/lib functions and UI components.
 */

import type { Database } from './database.types';

// Re-export the Database type for use in lib functions
export type { Database } from './database.types';

/** A user's profile row from the `profiles` table. */
export type Profile = Database['public']['Tables']['profiles']['Row'];

/** A circle (private group) the user belongs to. */
export type Circle = Database['public']['Tables']['circles']['Row'];

/** A circle_members row. */
export type CircleMember = Database['public']['Tables']['circle_members']['Row'];

/** An items row. */
export type Item = Database['public']['Tables']['items']['Row'];

/** An item_photos row. */
export type ItemPhoto = Database['public']['Tables']['item_photos']['Row'];

/** A borrow_transactions row. */
export type BorrowTransaction = Database['public']['Tables']['borrow_transactions']['Row'];

/** A wishlists row. */
export type Wishlist = Database['public']['Tables']['wishlists']['Row'];

/** A wishlist_items row. */
export type WishlistItem = Database['public']['Tables']['wishlist_items']['Row'];

/** An activity_feed row. */
export type ActivityEntry = Database['public']['Tables']['activity_feed']['Row'];

/** A price_history row. */
export type PriceHistory = Database['public']['Tables']['price_history']['Row'];

/** Lightweight member representation for circle previews. */
export interface CircleMemberPreview {
  id: string;
  display_name: string | null;
  avatar_url: string | null;
}

/** Result of validating an invite code. */
export interface InviteCodeValidation {
  valid: boolean;
  circle?: {
    id: string;
    name: string;
    description: string | null;
    invite_code: string;
    members: CircleMemberPreview[];
  };
  error?: string;
}

/** Auth session state surfaced by useAuth. */
export interface AuthSession {
  userId: string | null;
  email: string | null;
}

/** Result of creating/updating a profile. */
export interface ProfileResult {
  profile: Profile;
}

// Re-export enums for convenience
export type ItemCategory = Database['public']['Enums']['item_category'];
export type ItemCondition = Database['public']['Enums']['item_condition'];
export type ItemStatus = Database['public']['Enums']['item_status'];
export type BorrowStatus = Database['public']['Enums']['borrow_status'];
export type ActivityType = Database['public']['Enums']['activity_type'];
