import NextLink from 'next/link'
import type { ComponentProps } from 'react'

export type LinkProps = ComponentProps<typeof NextLink>

/**
 * next/link with prefetching off unless the caller opts in.
 *
 * By default next/link prefetches every link that scrolls into view, which
 * spends data the user didn't ask for on slow or metered connections. Pass
 * `prefetch` (true or 'auto') on the few links users almost always follow,
 * such as primary navigation.
 *
 * Deliberately not a Client Component: a 'use client' wrapper that reads
 * navigator.connection measured ~9 KB gzip extra on every page that rendered it.
 */
export function Link({ prefetch = false, ...rest }: LinkProps) {
  return <NextLink prefetch={prefetch} {...rest} />
}
