/**
 * useAuth — authentication context hook.
 *
 * Re-exports the AuthContext hook and provider so existing UI imports work
 * without changes. The real implementation lives in `@/context/AuthContext`.
 */

export { useAuthContext as useAuth, AuthProvider } from '@/context/AuthContext';
export type { AuthContextValue } from '@/context/AuthContext';
