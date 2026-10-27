import type { NextRequest } from 'next/server'
import { logger } from '@/shared/observability'
import type { AuthAdapter } from '../auth-adapter'
import type { Session } from '../types'
import { SessionSchema } from '../types'

let productionErrorLogged = false

/**
 * The mock adapter must never authenticate anyone in production. Rather than
 * throwing (which would turn every request into a 500, including /login), it
 * fails closed: no session, so protected routes redirect to /login. The
 * misconfiguration is logged once per process so it shows up in server logs.
 */
function isBlockedInProduction(): boolean {
  if (process.env.NODE_ENV !== 'production') return false
  if (!productionErrorLogged) {
    productionErrorLogged = true
    logger.error('auth.mock.production', {
      detail: 'Mock auth adapter is active in production; every request is unauthenticated.',
      hint: 'Set AUTH_PROVIDER=auth0 or AUTH_PROVIDER=ping and configure that adapter (see docs/wiki/05-auth.md).',
    })
  }
  return true
}

/**
 * Mock auth adapter for local development (AUTH_PROVIDER=mock, the default).
 *
 * Behavior:
 *   - Returns `null` (unauthenticated) by default.
 *   - When the `MOCK_AUTH_USER` env var is set to any non-empty value,
 *     returns a mock admin session so you can develop authenticated UIs
 *     without running a real identity provider.
 *   - In production (NODE_ENV=production) always returns `null`, regardless
 *     of MOCK_AUTH_USER.
 */
export const mockAdapter: AuthAdapter = {
  async getSession(_request: NextRequest): Promise<Session | null> {
    if (isBlockedInProduction()) return null
    if (!process.env.MOCK_AUTH_USER) return null

    return SessionSchema.parse({
      user: {
        id: 'mock-user-1',
        email: 'dev@example.com',
        name: 'Dev User',
        role: 'admin',
      },
      expiresAt: Math.floor(Date.now() / 1000) + 60 * 60 * 8, // 8 hours
    })
  },

  getLoginUrl(returnTo = '/') {
    return `/login?returnTo=${encodeURIComponent(returnTo)}`
  },

  getLogoutUrl(returnTo = '/') {
    return `/logout?returnTo=${encodeURIComponent(returnTo)}`
  },

  async validateRequest(request: NextRequest): Promise<Session | null> {
    return this.getSession(request)
  },
}
