/**
 * Auth0 adapter example.
 *
 * To activate:
 *   1. pnpm add @auth0/nextjs-auth0
 *   2. Set env vars: AUTH0_DOMAIN, AUTH0_CLIENT_ID, AUTH0_CLIENT_SECRET, AUTH_SECRET,
 *      APP_BASE_URL (this app's public origin, used for the callback URL)
 *   3. Set AUTH_PROVIDER=auth0 (selection happens in src/shared/auth/server.ts).
 *
 * Install the SDK *before* adding its imports here: the bundler resolves every
 * adapter in server.ts at build time, even unselected ones, so a missing
 * package fails `pnpm build` for every AUTH_PROVIDER value.
 *
 * This file shows how to map Auth0's session shape → the shared Session type.
 * Swap in the real @auth0/nextjs-auth0 imports and remove the stubs below.
 */
import type { NextRequest } from 'next/server'
import type { AuthAdapter } from '../auth-adapter'
import { SessionSchema } from '../types'
import type { Session } from '../types'

// --- Stub types (replace with real @auth0/nextjs-auth0 imports) ---
interface Auth0Session {
  user: {
    sub: string
    email: string
    name?: string
    'https://my-app/role'?: string
  }
  accessTokenExpiresAt?: number
}
// -----------------------------------------------------------------

async function getAuth0Session(_request: NextRequest): Promise<Auth0Session | null> {
  // Replace this stub with the real SDK call, e.g.:
  // import { getSession } from '@auth0/nextjs-auth0/edge'
  // return getSession()
  throw new Error('Auth0 adapter not fully configured. See comments in auth0.ts.')
}

export const auth0Adapter: AuthAdapter = {
  async getSession(request: NextRequest): Promise<Session | null> {
    const auth0Session = await getAuth0Session(request)
    if (!auth0Session) return null

    return SessionSchema.parse({
      user: {
        id: auth0Session.user.sub,
        email: auth0Session.user.email,
        name: auth0Session.user.name,
        role: auth0Session.user['https://my-app/role'] ?? 'member',
      },
      expiresAt: auth0Session.accessTokenExpiresAt ?? Math.floor(Date.now() / 1000) + 3600,
    })
  },

  getLoginUrl(returnTo = '/') {
    const domain = process.env.AUTH0_DOMAIN ?? ''
    const clientId = process.env.AUTH0_CLIENT_ID ?? ''
    const redirectUri = encodeURIComponent(`${process.env.APP_BASE_URL ?? ''}/api/auth/callback`)
    const state = encodeURIComponent(returnTo)
    return `https://${domain}/authorize?response_type=code&client_id=${clientId}&redirect_uri=${redirectUri}&scope=openid+profile+email&state=${state}`
  },

  getLogoutUrl(returnTo = '/') {
    const domain = process.env.AUTH0_DOMAIN ?? ''
    const clientId = process.env.AUTH0_CLIENT_ID ?? ''
    const returnToUrl = encodeURIComponent(returnTo)
    return `https://${domain}/v2/logout?client_id=${clientId}&returnTo=${returnToUrl}`
  },

  async validateRequest(request: NextRequest): Promise<Session | null> {
    return this.getSession(request)
  },
}
