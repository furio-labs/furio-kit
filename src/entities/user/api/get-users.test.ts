import { afterEach, describe, expect, it, vi } from 'vitest'

vi.mock('@/shared/observability', () => ({
  logger: { debug: vi.fn(), info: vi.fn(), warn: vi.fn(), error: vi.fn() },
}))

async function loadGetUsers() {
  vi.resetModules()
  const { getUsers } = await import('./get-users')
  return getUsers
}

describe('getUsers', () => {
  afterEach(() => {
    vi.unstubAllEnvs()
    vi.unstubAllGlobals()
  })

  it('returns mock users in development when API_URL is unset', async () => {
    vi.stubEnv('NODE_ENV', 'development')
    vi.stubEnv('API_URL', '')
    const getUsers = await loadGetUsers()
    const users = await getUsers()
    expect(users.length).toBeGreaterThan(0)
  })

  it('fails loudly in production when API_URL is unset instead of serving mock data', async () => {
    vi.stubEnv('NODE_ENV', 'production')
    vi.stubEnv('API_URL', '')
    const getUsers = await loadGetUsers()
    await expect(getUsers()).rejects.toThrow(/API_URL/)
  })

  it('fetches from API_URL and validates the response', async () => {
    vi.stubEnv('NODE_ENV', 'production')
    vi.stubEnv('API_URL', 'https://api.example.com')
    const fetchMock = vi.fn(async () =>
      Response.json([{ id: '9', name: 'Pat', email: 'pat@example.com', role: 'viewer' }])
    )
    vi.stubGlobal('fetch', fetchMock)
    const getUsers = await loadGetUsers()

    await expect(getUsers()).resolves.toEqual([
      { id: '9', name: 'Pat', email: 'pat@example.com', role: 'viewer' },
    ])
    expect(fetchMock).toHaveBeenCalledWith('https://api.example.com/users', expect.anything())
  })

  it('ignores NEXT_PUBLIC_API_URL (server code must not use public env vars)', async () => {
    vi.stubEnv('NODE_ENV', 'production')
    vi.stubEnv('API_URL', '')
    vi.stubEnv('NEXT_PUBLIC_API_URL', 'https://api.example.com')
    const getUsers = await loadGetUsers()
    await expect(getUsers()).rejects.toThrow(/API_URL/)
  })
})
