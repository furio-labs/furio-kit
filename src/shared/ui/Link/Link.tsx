'use client'

import NextLink from 'next/link'
import { type ComponentProps, useSyncExternalStore } from 'react'

export type LinkProps = ComponentProps<typeof NextLink>

// Network Information API — Chromium only, not in lib.dom.
type Connection = EventTarget & { saveData?: boolean; effectiveType?: string }

function getConnection(): Connection | undefined {
  return (navigator as Navigator & { connection?: Connection }).connection
}

function subscribe(onChange: () => void) {
  const connection = getConnection()
  connection?.addEventListener('change', onChange)
  return () => connection?.removeEventListener('change', onChange)
}

// True when the user asked to save data or the link is 2G-class.
function isConstrained() {
  const connection = getConnection()
  if (!connection) return false
  return (
    connection.saveData === true ||
    connection.effectiveType === 'slow-2g' ||
    connection.effectiveType === '2g'
  )
}

// The server can't know the connection; hydrate as "unconstrained" so the
// markup matches, then React re-renders with the client value.
function isConstrainedOnServer() {
  return false
}

/**
 * next/link that skips prefetching on data-saver or 2G connections.
 * Otherwise the caller's `prefetch` passes through unchanged.
 */
export function Link({ prefetch, ...rest }: LinkProps) {
  const constrained = useSyncExternalStore(
    subscribe,
    isConstrained,
    isConstrainedOnServer
  )
  return <NextLink prefetch={constrained ? false : prefetch} {...rest} />
}
