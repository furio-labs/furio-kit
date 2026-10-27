import type { NextRequest } from 'next/server'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'

const logger = vi.hoisted(() => ({
  debug: vi.fn(),
  info: vi.fn(),
  warn: vi.fn(),
  error: vi.fn(),
}))
vi.mock('@/shared/observability', () => ({ logger }))

const request = {} as NextRequest

async function loadMock() {
  vi.resetModules()
  const { mockAdapter } = await import('./mock')
  return mockAdapter
}

describe('mockAdapter', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  afterEach(() => {
    vi.unstubAllEnvs()
  })

  it('returns no session when MOCK_AUTH_USER is unset', async () => {
    vi.stubEnv('MOCK_AUTH_USER', '')
    const adapter = await loadMock()
    await expect(adapter.getSession(request)).resolves.toBeNull()
  })

  it('returns an admin session in development when MOCK_AUTH_USER is set', async () => {
    vi.stubEnv('NODE_ENV', 'development')
    vi.stubEnv('MOCK_AUTH_USER', '1')
    const adapter = await loadMock()
    const session = await adapter.validateRequest(request)
    expect(session?.user.role).toBe('admin')
  })

  describe('in production', () => {
    beforeEach(() => {
      vi.stubEnv('NODE_ENV', 'production')
      vi.stubEnv('MOCK_AUTH_USER', '1')
    })

    it('loads without throwing', async () => {
      await expect(loadMock()).resolves.toBeDefined()
    })

    it('fails closed: no session even when MOCK_AUTH_USER is set', async () => {
      const adapter = await loadMock()
      await expect(adapter.getSession(request)).resolves.toBeNull()
      await expect(adapter.validateRequest(request)).resolves.toBeNull()
    })

    it('logs the misconfiguration once, not on every request', async () => {
      const adapter = await loadMock()
      await adapter.getSession(request)
      await adapter.getSession(request)
      await adapter.validateRequest(request)
      expect(logger.error).toHaveBeenCalledTimes(1)
      expect(logger.error).toHaveBeenCalledWith(
        'auth.mock.production',
        expect.objectContaining({ hint: expect.stringContaining('AUTH_PROVIDER') })
      )
    })
  })
})
