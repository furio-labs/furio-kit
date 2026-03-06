'use client'

import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { useRef, type ReactNode } from 'react'

export function QueryProvider({ children }: { children: ReactNode }) {
  // useRef prevents a new QueryClient from being created on every render
  // while keeping the instance isolated per request on the server.
  const clientRef = useRef<QueryClient | null>(null)
  if (!clientRef.current) {
    clientRef.current = new QueryClient()
  }

  return (
    <QueryClientProvider client={clientRef.current}>{children}</QueryClientProvider>
  )
}
