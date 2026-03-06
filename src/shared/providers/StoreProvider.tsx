'use client'

import { createContext, useContext, useRef, type ReactNode } from 'react'
import { useStore } from 'zustand'
import { createUIStore, type UIStore } from '../model/ui-store'

const StoreContext = createContext<UIStore | null>(null)

export function StoreProvider({ children }: { children: ReactNode }) {
  // useRef ensures one store instance per component tree, not per render,
  // preventing shared state across concurrent server requests.
  const storeRef = useRef<UIStore | null>(null)
  if (!storeRef.current) {
    storeRef.current = createUIStore()
  }

  return <StoreContext.Provider value={storeRef.current}>{children}</StoreContext.Provider>
}

export function useUIStore<T>(selector: (state: ReturnType<UIStore['getState']>) => T): T {
  const store = useContext(StoreContext)
  if (!store) throw new Error('useUIStore must be used within StoreProvider')
  return useStore(store, selector)
}
