/**
 * Formatting helpers for currency, dates, and relative time.
 */

/** Format a currency value for display. */
export function formatCurrency(value: number | null, currency: string): string {
  if (value == null) return '—';
  const symbol = currency === 'AED' ? 'AED ' : `${currency} `;
  return `${symbol}${value.toLocaleString('en-US', { maximumFractionDigits: 0 })}`;
}

/** Format a compact currency value (e.g., "AED 42k"). */
export function formatCurrencyCompact(value: number | null, currency: string): string {
  if (value == null) return '—';
  const symbol = currency === 'AED' ? 'AED ' : `${currency} `;
  if (value >= 1000) {
    return `${symbol}${(value / 1000).toFixed(0)}k`;
  }
  return `${symbol}${value}`;
}

/** Format an ISO date string to a readable date. */
export function formatDate(iso: string): string {
  const date = new Date(iso);
  return date.toLocaleDateString('en-US', {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
  });
}

/** Format relative time (e.g., "2h ago", "3d ago"). */
export function formatRelativeTime(iso: string): string {
  const now = Date.now();
  const then = new Date(iso).getTime();
  const diffMs = now - then;
  const diffMin = Math.floor(diffMs / 60000);
  const diffHrs = Math.floor(diffMin / 60);
  const diffDays = Math.floor(diffHrs / 24);
  const diffWeeks = Math.floor(diffDays / 7);

  if (diffMin < 1) return 'just now';
  if (diffMin < 60) return `${diffMin}m ago`;
  if (diffHrs < 24) return `${diffHrs}h ago`;
  if (diffDays < 7) return `${diffDays}d ago`;
  if (diffWeeks < 4) return `${diffWeeks}w ago`;
  return formatDate(iso);
}

/** Format days since a date. */
export function daysSince(iso: string): number {
  const now = Date.now();
  const then = new Date(iso).getTime();
  return Math.floor((now - then) / 86400000);
}

/** Capitalize the first letter. */
export function capitalize(str: string): string {
  return str.charAt(0).toUpperCase() + str.slice(1);
}

/** Format an enum value for display (e.g., "like_new" → "Like New"). */
export function formatEnum(str: string): string {
  return str
    .split('_')
    .map((word) => word.charAt(0).toUpperCase() + word.slice(1))
    .join(' ');
}
