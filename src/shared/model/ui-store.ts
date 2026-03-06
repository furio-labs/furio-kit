import { createStore } from 'zustand'

interface UIState {
  sidebarOpen: boolean
  toggleSidebar: () => void
}

export type UIStore = ReturnType<typeof createUIStore>

export const createUIStore = () =>
  createStore<UIState>()((set) => ({
    sidebarOpen: false,
    toggleSidebar: () => set((state) => ({ sidebarOpen: !state.sidebarOpen })),
  }))
