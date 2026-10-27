import type { NextRequest } from 'next/server'
import type { Session } from './types'

/**
 * AuthAdapter defines the contract every authentication provider must satisfy.
 * The active adapter is selected by the AUTH_PROVIDER env var; see
 * `getAuthAdapter()` in `src/shared/auth/server.ts`.
 */
export interface AuthAdapter {
  /**
   * Returns the current session from the incoming request cookies/headers,
   * or `null` if unauthenticated.
   */
  getSession(request: NextRequest): Promise<Session | null>

  /** URL to redirect the user to for login (e.g. /login or Auth0 /authorize). */
  getLoginUrl(returnTo?: string): string

  /** URL to redirect the user to for logout (clears session). */
  getLogoutUrl(returnTo?: string): string

  /**
   * Validates the request and returns the session.
   * Used in middleware to protect routes.
   * Same as getSession — kept as a named alias for clarity in middleware.
   */
  validateRequest(request: NextRequest): Promise<Session | null>
}
