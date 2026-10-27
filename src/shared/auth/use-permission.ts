'use client'
import { useUIStore } from '@/shared/providers'
import { hasPermission } from './permissions'
import type { Permission } from './permissions'

// UI-only guard for hiding/disabling elements based on role.
// Real enforcement always happens server-side via requirePermission()
// from `@/shared/auth/server`. Import this hook from `@/shared/auth/client`.
export function usePermission(permission: Permission): boolean {
  const user = useUIStore((s) => s.session?.user)
  if (!user) return false
  return hasPermission(user, permission)
}
