import { Link } from '@/shared/ui'

const appName = process.env.NEXT_PUBLIC_APP_NAME ?? 'My App'

// Server Component — no interactivity needed at this level.
// If a mobile menu or active-link highlight is added, extract that piece as "use client".
export function Header() {
  return (
    <header className="border-b border-border bg-surface">
      <div className="mx-auto flex max-w-5xl items-center justify-between px-6 py-4">
        <Link
          href="/"
          className="text-lg font-bold tracking-tight text-foreground"
        >
          {appName}
        </Link>
        <nav className="flex gap-6 text-sm text-muted-foreground">
          <Link href="/" className="hover:text-foreground">
            Home
          </Link>
        </nav>
      </div>
    </header>
  )
}
