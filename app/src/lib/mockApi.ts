/**
 * Mock API layer for UI development.
 *
 * This provides the functions that screens consume during UI development.
 * When Sonny's real Supabase-backed lib functions are fully wired with auth,
 * screens can switch to importing from @/lib/items, @/lib/circle, etc.
 *
 * The data comes from @/lib/mockData which returns enriched UI types
 * from @/types/items (with owner_name, is_private, is_lendable, etc.)
 */

import type {
  Item,
  CollectionInsights,
  BorrowTransaction,
  WishlistItem,
  ActivityEntry,
} from '@/types/items';
import type { MockMember, MockProfile } from './mockData';
import {
  mockItems,
  mockMembers,
  mockBorrowTransactions,
  mockWishlistItems,
  mockActivity,
  mockCurrentUser,
  mockCircle,
} from './mockData';

function delay(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

// ── Items ──

/** Fetch all items for the current user (owned items). */
export async function getMyItems(): Promise<Item[]> {
  await delay(400);
  return mockItems.filter((item) => item.owner_id === mockCurrentUser.id);
}

/** Fetch items owned by a specific user (for circle browsing). */
export async function getUserItems(userId: string, onlyLendable = false): Promise<Item[]> {
  await delay(400);
  let items = mockItems.filter((item) => item.owner_id === userId);
  if (onlyLendable) {
    items = items.filter((item) => item.is_lendable && !item.is_private);
  }
  return items;
}

/** Fetch a single item by ID. */
export async function getItem(id: string): Promise<Item | null> {
  await delay(300);
  return mockItems.find((item) => item.id === id) ?? null;
}

/** Create a new item. Returns the created item. */
export async function createItem(input: {
  brand: string;
  model_name?: string | null;
  category?: string | null;
  color?: string | null;
  condition?: string;
  estimated_value?: number | null;
  currency?: string;
  notes?: string | null;
  is_private?: boolean;
  is_lendable?: boolean;
}): Promise<Item> {
  await delay(600);
  const newItem: Item = {
    id: `item-${Date.now()}`,
    owner_id: mockCurrentUser.id,
    owner_name: mockCurrentUser.full_name,
    circle_id: mockCurrentUser.circle_id,
    brand: input.brand,
    model_name: input.model_name ?? null,
    category: (input.category as any) ?? null,
    color: input.color ?? null,
    size: null,
    material: null,
    condition: (input.condition as any) ?? 'good',
    status: 'available',
    purchase_price: null,
    estimated_value: input.estimated_value ?? null,
    currency: input.currency ?? 'AED',
    notes: input.notes ?? null,
    primary_image_url: null,
    is_private: input.is_private ?? false,
    is_lendable: input.is_lendable ?? true,
    authenticity_verified: false,
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString(),
  };
  mockItems.unshift(newItem);
  return newItem;
}

/** Update item visibility/lendability. */
export async function updateItem(
  id: string,
  updates: Partial<Pick<Item, 'is_private' | 'is_lendable' | 'status'>>,
): Promise<void> {
  await delay(300);
  const item = mockItems.find((i) => i.id === id);
  if (item) {
    Object.assign(item, updates);
  }
}

/** Get collection insights for the home screen. */
export async function getCollectionInsights(): Promise<CollectionInsights> {
  await delay(300);
  const myItems = mockItems.filter((item) => item.owner_id === mockCurrentUser.id);
  const totalValue = myItems.reduce((sum, item) => sum + (item.estimated_value ?? 0), 0);
  const itemsLent = myItems.filter((item) => item.status === 'borrowed').length;

  const mostValuable = myItems.reduce(
    (max, item) => ((item.estimated_value ?? 0) > (max?.estimated_value ?? 0) ? item : max),
    null as Item | null,
  );

  const leastUsed =
    myItems
      .filter((item) => item.status === 'available')
      .sort((a, b) => new Date(a.created_at).getTime() - new Date(b.created_at).getTime())[0] ?? null;

  return {
    totalValue,
    totalItems: myItems.length,
    currency: 'AED',
    mostValuableItem: mostValuable ?? null,
    leastUsedItem: leastUsed,
    itemsLent,
  };
}

// ── Circle ──

export async function getCircleMembers(): Promise<MockMember[]> {
  await delay(400);
  return mockMembers;
}

export async function getMyCircle(): Promise<{ id: string; name: string } | null> {
  await delay(300);
  return mockCircle;
}

export function getCurrentUser(): MockProfile {
  return mockCurrentUser;
}

// ── Wishlist ──

export async function getMyWishlist(): Promise<WishlistItem[]> {
  await delay(400);
  return mockWishlistItems.filter((item) => item.user_id === mockCurrentUser.id);
}

export async function getFriendsWishlist(): Promise<WishlistItem[]> {
  await delay(400);
  return mockWishlistItems.filter(
    (item) => item.user_id !== mockCurrentUser.id && !item.is_private,
  );
}

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

export async function updateWishlistSavings(id: string, amount: number): Promise<void> {
  await delay(300);
  const item = mockWishlistItems.find((i) => i.id === id);
  if (item) {
    item.current_savings = amount;
  }
}

// ── Activity ──

export async function getActivityFeed(): Promise<ActivityEntry[]> {
  await delay(400);
  return [...mockActivity].sort(
    (a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime(),
  );
}

// ── Borrow ──

export async function requestBorrow(itemId: string, note?: string): Promise<void> {
  await delay(500);
  console.log('Borrow requested for item', itemId, 'with note:', note);
}

export async function markReturned(borrowId: string): Promise<void> {
  await delay(500);
  const tx = mockBorrowTransactions.find((t) => t.id === borrowId);
  if (tx) {
    tx.status = 'returned_pending';
    tx.returned_at = new Date().toISOString();
  }
}

export async function nudgeBorrower(borrowId: string): Promise<void> {
  await delay(400);
  console.log('Nudge sent for borrow', borrowId);
}

export async function getActiveBorrowForItem(itemId: string): Promise<BorrowTransaction | null> {
  await delay(300);
  return (
    mockBorrowTransactions.find(
      (t) => t.item_id === itemId && (t.status === 'active' || t.status === 'approved'),
    ) ?? null
  );
}

export async function getMyActiveBorrows(): Promise<BorrowTransaction[]> {
  await delay(400);
  return mockBorrowTransactions.filter(
    (t) =>
      (t.borrower_id === mockCurrentUser.id || t.lender_id === mockCurrentUser.id) &&
      t.status === 'active',
  );
}

export async function getItemBorrowHistory(itemId: string): Promise<BorrowTransaction[]> {
  await delay(300);
  return mockBorrowTransactions.filter((t) => t.item_id === itemId);
}
