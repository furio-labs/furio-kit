import type { Metadata } from 'next'
import type { ReactNode } from 'react'
import { QueryProvider, StoreProvider } from '@/shared/providers'
import { Header } from '@/widgets/header'
import './globals.css'

export const metadata: Metadata = {
  title: 'furio-kit',
  description: 'Enterprise React boilerplate by FurioLabs',
}

export default function RootLayout({ children }: { children: ReactNode }) {
  return (
    <html lang="en">
      <body className="min-h-screen bg-gray-50 text-gray-900">
        <StoreProvider>
          <QueryProvider>
            <Header />
            <main>{children}</main>
          </QueryProvider>
        </StoreProvider>
      </body>
    </html>
  )
}
