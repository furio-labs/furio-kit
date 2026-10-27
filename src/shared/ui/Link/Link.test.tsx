import { render, screen } from '@testing-library/react'
import type { ReactNode } from 'react'
import { describe, expect, it, vi } from 'vitest'
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

function renderedPrefetch(prefetch?: boolean | 'auto') {
  render(
    <Link href="/x" prefetch={prefetch}>
      go
    </Link>
  )
  return screen.getByText('go').getAttribute('data-prefetch')
}

describe('Link', () => {
  it('turns prefetch off by default', () => {
    expect(renderedPrefetch()).toBe('false')
  })

  it('passes an explicit prefetch through', () => {
    expect(renderedPrefetch(true)).toBe('true')
  })

  it('passes prefetch="auto" through', () => {
    expect(renderedPrefetch('auto')).toBe('auto')
  })
})
