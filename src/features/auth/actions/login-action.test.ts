import { beforeEach, describe, expect, it, vi } from 'vitest'
import { loginAction } from './login-action'

const redirect = vi.hoisted(() =>
  vi.fn((url: string) => {
    throw new Error(`NEXT_REDIRECT:${url}`)
  })
)
vi.mock('next/navigation', () => ({ redirect }))

function form(fields: Record<string, string>): FormData {
  const data = new FormData()
  for (const [key, value] of Object.entries(fields)) data.set(key, value)
  return data
}

async function redirectTarget(data: FormData): Promise<URL> {
  await expect(loginAction(data)).rejects.toThrow('NEXT_REDIRECT')
  expect(redirect).toHaveBeenCalledTimes(1)
  return new URL(redirect.mock.calls[0][0], 'http://localhost')
}

describe('loginAction', () => {
  beforeEach(() => {
    redirect.mockClear()
  })

  it('redirects back to /login with an error code for an invalid email', async () => {
    const url = await redirectTarget(form({ email: 'not-an-email', password: 'longenough' }))
    expect(url.pathname).toBe('/login')
    expect(url.searchParams.get('error')).toBe('invalid_email')
  })

  it('redirects back with an error code for a short password', async () => {
    const url = await redirectTarget(form({ email: 'dev@example.com', password: 'short' }))
    expect(url.searchParams.get('error')).toBe('password_too_short')
  })

  it('rejects missing fields', async () => {
    const url = await redirectTarget(new FormData())
    expect(url.pathname).toBe('/login')
    expect(url.searchParams.get('error')).toBeTruthy()
  })

  it('reports that auth is not configured for valid input', async () => {
    const url = await redirectTarget(form({ email: 'dev@example.com', password: 'longenough' }))
    expect(url.searchParams.get('error')).toBe('not_configured')
  })

  it('preserves a relative returnTo across the error redirect', async () => {
    const url = await redirectTarget(
      form({ email: 'bad', password: 'longenough', returnTo: '/reports?tab=1' })
    )
    expect(url.searchParams.get('returnTo')).toBe('/reports?tab=1')
  })

  it.each(['https://evil.example', '//evil.example', '/\\evil.example'])(
    'drops an off-site returnTo (%s)',
    async (returnTo) => {
      const url = await redirectTarget(form({ email: 'bad', password: 'longenough', returnTo }))
      expect(url.searchParams.has('returnTo')).toBe(false)
    }
  )
})
