import type { ReactNode } from 'react'
import { QueryProvider, StoreProvider } from '@/shared/providers'

// Interactive route group — the URL is unchanged, (interactive) is not a path segment.
//
// Put a route here when it needs client state or a client cache: useUIStore,
// usePermission, TanStack Query hooks or HydrationBoundary. Mounting the providers
// adds TanStack Query + Zustand to that route's JS (~9 KB gzip), so read-only routes
// stay directly in app/(app)/ and never pay for it.
//
// Scaffold either kind with `pnpm generate route`.
export default function InteractiveLayout({ children }: { children: ReactNode }) {
  return (
    <StoreProvider>
      <QueryProvider>{children}</QueryProvider>
    </StoreProvider>
  )
}
