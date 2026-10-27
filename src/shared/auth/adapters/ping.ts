/**
 * PingFederate / PingOne OIDC adapter example.
 *
 * To activate:
 *   1. pnpm add jose
 *   2. Set env vars: PING_ISSUER, PING_CLIENT_ID, PING_CLIENT_SECRET,
 *      APP_BASE_URL (this app's public origin, used for the callback URL)
 *   3. Set AUTH_PROVIDER=ping (selection happens in src/shared/auth/server.ts).
 *
 * Install `jose` *before* adding its imports here: the bundler resolves every
 * adapter in server.ts at build time, even unselected ones, so a missing
 * package fails `pnpm build` for every AUTH_PROVIDER value.
 *
 * This adapter validates the JWT in the session cookie using `jose` and maps
 * Ping's claims → the shared Session type through Zod.
 */
import type { NextRequest } from 'next/server'
import type { AuthAdapter } from '../auth-adapter'
import { SessionSchema } from '../types'
import type { Session } from '../types'

const SESSION_COOKIE = 'ping_session'

async function validateJwt(token: string): Promise<Record<string, unknown> | null> {
  // Replace with real jose validation, e.g.:
  // import { jwtVerify, createRemoteJWKSet } from 'jose'
  // const JWKS = createRemoteJWKSet(new URL(`${process.env.PING_ISSUER}/jwks`))
  // const { payload } = await jwtVerify(token, JWKS, { issuer: process.env.PING_ISSUER })
  // return payload
  console.warn('Ping JWT validation stub called — configure jose in ping.ts')
  void token
  return null
}

export const pingAdapter: AuthAdapter = {
  async getSession(request: NextRequest): Promise<Session | null> {
    const token = request.cookies.get(SESSION_COOKIE)?.value
    if (!token) return null

    const payload = await validateJwt(token)
    if (!payload) return null

    return SessionSchema.parse({
      user: {
        id: payload.sub as string,
        email: payload.email as string,
        name: payload.name as string | undefined,
        role: (payload.app_role as string | undefined) ?? 'member',
      },
      expiresAt: (payload.exp as number | undefined) ?? Math.floor(Date.now() / 1000) + 3600,
    })
  },

  getLoginUrl(returnTo = '/') {
    const issuer = process.env.PING_ISSUER ?? ''
    const clientId = process.env.PING_CLIENT_ID ?? ''
    const redirectUri = encodeURIComponent(`${process.env.APP_BASE_URL ?? ''}/api/auth/callback`)
    const state = encodeURIComponent(returnTo)
    return `${issuer}/as/authorization.oauth2?response_type=code&client_id=${clientId}&redirect_uri=${redirectUri}&scope=openid+profile+email&state=${state}`
  },

  getLogoutUrl(returnTo = '/') {
    const issuer = process.env.PING_ISSUER ?? ''
    return `${issuer}/idp/startSLO.ping?TargetResource=${encodeURIComponent(returnTo)}`
  },

  async validateRequest(request: NextRequest): Promise<Session | null> {
    return this.getSession(request)
  },
}
