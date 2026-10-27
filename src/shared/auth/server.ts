import 'server-only'
import { headers } from 'next/headers'
import { redirect } from 'next/navigation'
import { NextRequest } from 'next/server'
import { type AuthProvider, env } from '@/shared/env'
import type { AuthAdapter } from './auth-adapter'
import { hasPermission, type Permission } from './permissions'
import type { Session } from './types'

/**
 * Server-side auth entry point: adapter selection, session lookup, guards.
 *
 * The active adapter is chosen by the AUTH_PROVIDER env var (validated in
 * `@/shared/env`). Each provider is loaded lazily, so only the selected
 * adapter's code runs. Note that the bundler still *resolves* every import()
 * target below at build time: if an adapter imports an SDK you haven't
 * installed, either install it or remove that adapter's line from this map.
 */
const ADAPTER_LOADERS: Record<AuthProvider, () => Promise<AuthAdapter>> = {
  mock: () => import('./adapters/mock').then((m) => m.mockAdapter),
  auth0: () => import('./adapters/auth0').then((m) => m.auth0Adapter),
  ping: () => import('./adapters/ping').then((m) => m.pingAdapter),
}

let activeAdapter: Promise<AuthAdapter> | undefined

/** Returns the adapter selected by AUTH_PROVIDER (loaded once per process). */
export function getAuthAdapter(): Promise<AuthAdapter> {
  activeAdapter ??= ADAPTER_LOADERS[env.AUTH_PROVIDER]()
  return activeAdapter
}

/**
 * Session for the current request, for Server Components and Server Actions
 * (proxy.ts receives the request directly and calls the adapter itself).
 */
export async function getServerSession(): Promise<Session | null> {
  const adapter = await getAuthAdapter()
  // Adapters read cookies/headers from a NextRequest; rebuild one from the
  // incoming request headers (cookies travel in the `cookie` header).
  const request = new NextRequest('http://localhost/', { headers: await headers() })
  return adapter.validateRequest(request)
}

/**
 * Server-side RBAC guard. Redirects to login when unauthenticated and to /403
 * when the user lacks the permission; otherwise returns the session.
 */
export async function requirePermission(permission: Permission): Promise<Session> {
  const session = await getServerSession()
  if (!session) {
    const adapter = await getAuthAdapter()
    redirect(adapter.getLoginUrl())
  }
  if (!hasPermission(session.user, permission)) redirect('/403')
  return session
}

export type { AuthAdapter } from './auth-adapter'
