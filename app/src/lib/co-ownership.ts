/**
 * Co-Ownership API — manages item_owners, custody transfers,
 * and the ownership ledger.
 *
 * RLS: co-owners have full access to their shared items; circle members
 * can view co-owned items (non-private); ledger is visible to co-owners only.
 *
 * RPC functions:
 *   create_co_owned_item() — atomically creates an item + its ownership shares
 *   process_buyout()       — handles share buyout + ledger + optional sole conversion
 *
 * Custody transfers are handled via direct table inserts (custody_transfers)
 * following the requested → approved → active → completed lifecycle.
 */

import { supabase } from '@/lib/supabase';
import type { Database } from '@/types';
import type {
  CoOwner,
  OwnershipLedgerEntry,
  CustodyTransfer,
  CreateCoOwnedItemInput,
  BuyoutInput,
  Item,
} from '@/types/items';

// ─── Types ───

/** Result of createCoOwnedItem — the item plus its initial co-owners. */
export interface CreateCoOwnedItemResult {
  item: Item;
  owners: CoOwner[];
}

/** Structured error returned by all co-ownership functions. */
export interface CoOwnershipError {
  message: string;
  code?: string;
  details?: unknown;
}

// DB row types for convenience
type ItemRow = Database['public']['Tables']['items']['Row'];
type ItemOwnerRow = Database['public']['Tables']['item_owners']['Row'];
type OwnershipLedgerRow = Database['public']['Tables']['ownership_ledger']['Row'];
type CustodyTransferRow = Database['public']['Tables']['custody_transfers']['Row'];

// ─── Enrichment helpers ───

/** Map a raw items row (with profiles join) to the UI-facing Item type. */
function enrichItem(row: any): Item {
  const { profiles, custodian, ...rest } = row;
  return {
    ...rest,
    owner_name: profiles?.display_name ?? 'Unknown',
    custodian_name: custodian?.display_name ?? null,
    co_owners: null, // populated separately by callers that need it
    ai_identification: rest.ai_identification ?? null,
  } as Item;
}

/** Map a raw item_owners row (with profiles join) to the UI-facing CoOwner type. */
function enrichCoOwner(row: any): CoOwner {
  return {
    id: row.id,
    user_id: row.user_id,
    display_name: row.profiles?.display_name ?? 'Unknown',
    avatar_url: row.profiles?.avatar_url ?? null,
    share_percentage: Number(row.share_percentage),
    amount_paid: Number(row.amount_paid),
    currency: row.currency,
    joined_at: row.joined_at,
    is_active: row.is_active,
  };
}

/** Map a raw ownership_ledger row (with payer profiles join) to the UI-facing type. */
function enrichLedgerEntry(row: any): OwnershipLedgerEntry {
  return {
    id: row.id,
    item_id: row.item_id,
    payer_id: row.payer_id,
    payer_name: row.payer?.display_name ?? 'Unknown',
    entry_type: row.entry_type,
    amount: Number(row.amount),
    currency: row.currency,
    description: row.description,
    splits: row.splits as Record<string, any> | null,
    affected_owner_id: row.affected_owner_id,
    new_share_percentage:
      row.new_share_percentage != null ? Number(row.new_share_percentage) : null,
    created_at: row.created_at,
    created_by: row.created_by,
  };
}

/** Map a raw custody_transfers row (with joins) to the UI-facing CustodyTransfer type. */
function enrichCustodyTransfer(row: any): CustodyTransfer {
  return {
    id: row.id,
    item_id: row.item_id,
    item_brand: row.items?.brand ?? 'Unknown',
    item_model: row.items?.model_name ?? null,
    from_user_id: row.from_user_id,
    from_user_name: row.from_user?.display_name ?? 'Unknown',
    to_user_id: row.to_user_id,
    to_user_name: row.to_user?.display_name ?? 'Unknown',
    circle_id: row.circle_id,
    status: row.status,
    requested_at: row.requested_at,
    approved_at: row.approved_at,
    handed_off_at: row.handed_off_at,
    completed_at: row.completed_at,
    requester_note: row.requester_note,
    approver_note: row.approver_note,
    created_at: row.created_at,
    updated_at: row.updated_at,
  };
}

/** Convert a Supabase error into a typed CoOwnershipError. */
function toCoOwnershipError(error: unknown, fallback: string): CoOwnershipError {
  if (error && typeof error === 'object' && 'message' in error) {
    const e = error as { message: string; code?: string; details?: unknown };
    return {
      message: e.message || fallback,
      code: e.code,
      details: e.details,
    };
  }
  return { message: fallback, details: error };
}

// ─── 1. getCoOwners ───

/**
 * Fetch all active co-owners of an item.
 * Returns owners enriched with display_name and avatar_url from profiles.
 */
export async function getCoOwners(itemId: string): Promise<CoOwner[]> {
  try {
    const { data, error } = await supabase
      .from('item_owners')
      .select(
        `*,
        profiles!item_owners_user_id_fkey(display_name, avatar_url)`
      )
      .eq('item_id', itemId)
      .eq('is_active', true)
      .order('joined_at', { ascending: true });

    if (error) throw error;
    return (data ?? []).map((row: any) => enrichCoOwner(row));
  } catch (err) {
    const e = toCoOwnershipError(err, `Failed to fetch co-owners for item ${itemId}`);
    throw e;
  }
}

// ─── 2. getOwnedItems ───

/**
 * Fetch all items where the given user is an active co-owner.
 * Returns items enriched with owner_name and custodian_name.
 */
export async function getOwnedItems(userId: string): Promise<Item[]> {
  try {
    const { data, error } = await supabase
      .from('item_owners')
      .select(
        `share_percentage,
        amount_paid,
        items!inner(
          *,
          profiles!items_owner_id_fkey(display_name),
          custodian:profiles!items_current_custodian_id_fkey(display_name)
        )`
      )
      .eq('user_id', userId)
      .eq('is_active', true)
      .order('joined_at', { ascending: false });

    if (error) throw error;

    return (data ?? []).map((row: any) => {
      const item = enrichItem(row.items);
      // Attach the user's share info as metadata (non-standard fields)
      (item as any).my_share = Number(row.share_percentage);
      (item as any).my_amount_paid = Number(row.amount_paid);
      return item;
    });
  } catch (err) {
    const e = toCoOwnershipError(err, `Failed to fetch co-owned items for user ${userId}`);
    throw e;
  }
}

// ─── 3. createCoOwnedItem ───

/**
 * Create a co-owned item atomically via the create_co_owned_item RPC.
 * The RPC creates the item, ownership shares, initial ledger entries,
 * and activity feed entry in a single database transaction.
 *
 * @param itemData  Item fields (brand, model, owners with shares, etc.)
 * @param owners    Array of { user_id, share_percentage, amount_paid }.
 *                  Shares must sum to 100.
 * @returns         The created item and its co-owners.
 */
export async function createCoOwnedItem(
  itemData: CreateCoOwnedItemInput
): Promise<CreateCoOwnedItemResult> {
  try {
    // Validate shares sum to 100 before hitting the DB
    const totalShares = itemData.owners.reduce(
      (sum, o) => sum + o.share_percentage,
      0
    );
    if (Math.abs(totalShares - 100) > 0.01) {
      throw {
        message: `Ownership shares must sum to 100. Current total: ${totalShares}`,
        code: 'INVALID_SHARES',
      } as CoOwnershipError;
    }

    const { data, error } = await supabase.rpc('create_co_owned_item', {
      p_brand: itemData.brand,
      p_model_name: itemData.model_name ?? null,
      p_category: itemData.category ?? null,
      p_color: itemData.color ?? null,
      p_condition: itemData.condition ?? null,
      p_estimated_value: itemData.estimated_value ?? null,
      p_currency: itemData.currency ?? 'AED',
      p_notes: itemData.notes ?? null,
      p_is_private: itemData.is_private ?? false,
      p_is_lendable: itemData.is_lendable ?? true,
      p_primary_image_url: itemData.primary_image_url ?? null,
      p_purchase_price: itemData.purchase_price ?? null,
      p_purchase_date: itemData.purchase_date ?? null,
      p_circle_id: itemData.circle_id ?? null,
      p_co_borrow_approval: itemData.co_borrow_approval ?? 'custodian',
      p_owners: itemData.owners,
    });

    if (error) throw error;

    // The RPC returns JSON: { item: {...}, owners: [...] }
    const result = data as { item: any; owners: any[] } | null;
    if (!result || !result.item) {
      throw {
        message: 'create_co_owned_item RPC returned no item data',
        code: 'RPC_NO_DATA',
      } as CoOwnershipError;
    }

    const item = enrichItem(result.item);
    const owners = (result.owners ?? []).map((row: any) => enrichCoOwner(row));
    // Attach co-owners to the item for convenience
    item.co_owners = owners;

    return { item, owners };
  } catch (err) {
    const e = toCoOwnershipError(err, 'Failed to create co-owned item');
    throw e;
  }
}

// ─── 4. transferCustody ───

/**
 * Initiate a custody transfer for a co-owned item.
 *
 * This creates a custody_transfers row with status 'requested' — the
 * current custodian (from_user_id) must then approve, hand off, and the
 * recipient confirms. The full lifecycle is:
 *   requested → approved → active → completed
 *
 * Note: There is no transfer_custody RPC; custody transfers use direct
 * table inserts per the co-ownership spec (§4.2).
 *
 * @param itemId    The co-owned item ID.
 * @param toUserId  The co-owner requesting custody (becomes to_user_id).
 * @returns         The created custody transfer request.
 */
export async function transferCustody(
  itemId: string,
  toUserId: string
): Promise<CustodyTransfer> {
  try {
    // Fetch the item to get current_custodian_id and circle_id
    const { data: item, error: itemError } = await supabase
      .from('items')
      .select('current_custodian_id, circle_id, ownership_type')
      .eq('id', itemId)
      .single();

    if (itemError) throw itemError;
    if (!item) {
      throw {
        message: `Item ${itemId} not found`,
        code: 'ITEM_NOT_FOUND',
      } as CoOwnershipError;
    }

    if (item.ownership_type !== 'co_owned') {
      throw {
        message: 'Custody transfers are only available for co-owned items.',
        code: 'NOT_CO_OWNED',
      } as CoOwnershipError;
    }

    if (!item.current_custodian_id) {
      throw {
        message: 'Item has no current custodian set.',
        code: 'NO_CUSTODIAN',
      } as CoOwnershipError;
    }

    if (item.current_custodian_id === toUserId) {
      throw {
        message: 'You are already the custodian of this item.',
        code: 'ALREADY_CUSTODIAN',
      } as CoOwnershipError;
    }

    // Create the custody transfer request
    const { data, error } = await supabase
      .from('custody_transfers')
      .insert({
        item_id: itemId,
        from_user_id: item.current_custodian_id,
        to_user_id: toUserId,
        circle_id: item.circle_id,
        status: 'requested',
      })
      .select(
        `*,
        items!custody_transfers_item_id_fkey(brand, model_name),
        from_user:profiles!custody_transfers_from_user_id_fkey(display_name),
        to_user:profiles!custody_transfers_to_user_id_fkey(display_name)`
      )
      .single();

    if (error) throw error;
    return enrichCustodyTransfer(data);
  } catch (err) {
    const e = toCoOwnershipError(err, `Failed to transfer custody for item ${itemId}`);
    throw e;
  }
}

// ─── 5. getOwnershipHistory ───

/**
 * Fetch the ownership ledger (financial audit trail) for a co-owned item.
 * Returns entries enriched with payer_name, ordered newest first.
 */
export async function getOwnershipHistory(
  itemId: string
): Promise<OwnershipLedgerEntry[]> {
  try {
    const { data, error } = await supabase
      .from('ownership_ledger')
      .select(
        `*,
        payer:profiles!ownership_ledger_payer_id_fkey(display_name)`
      )
      .eq('item_id', itemId)
      .order('created_at', { ascending: false });

    if (error) throw error;
    return (data ?? []).map((row: any) => enrichLedgerEntry(row));
  } catch (err) {
    const e = toCoOwnershipError(
      err,
      `Failed to fetch ownership history for item ${itemId}`
    );
    throw e;
  }
}

// ─── 6. getCustodyTransfers ───

/**
 * Fetch the custody transfer history for an item.
 * Returns all transfers (any status), ordered newest first.
 */
export async function getCustodyTransfers(
  itemId: string
): Promise<CustodyTransfer[]> {
  try {
    const { data, error } = await supabase
      .from('custody_transfers')
      .select(
        `*,
        items!custody_transfers_item_id_fkey(brand, model_name),
        from_user:profiles!custody_transfers_from_user_id_fkey(display_name),
        to_user:profiles!custody_transfers_to_user_id_fkey(display_name)`
      )
      .eq('item_id', itemId)
      .order('created_at', { ascending: false });

    if (error) throw error;
    return (data ?? []).map((row: any) => enrichCustodyTransfer(row));
  } catch (err) {
    const e = toCoOwnershipError(
      err,
      `Failed to fetch custody transfers for item ${itemId}`
    );
    throw e;
  }
}

// ─── 7. buyoutOwner ───

/**
 * Buy out a co-owner's share via the process_buyout RPC.
 *
 * The RPC atomically:
 *   1. Creates an ownership_ledger entry (entry_type = 'buyout')
 *   2. Updates the seller's and buyer's share_percentage in item_owners
 *   3. If the seller's remaining share is 0, sets is_active = false
 *   4. If only one active owner remains, converts the item to 'sole' ownership
 *
 * @param itemId    The co-owned item ID.
 * @param ownerId   The co-owner being bought out (seller).
 * @param buyerId   The co-owner buying the shares (buyer).
 * @returns         Resolves when the buyout is complete.
 */
export async function buyoutOwner(
  itemId: string,
  ownerId: string,
  buyerId: string
): Promise<void> {
  try {
    // Fetch the seller's current share so we can buy the full remaining share
    const { data: sellerShare, error: fetchError } = await supabase
      .from('item_owners')
      .select('share_percentage, amount_paid')
      .eq('item_id', itemId)
      .eq('user_id', ownerId)
      .eq('is_active', true)
      .single();

    if (fetchError) throw fetchError;
    if (!sellerShare) {
      throw {
        message: `Owner ${ownerId} is not an active co-owner of item ${itemId}`,
        code: 'OWNER_NOT_FOUND',
      } as CoOwnershipError;
    }

    const sharesBought = Number(sellerShare.share_percentage);

    if (sharesBought <= 0) {
      throw {
        message: 'Owner has no shares to buy out.',
        code: 'NO_SHARES',
      } as CoOwnershipError;
    }

    // Use the seller's amount_paid as the buyout amount (their original contribution).
    // In a real flow, the buyer and seller negotiate a price; here we use
    // amount_paid as a sensible default for a full buyout.
    const buyoutAmount = Number(sellerShare.amount_paid);

    const { error } = await supabase.rpc('process_buyout', {
      p_item_id: itemId,
      p_buyer_id: buyerId,
      p_seller_id: ownerId,
      p_shares_bought: sharesBought,
      p_buyout_amount: buyoutAmount,
      p_currency: 'AED',
      p_notes: null,
    });

    if (error) throw error;
  } catch (err) {
    const e = toCoOwnershipError(
      err,
      `Failed to buy out owner ${ownerId} for item ${itemId}`
    );
    throw e;
  }
}

// ─── Re-exports for convenience ───

export type { CoOwner, OwnershipLedgerEntry, CustodyTransfer, BuyoutInput };
