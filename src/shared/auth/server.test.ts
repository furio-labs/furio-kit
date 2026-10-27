import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'

const headerStore = vi.hoisted(() => ({ cookie: '' }))
vi.mock('next/headers', () => ({
  headers: async () => new Headers({ cookie: headerStore.cookie }),
}))

const redirect = vi.hoisted(() =>
  vi.fn((url: string) => {
    throw new Error(`NEXT_REDIRECT:${url}`)
  })
)
vi.mock('next/navigation', () => ({ redirect }))

async function loadServer() {
  vi.resetModules()
  return import('./server')
}

describe('auth adapter selection', () => {
  afterEach(() => {
    vi.unstubAllEnvs()
  })

  it.each([
    ['mock', async () => (await import('./adapters/mock')).mockAdapter],
    ['auth0', async () => (await import('./adapters/auth0')).auth0Adapter],
    ['ping', async () => (await import('./adapters/ping')).pingAdapter],
  ] as const)('AUTH_PROVIDER=%s loads that adapter', async (provider, loadExpected) => {
    vi.stubEnv('AUTH_PROVIDER', provider)
    const { getAuthAdapter } = await loadServer()
    await expect(getAuthAdapter()).resolves.toBe(await loadExpected())
  })

  it('defaults to the mock adapter when AUTH_PROVIDER is unset', async () => {
    vi.stubEnv('AUTH_PROVIDER', '')
    const { getAuthAdapter } = await loadServer()
    const { mockAdapter } = await import('./adapters/mock')
    await expect(getAuthAdapter()).resolves.toBe(mockAdapter)
  })

  it('rejects an unknown AUTH_PROVIDER at load time', async () => {
    vi.stubEnv('AUTH_PROVIDER', 'okta')
    await expect(loadServer()).rejects.toThrow()
  })
})

describe('getServerSession / requirePermission', () => {
  beforeEach(() => {
    redirect.mockClear()
    vi.stubEnv('AUTH_PROVIDER', 'mock')
    vi.stubEnv('NODE_ENV', 'development')
  })

  afterEach(() => {
    vi.unstubAllEnvs()
  })

  it('returns null when unauthenticated', async () => {
    vi.stubEnv('MOCK_AUTH_USER', '')
    const { getServerSession } = await loadServer()
    await expect(getServerSession()).resolves.toBeNull()
  })

  it('redirects to the login URL when unauthenticated', async () => {
    vi.stubEnv('MOCK_AUTH_USER', '')
    const { requirePermission } = await loadServer()
    await expect(requirePermission('users:read')).rejects.toThrow('NEXT_REDIRECT:/login')
  })

  it('returns the session when the user has the permission', async () => {
    vi.stubEnv('MOCK_AUTH_USER', '1')
    const { requirePermission } = await loadServer()
    const session = await requirePermission('settings:write')
    expect(session.user.role).toBe('admin')
    expect(redirect).not.toHaveBeenCalled()
  })
})
