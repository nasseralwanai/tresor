/**
 * Wishlist API — fetch and create wishlist items.
 *
 * TODO(backend): Replace mock with real Supabase queries:
 *   supabase.from('wishlist_items').select('*, profiles!user_id(display_name)')
 */

import type { WishlistItem } from '@/types/items';
import { mockWishlistItems, mockCurrentUser } from './mockData';

function delay(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

/** Fetch the current user's wishlist items. */
export async function getMyWishlist(): Promise<WishlistItem[]> {
  await delay(400);
  return mockWishlistItems.filter((item) => item.user_id === mockCurrentUser.id);
}

/** Fetch friends' wishlist items (circle members' public wishlists). */
export async function getFriendsWishlist(): Promise<WishlistItem[]> {
  await delay(400);
  return mockWishlistItems.filter(
    (item) => item.user_id !== mockCurrentUser.id && !item.is_private,
  );
}

/** Create a new wishlist item. */
export async function createWishlistItem(input: {
  brand: string;
  model_name?: string | null;
  category?: string | null;
  target_price?: number | null;
  notes?: string | null;
  is_private?: boolean;
}): Promise<WishlistItem> {
  await delay(500);
  const newItem: WishlistItem = {
    id: `wl-${Date.now()}`,
    user_id: mockCurrentUser.id,
    owner_name: mockCurrentUser.full_name,
    brand: input.brand,
    model_name: input.model_name ?? null,
    category: (input.category as any) ?? null,
    target_price: input.target_price ?? null,
    current_savings: 0,
    currency: 'AED',
    notes: input.notes ?? null,
    image_url: null,
    is_private: input.is_private ?? false,
    fulfilled: false,
    priority: 1,
    created_at: new Date().toISOString(),
  };
  mockWishlistItems.unshift(newItem);
  return newItem;
}

/** Update savings progress for a wishlist item. */
export async function updateWishlistSavings(id: string, amount: number): Promise<void> {
  await delay(300);
  const item = mockWishlistItems.find((i) => i.id === id);
  if (item) {
    item.current_savings = amount;
  }
}
