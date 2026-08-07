/**
 * Error classification utility.
 *
 * Inspects an unknown error thrown by Supabase / fetch / native code and returns
 * a typed `AppError` with a user-friendly message and a retryable flag. Used by
 * every screen's catch block so the UI can render a consistent <ErrorView>.
 *
 * Classification order matters: network is checked first (offline looks like a
 * TypeError), then auth, then not_found, then server, falling back to unknown.
 */

export type AppErrorType =
  | 'network'
  | 'auth'
  | 'not_found'
  | 'server'
  | 'unknown';

export type AppError = {
  type: AppErrorType;
  message: string;
  retryable: boolean;
  /** Original error for logging; never shown to the user. */
  cause?: unknown;
};

// ── User-friendly messages ──
const MESSAGES: Record<AppErrorType, string> = {
  network: "You're offline. Check your connection and try again.",
  auth: 'Your session has expired. Please sign in again.',
  not_found: "We couldn't find what you're looking for.",
  server: 'Our servers are having trouble. Please try again shortly.',
  unknown: 'Something went wrong. Please try again.',
};

// ── Error shape helpers ──
function asError(e: unknown): Error & Record<string, any> {
  if (e instanceof Error) return e as Error & Record<string, any>;
  if (typeof e === 'string') return new Error(e) as Error & Record<string, any>;
  return new Error(String(e ?? '')) as Error & Record<string, any>;
}

function hasCode(obj: unknown): obj is { code: string } {
  return (
    typeof obj === 'object' &&
    obj !== null &&
    'code' in obj &&
    typeof (obj as any).code === 'string'
  );
}

function hasStatus(obj: unknown): obj is { status: number } {
  return (
    typeof obj === 'object' &&
    obj !== null &&
    'status' in obj &&
    typeof (obj as any).status === 'number'
  );
}

function hasMessage(obj: unknown): obj is { message: string } {
  return (
    typeof obj === 'object' &&
    obj !== null &&
    'message' in obj &&
    typeof (obj as any).message === 'string'
  );
}

// ── Predicate checks ──

function isNetworkError(err: Error & Record<string, any>): boolean {
  const msg = (err.message ?? '').toLowerCase();

  // React Native fetch failure (offline / DNS / connection refused at fetch layer)
  if (err instanceof TypeError && /network request failed/.test(msg)) return true;

  // Explicit connection-refused / connection-reset codes
  if (hasCode(err) && ['ECONNREFUSED', 'ECONNRESET', 'ENOTFOUND', 'ETIMEDOUT', 'EAI_AGAIN'].includes(err.code)) {
    return true;
  }

  // Timeout patterns
  if (/timeout|timed out|abort/.test(msg)) return true;
  if (err.name === 'AbortError' || err.name === 'TimeoutError') return true;

  // Supabase/PostgREST network failures sometimes surface with these hints
  if (/fetch failed|network error|failed to fetch|no response|connection refused/.test(msg)) return true;

  return false;
}

function isAuthError(err: Error & Record<string, any>): boolean {
  const msg = (err.message ?? '').toLowerCase();

  // Supabase auth error codes
  if (hasCode(err)) {
    const authCodes = [
      'jwt_expired',
      'jwt_invalid',
      'session_expired',
      'session_not_found',
      'user_not_found',
      'invalid_credentials',
      'AuthSessionMissingError',
      'AuthRetryableError',
    ];
    if (authCodes.includes(err.code)) return true;
  }

  // Supabase auth error names / messages
  if (/jwt expired|session.*(missing|expired|not found|invalid)|invalid.*token|not authenticated|unauthorized/.test(msg)) {
    return true;
  }
  if (err.name === 'AuthSessionMissingError' || err.name === 'AuthApiError') {
    if (/session|jwt|token|unauthorized|401/.test(msg)) return true;
  }

  // HTTP 401
  if (hasStatus(err) && err.status === 401) return true;

  return false;
}

function isNotFoundError(err: Error & Record<string, any>): boolean {
  // PostgREST not-found error code
  if (hasCode(err) && err.code === 'PGRST116') return true;

  // HTTP 404
  if (hasStatus(err) && err.status === 404) return true;

  const msg = (err.message ?? '').toLowerCase();
  if (/not found|does not exist|no rows|404/.test(msg)) return true;

  return false;
}

function isServerError(err: Error & Record<string, any>): boolean {
  // HTTP 5xx
  if (hasStatus(err) && err.status >= 500 && err.status < 600) return true;

  const msg = (err.message ?? '').toLowerCase();
  if (/internal server error|500|502|503|504|bad gateway|service unavailable|database connection/.test(msg)) {
    return true;
  }

  return false;
}

// ── Public API ──

export function classifyError(e: unknown): AppError {
  const err = asError(e);

  // Check in priority order: network → auth → not_found → server → unknown
  if (isNetworkError(err)) {
    return { type: 'network', message: MESSAGES.network, retryable: true, cause: e };
  }

  if (isAuthError(err)) {
    return { type: 'auth', message: MESSAGES.auth, retryable: false, cause: e };
  }

  if (isNotFoundError(err)) {
    return { type: 'not_found', message: MESSAGES.not_found, retryable: false, cause: e };
  }

  if (isServerError(err)) {
    return { type: 'server', message: MESSAGES.server, retryable: true, cause: e };
  }

  return { type: 'unknown', message: MESSAGES.unknown, retryable: true, cause: e };
}

/**
 * Convenience: classify and also console.error with a screen tag.
 * Screens call this in their catch blocks so they don't need a separate log line.
 */
export function classifyAndLog(e: unknown, tag: string): AppError {
  console.error(`[${tag}] error:`, e);
  return classifyError(e);
}
