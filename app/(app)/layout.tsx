import type { ReactNode } from 'react'
import { Header } from '@/widgets/header'

// Authenticated shell — Server Component with NO client providers.
// Routes placed directly in app/(app)/ are read-only: they ship only the framework
// floor plus whatever client islands they render. Routes that need Zustand or
// TanStack Query live under app/(app)/(interactive)/, whose layout mounts the providers.
export default function AppLayout({ children }: { children: ReactNode }) {
  return (
    <>
      <Header />
      <main>{children}</main>
    </>
  )
}
