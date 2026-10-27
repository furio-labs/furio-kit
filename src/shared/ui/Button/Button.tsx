'use client'

import type { ReactNode } from 'react'
import { Button as KitButton } from '#ui-kit'

export interface ButtonProps {
  children: ReactNode
  onClick?: () => void
  variant?: 'primary' | 'secondary' | 'ghost'
  disabled?: boolean
  type?: 'button' | 'submit' | 'reset'
  className?: string
}

// Adapter: the app depends on ButtonProps, not on the active kit's API.
// Map props here when the kit (#ui-kit) names them differently.
export function Button({
  children,
  variant = 'primary',
  type = 'button',
  disabled,
  onClick,
  className,
}: ButtonProps) {
  return (
    <KitButton
      variant={variant}
      type={type}
      disabled={disabled}
      onClick={onClick}
      className={className}
    >
      {children}
    </KitButton>
  )
}
