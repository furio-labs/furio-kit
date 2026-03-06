import Link from 'next/link'

// Server Component — no interactivity needed at this level.
// If a mobile menu or active-link highlight is added, extract that piece as "use client".
export function Header() {
  return (
    <header className="border-b border-gray-200 bg-white">
      <div className="mx-auto flex max-w-5xl items-center justify-between px-6 py-4">
        <Link href="/" className="text-lg font-bold tracking-tight text-gray-900">
          furio-kit
        </Link>
        <nav className="flex gap-6 text-sm text-gray-500">
          <Link href="/" className="hover:text-gray-900">
            Home
          </Link>
          <Link href="/about" className="hover:text-gray-900">
            About
          </Link>
        </nav>
      </div>
    </header>
  )
}
