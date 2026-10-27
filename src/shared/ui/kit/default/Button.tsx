import type { ReactNode } from 'react'
import { cn } from '@/shared/utils'

export interface KitButtonProps {
  children: ReactNode
  onClick?: () => void
  variant?: 'primary' | 'secondary' | 'ghost'
  disabled?: boolean
  type?: 'button' | 'submit' | 'reset'
  className?: string
}

const variantStyles: Record<NonNullable<KitButtonProps['variant']>, string> = {
  primary: 'bg-primary text-primary-foreground hover:bg-primary-hover',
  secondary: 'bg-secondary text-secondary-foreground hover:bg-secondary-hover',
  ghost: 'bg-transparent text-ghost-foreground hover:bg-muted',
}

// Placeholder kit primitive. Semantic token classes only — see ../CONTRACT.md.
export function Button({
  children,
  variant = 'primary',
  type = 'button',
  disabled,
  onClick,
  className,
}: KitButtonProps) {
  return (
    <button
      type={type}
      onClick={onClick}
      disabled={disabled}
      className={cn(
        'rounded-control px-4 py-2 text-sm font-medium transition-colors disabled:opacity-50',
        variantStyles[variant],
        className
      )}
    >
      {children}
    </button>
  )
}
