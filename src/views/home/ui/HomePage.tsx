import { Suspense } from 'react'
import { UserList } from '@/entities/user'

// Server Component — orchestrates layout and streaming boundaries.
// Data fetching is delegated to UserList so each section can stream independently.
export function HomePage() {
  return (
    <section className="mx-auto max-w-5xl px-6 py-12">
      <h1 className="mb-1 text-3xl font-bold text-gray-900">Team</h1>
      <p className="mb-8 text-gray-500">Members of your organization.</p>
      <Suspense fallback={<p className="text-sm text-gray-400">Loading team...</p>}>
        <UserList />
      </Suspense>
    </section>
  )
}
