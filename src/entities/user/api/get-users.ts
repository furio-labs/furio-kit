import 'server-only'
import { z } from 'zod'
import { env } from '@/shared/env'
import { logger } from '@/shared/observability'
import { UserSchema } from '../model/types'

const UsersResponseSchema = z.array(UserSchema)

// DEV fallback: used only outside production when API_URL is not configured.
const DEV_MOCK = [
  { id: '1', name: 'Alex Rivera', email: 'alex@example.com', role: 'admin' },
  { id: '2', name: 'Sam Okoro', email: 'sam@example.com', role: 'member' },
  { id: '3', name: 'Jamie Chen', email: 'jamie@example.com', role: 'viewer' },
]

export async function getUsers() {
  // Server-only variable: NEXT_PUBLIC_* would inline the backend URL into browser bundles.
  const apiUrl = env.API_URL

  if (!apiUrl) {
    if (env.NODE_ENV === 'production') {
      logger.error('users.fetch.misconfigured', { reason: 'API_URL not set' })
      throw new Error('API_URL is not set; refusing to serve mock users in production.')
    }
    logger.debug('users.fetch.mock', { reason: 'API_URL not set' })
    return UsersResponseSchema.parse(DEV_MOCK)
  }

  const res = await fetch(`${apiUrl}/users`, { next: { revalidate: 60 } })
  if (!res.ok) {
    logger.error('users.fetch.failed', { status: res.status, url: `${apiUrl}/users` })
    throw new Error(`Failed to fetch users: ${res.status}`)
  }
  const data = UsersResponseSchema.parse(await res.json())
  logger.info('users.fetch.success', { count: data.length })
  return data
}
