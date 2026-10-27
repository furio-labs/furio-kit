import { render, screen } from '@testing-library/react'
import type { ReactNode } from 'react'
import { afterEach, describe, expect, it, vi } from 'vitest'
import { Link } from './Link'

// Expose the prefetch value next/link receives as a data attribute.
vi.mock('next/link', () => ({
  default: ({
    prefetch,
    href,
    children,
  }: {
    prefetch?: boolean | 'auto' | null
    href: string
    children: ReactNode
  }) => (
    <a href={href} data-prefetch={String(prefetch)}>
      {children}
    </a>
  ),
}))

function setConnection(value: object | undefined) {
  Object.defineProperty(navigator, 'connection', {
    value: value && Object.assign(new EventTarget(), value),
    configurable: true,
  })
}

function renderedPrefetch(prefetch?: boolean) {
  render(
    <Link href="/x" prefetch={prefetch}>
      go
    </Link>
  )
  return screen.getByText('go').getAttribute('data-prefetch')
}

describe('Link', () => {
  afterEach(() => setConnection(undefined))

  it('disables prefetch when Save-Data is on', () => {
    setConnection({ saveData: true, effectiveType: '4g' })
    expect(renderedPrefetch(true)).toBe('false')
  })

  it.each(['slow-2g', '2g'])('disables prefetch on %s', (effectiveType) => {
    setConnection({ saveData: false, effectiveType })
    expect(renderedPrefetch()).toBe('false')
  })

  it('passes the caller prefetch through on a fast connection', () => {
    setConnection({ saveData: false, effectiveType: '4g' })
    expect(renderedPrefetch(true)).toBe('true')
  })

  it('keeps next/link defaults when prefetch is not set', () => {
    setConnection({ saveData: false, effectiveType: '4g' })
    expect(renderedPrefetch()).toBe('undefined')
  })

  it('passes prefetch through when the Network Information API is missing', () => {
    setConnection(undefined)
    expect(renderedPrefetch(false)).toBe('false')
    expect(screen.getByText('go')).toHaveAttribute('href', '/x')
  })
})
