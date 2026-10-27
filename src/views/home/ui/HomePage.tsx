import { Suspense } from 'react'
import { UserList } from '@/entities/user'

// Server Component — orchestrates layout and streaming boundaries.
//
// STARTER CONTENT: Replace this page with your application's actual home screen.
// The UserList below is kept only to demonstrate the Suspense streaming pattern.
// Delete it (and src/entities/user/) once you have your own entities.
export function HomePage() {
  return (
    <section className="mx-auto max-w-5xl px-6 py-12">
      <h1 className="mb-1 text-3xl font-bold text-foreground">Welcome</h1>
      <p className="mb-8 text-muted-foreground">
        This is your application's home page. Replace this content with your own widgets and
        features following the FSD layer conventions.
      </p>

      {/* Example: streaming list with Suspense boundary — replace with your own widgets */}
      <h2 className="mb-4 text-xl font-semibold text-foreground">Users (example entity)</h2>
      <Suspense fallback={<p className="text-sm text-muted-foreground">Loading...</p>}>
        <UserList />
      </Suspense>
    </section>
  )
}
