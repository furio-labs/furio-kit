'use client'

import type { ReactNode } from 'react'

/**
 * Adapter for @org/ui-kit Button.
 *
 * To connect to the real design system, replace the implementation below with:
 *   import { Button as OrgButton } from '@org/ui-kit'
 * and map ButtonProps to OrgButton's props.
 */

export interface ButtonProps {
  children: ReactNode
  onClick?: () => void
  variant?: 'primary' | 'secondary' | 'ghost'
  disabled?: boolean
  type?: 'button' | 'submit' | 'reset'
}

const variantStyles: Record<NonNullable<ButtonProps['variant']>, string> = {
  primary: 'bg-blue-600 text-white hover:bg-blue-700',
  secondary: 'bg-gray-100 text-gray-900 hover:bg-gray-200',
  ghost: 'bg-transparent text-gray-700 hover:bg-gray-100',
}

export function Button({
  children,
  variant = 'primary',
  type = 'button',
  disabled,
  onClick,
}: ButtonProps) {
  return (
    <button
      type={type}
      onClick={onClick}
      disabled={disabled}
      className={`rounded-md px-4 py-2 text-sm font-medium transition-colors disabled:opacity-50 ${variantStyles[variant]}`}
    >
      {children}
    </button>
  )
}
