"use client";

import { useAuthContext, type AuthContextValue } from "./auth-context";

/**
 * Hook for consuming authentication context.
 * Provides access to user state and auth methods.
 *
 * @returns AuthContextValue containing user, isLoading, and auth methods
 * @throws Error if used outside of AuthProvider
 */
export function useAuth(): AuthContextValue {
  return useAuthContext();
}
