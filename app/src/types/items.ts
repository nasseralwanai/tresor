/**
 * Domain types for items, lending, wishlists, and activity.
 * These extend the base types in index.ts with richer UI-facing shapes.
 */

import type { Database } from './database.types';

export type ItemCategory = Database['public']['Enums']['item_category'];
export type ItemCondition = Database['public']['Enums']['item_condition'];
export type ItemStatus = Database['public']['Enums']['item_status'];
export type BorrowStatus = Database['public']['Enums']['borrow_status'];
export type ActivityType = Database['public']['Enums']['activity_type'];

/**
 * UI-facing item type — enriched version of the DB row.
 * Includes owner name and computed fields like is_private, is_lendable.
 */
export interface Item {
  id: string;
  owner_id: string;
  owner_name: string;
  circle_id: string | null;
  brand: string;
  model_name: string | null;
  category: ItemCategory | null;
  color: string | null;
  size: string | null;
  material: string | null;
  condition: ItemCondition;
  status: ItemStatus;
  purchase_price: number | null;
  estimated_value: number | null;
  currency: string;
  notes: string | null;
  primary_image_url: string | null;
  is_private: boolean;
  is_lendable: boolean;
  authenticity_verified: boolean;
  created_at: string;
  updated_at: string;
}

/** Input for creating a new item. */
export interface CreateItemInput {
  brand: string;
  model_name?: string | null;
  category?: ItemCategory | null;
  color?: string | null;
  condition?: ItemCondition;
  estimated_value?: number | null;
  currency?: string;
  notes?: string | null;
  is_private?: boolean;
  is_lendable?: boolean;
}

/** A circle member with their item count. */
export interface CircleMemberWithItems extends CircleMember {
  item_count: number;
}

/** Re-export for convenience */
import type { CircleMember } from './index';

/** A borrow transaction with enriched names. */
export interface BorrowTransaction {
  id: string;
  item_id: string;
  item_brand: string;
  item_model: string | null;
  borrower_id: string;
  borrower_name: string;
  lender_id: string;
  lender_name: string;
  status: BorrowStatus;
  borrower_note: string | null;
  lender_note: string | null;
  requested_at: string;
  approved_at: string | null;
  borrowed_at: string | null;
  returned_at: string | null;
  completed_at: string | null;
}

/** A wishlist item with savings progress. */
export interface WishlistItem {
  id: string;
  user_id: string;
  owner_name: string;
  brand: string;
  model_name: string | null;
  category: ItemCategory | null;
  target_price: number | null;
  current_savings: number;
  currency: string;
  notes: string | null;
  image_url: string | null;
  is_private: boolean;
  fulfilled: boolean;
  priority: number;
  created_at: string;
}

/** An activity feed entry. */
export interface ActivityEntry {
  id: string;
  type: ActivityType;
  user_id: string | null;
  actor_name: string;
  summary: string;
  item_id: string | null;
  item_brand: string | null;
  borrow_id: string | null;
  metadata: Record<string, any> | null;
  created_at: string;
}

/** Collection insights for the home screen. */
export interface CollectionInsights {
  totalValue: number;
  totalItems: number;
  currency: string;
  mostValuableItem: Item | null;
  leastUsedItem: Item | null;
  itemsLent: number;
}
