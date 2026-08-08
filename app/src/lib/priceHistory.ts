/**
 * Price History API — reads the `price_history` table to compute real
 * collection value trends over time.
 *
 * RLS: item owners and circle members can read price history for their items.
 */

import { supabase } from '@/lib/supabase';
import type { PriceHistory } from '@/types';

/** A price_history row enriched with the item brand for display. */
export type PriceHistoryWithBrand = PriceHistory & {
  brand: string;
};

/**
 * Fetch all price_history entries for a user's items, ordered by recorded_at ascending.
 * Returns rows enriched with the item brand.
 */
export async function getPriceHistoryForUserItems(
  userId: string
): Promise<PriceHistoryWithBrand[]> {
  const { data: items, error: itemsError } = await supabase
    .from('items')
    .select('id')
    .eq('owner_id', userId);

  if (itemsError) throw itemsError;

  const itemIds = (items ?? []).map((i) => i.id);
  if (itemIds.length === 0) return [];

  const { data, error } = await supabase
    .from('price_history')
    .select(
      `*, items!price_history_item_id_fkey(brand)`
    )
    .in('item_id', itemIds)
    .order('recorded_at', { ascending: true });

  if (error) throw error;

  return (data ?? []).map((row: any) => ({
    ...row,
    brand: row.items?.brand ?? 'Unknown',
  }));
}

/**
 * Compute a value trend from price_history data.
 *
 * Groups price points by month, sums the latest-known value of each item at
 * each month, and returns:
 *   - sparkData: array of total collection values (one per month, oldest→newest)
 *   - sparkLabels: short month labels matching the data points
 *   - quarterlyChange: formatted string showing the change over the last ~3 months
 *   - quarterlyChangePositive: whether the change is positive
 *
 * If fewer than 2 data points exist, returns null (caller should not show the card).
 */
export function computeValueTrend(
  history: PriceHistoryWithBrand[]
): {
  sparkData: number[];
  sparkLabels: string[];
  quarterlyChange: string;
  quarterlyChangePositive: boolean;
} | null {
  if (history.length < 2) return null;

  // Build a timeline of unique months from the price history data
  const monthKeys = new Set<string>();
  for (const h of history) {
    const d = new Date(h.recorded_at);
    const key = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;
    monthKeys.add(key);
  }

  const sortedMonths = Array.from(monthKeys).sort();

  // For each month, compute the total collection value using the most recent
  // price for each item up to and including that month
  const sparkData: number[] = [];
  const sparkLabels: string[] = [];
  const monthNames = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];

  for (const monthKey of sortedMonths) {
    const [year, mon] = monthKey.split('-').map(Number);
    const monthEnd = new Date(year, mon, 0, 23, 59, 59); // last day of that month

    // For each item, find the latest price recorded at or before monthEnd
    const itemIds = new Set(history.map((h) => h.item_id));
    let monthTotal = 0;
    for (const itemId of itemIds) {
      const pricesForItem = history
        .filter((h) => h.item_id === itemId && new Date(h.recorded_at) <= monthEnd)
        .sort((a, b) => new Date(a.recorded_at).getTime() - new Date(b.recorded_at).getTime());
      if (pricesForItem.length > 0) {
        monthTotal += pricesForItem[pricesForItem.length - 1].price;
      }
    }

    sparkData.push(monthTotal);
    sparkLabels.push(monthNames[mon - 1] ?? monthKey);
  }

  // Compute quarterly change: compare last data point vs ~3 months prior
  // If we have fewer than 2 points we already returned null above
  const latest = sparkData[sparkData.length - 1];

  // Find the data point ~3 months before the latest
  let comparisonIndex = 0;
  if (sortedMonths.length >= 2) {
    const latestMonth = sortedMonths[sortedMonths.length - 1];
    const [ly, lm] = latestMonth.split('-').map(Number);
    const targetDate = new Date(ly, lm - 1 - 3, 1); // 3 months before
    const targetKey = `${targetDate.getFullYear()}-${String(targetDate.getMonth() + 1).padStart(2, '0')}`;

    // Find the closest month at or before target
    for (let i = sortedMonths.length - 1; i >= 0; i--) {
      if (sortedMonths[i] <= targetKey) {
        comparisonIndex = i;
        break;
      }
    }
  }

  const comparison = sparkData[comparisonIndex];
  const change = latest - comparison;
  const quarterlyChangePositive = change >= 0;
  const absChange = Math.abs(change);
  const changeLabel =
    absChange >= 1000
      ? `${absChange / 1000}k`
      : `${absChange}`;
  const sign = change >= 0 ? '+' : '−';
  const quarterlyChange = `${sign}AED ${changeLabel}`;

  return {
    sparkData,
    sparkLabels,
    quarterlyChange,
    quarterlyChangePositive,
  };
}
