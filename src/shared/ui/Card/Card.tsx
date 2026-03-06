import type { ReactNode } from 'react'
import { cn } from '@/shared/utils'

/**
 * Adapter for @org/ui-kit Card.
 *
 * To connect to the real design system, replace the implementation below with:
 *   import { Card as OrgCard } from '@org/ui-kit'
 * and map CardProps to OrgCard's props.
 */

export interface CardProps {
  children: ReactNode
  className?: string
}

export function Card({ children, className }: CardProps) {
  return (
    <div className={cn('rounded-lg border border-gray-200 bg-white p-6 shadow-sm', className)}>
      {children}
    </div>
  )
}
