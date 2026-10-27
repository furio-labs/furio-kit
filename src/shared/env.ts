import 'server-only'
import { z } from 'zod'

export const AUTH_PROVIDERS = ['auth0', 'ping', 'mock'] as const

const EnvSchema = z.object({
  NODE_ENV: z.enum(['development', 'test', 'production']),
  /** Selects the adapter loaded by `getAuthAdapter()` in `@/shared/auth/server`. */
  AUTH_PROVIDER: z.enum(AUTH_PROVIDERS).default('mock'),
  /**
   * Backend REST API base URL. Server-only: never prefix it with NEXT_PUBLIC_,
   * which would inline the backend address into browser bundles. Optional so
   * builds and local dev work without a backend; in production, data functions
   * fail at request time when it is missing instead of serving mock data.
   */
  API_URL: z.url().optional(),
})

export type Env = z.infer<typeof EnvSchema>
export type AuthProvider = Env['AUTH_PROVIDER']

// Throws at import time if a variable is set to an invalid value.
// Imported by instrumentation.ts so the error surfaces at server startup.
// Empty strings count as unset (`API_URL=` in CI or .env files).
export const env: Env = EnvSchema.parse({
  NODE_ENV: process.env.NODE_ENV,
  AUTH_PROVIDER: process.env.AUTH_PROVIDER || undefined,
  API_URL: process.env.API_URL || undefined,
})
