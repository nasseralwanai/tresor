/**
 * Items API — fetch, create, update items.
 *
 * TODO(backend): Replace mock implementations with real Supabase queries:
 *   supabase.from('items').select('*, profiles!owner_id(display_name)')
 * RLS ensures users only see items in their circle.
 */

import type { Item, CreateItemInput, CollectionInsights } from '@/types/items';
import { mockItems, mockCurrentUser } from './mockData';

/** Simulated network latency. */
function delay(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

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

/** Fetch all items in the user's circle (for circle screen). */
export async function getCircleItems(onlyLendable = false): Promise<Item[]> {
  await delay(400);
  let items = [...mockItems];
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
export async function createItem(input: CreateItemInput): Promise<Item> {
  await delay(600);
  const newItem: Item = {
    id: `item-${Date.now()}`,
    owner_id: mockCurrentUser.id,
    owner_name: mockCurrentUser.full_name,
    circle_id: mockCurrentUser.circle_id,
    brand: input.brand,
    model_name: input.model_name ?? null,
    category: input.category ?? null,
    color: null,
    size: null,
    material: null,
    condition: input.condition ?? 'good',
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
  // TODO(backend): Insert into Supabase and return the real row
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

  // "Least used" = oldest created_at that's available
  const leastUsed = myItems
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
