import type { ReactNode } from 'react'
import { Card as KitCard } from '#ui-kit'

export interface CardProps {
  children: ReactNode
  className?: string
}

// Adapter: the app depends on CardProps, not on the active kit's API.
// Map props here when the kit (#ui-kit) names them differently.
export function Card({ children, className }: CardProps) {
  return <KitCard className={className}>{children}</KitCard>
}
