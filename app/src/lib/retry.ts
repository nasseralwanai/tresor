/**
 * withRetry — wraps an async Supabase query with retry logic.
 *
 * If the query fails with a retryable error (network, server, timeout),
 * it retries up to `maxRetries` times with exponential backoff.
 * Non-retryable errors (auth, not_found) are thrown immediately.
 *
 * Usage:
 *   const items = await withRetry(() => getItems(circleId));
 *   const data = await withRetry(() => supabase.from('x').select(), { maxRetries: 2 });
 */

import { classifyError } from '@/lib/errors';

const DEFAULT_MAX_RETRIES = 2;
const DEFAULT_BASE_DELAY_MS = 1000;

/**
 * Wrap an async function with retry logic.
 * Retries on retryable errors (network, server, timeout).
 */
export async function withRetry<T>(
  fn: () => Promise<T>,
  options?: { maxRetries?: number; baseDelayMs?: number }
): Promise<T> {
  const maxRetries = options?.maxRetries ?? DEFAULT_MAX_RETRIES;
  const baseDelayMs = options?.baseDelayMs ?? DEFAULT_BASE_DELAY_MS;

  let lastError: unknown;

  for (let attempt = 0; attempt <= maxRetries; attempt++) {
    try {
      return await fn();
    } catch (e) {
      lastError = e;
      const appError = classifyError(e);

      // Don't retry non-retryable errors
      if (!appError.retryable) {
        throw e;
      }

      // Don't retry on the last attempt
      if (attempt === maxRetries) {
        throw e;
      }

      // Exponential backoff: 1s, 2s, 4s...
      const delay = baseDelayMs * Math.pow(2, attempt);
      await new Promise((resolve) => setTimeout(resolve, delay));
    }
  }

  // This should never be reached, but satisfies TypeScript
  throw lastError;
}

/**
 * Check if the device appears to be offline before making a query.
 * Throws a network error if offline, so the caller's catch block can
 * show the appropriate error state.
 */
export function assertOnline(isOnline: boolean): void {
  if (!isOnline) {
    throw new Error('Network request failed — device is offline');
  }
}
