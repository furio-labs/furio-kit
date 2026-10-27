import type { ReactNode } from 'react'
import { cn } from '@/shared/utils'

export interface KitCardProps {
  children: ReactNode
  className?: string
}

// Placeholder kit primitive. Semantic token classes only — see ../CONTRACT.md.
export function Card({ children, className }: KitCardProps) {
  return (
    <div
      className={cn(
        'rounded-surface border border-border bg-surface p-6 shadow-sm',
        className
      )}
    >
      {children}
    </div>
  )
}
