/**
 * Shared auth surface: types and pure helpers, safe to import from both
 * Server and Client Components.
 *
 * Runtime-specific code lives behind dedicated entry points:
 *   - `@/shared/auth/server` — adapter selection (AUTH_PROVIDER), getServerSession,
 *                              requirePermission. Guarded by `server-only`.
 *   - `@/shared/auth/client` — usePermission hook. Guarded by `client-only`.
 */
export type { AuthAdapter } from './auth-adapter'
export type { Permission } from './permissions'
export { hasPermission } from './permissions'
export type { AuthUser, Session } from './types'
export { AuthUserSchema, SessionSchema } from './types'
