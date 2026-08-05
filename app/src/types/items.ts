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
 * Includes owner name (from profiles join) and all DB columns.
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
  purchase_date: string | null;
  estimated_value: number | null;
  currency: string;
  serial_number: string | null;
  authenticity_verified: boolean;
  notes: string | null;
  ai_brand_confidence: number | null;
  ai_identification: Record<string, any> | null;
  source_url: string | null;
  primary_image_url: string | null;
  is_private: boolean;
  is_lendable: boolean;
  created_at: string;
  updated_at: string;
}

/** Input for creating a new item. */
export interface CreateItemInput {
  brand: string;
  model_name?: string | null;
  category?: ItemCategory | null;
  color?: string | null;
  size?: string | null;
  material?: string | null;
  condition?: ItemCondition;
  status?: ItemStatus;
  estimated_value?: number | null;
  currency?: string;
  notes?: string | null;
  is_private?: boolean;
  is_lendable?: boolean;
  primary_image_url?: string | null;
}

/** A circle member with their item count. */
export interface CircleMemberWithItems {
  id: string;
  display_name: string | null;
  avatar_url: string | null;
  item_count: number;
}

/** A borrow transaction with enriched names.
 * The base type comes from the DB row; these fields are added by joining.
 */
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
  return_condition_note: string | null;
  condition_before: ItemCondition | null;
  condition_after: ItemCondition | null;
  circle_id: string | null;
  requested_at: string;
  approved_at: string | null;
  borrowed_at: string | null;
  due_date: string | null;
  returned_at: string | null;
  completed_at: string | null;
  created_at: string;
  updated_at: string;
}

/**
 * A wishlist item with savings progress.
 * The base type comes from the DB row; owner_name and currency are
 * added by the lib layer for UI display.
 */
export interface WishlistItem {
  id: string;
  wishlist_id: string;
  user_id: string;
  item_id: string | null;
  brand: string;
  model_name: string | null;
  category: ItemCategory | null;
  max_price: number | null;
  notes: string | null;
  source_url: string | null;
  priority: number;
  fulfilled: boolean;
  created_at: string;
  target_price: number | null;
  current_savings: number;
  target_date: string | null;
  image_url: string | null;
  ai_metadata: Record<string, any> | null;
  updated_at: string;
  // UI-enriched fields (not in DB schema):
  owner_name: string;
  currency: string;
}

/**
 * An activity feed entry.
 * The base type comes from the DB row; item_brand is enriched by the lib layer.
 */
export interface ActivityEntry {
  id: string;
  circle_id: string | null;
  user_id: string | null;
  type: ActivityType;
  item_id: string | null;
  borrow_id: string | null;
  actor_name: string;
  summary: string;
  item_brand: string | null;
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
