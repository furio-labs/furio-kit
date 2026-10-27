import { clsx, type ClassValue } from 'clsx'
import { extendTailwindMerge } from 'tailwind-merge'

// Teach tailwind-merge the semantic radius tokens from app/globals.css, so
// `rounded-surface rounded-none` resolves to the last class like built-in radii.
const twMerge = extendTailwindMerge({
  extend: { theme: { radius: ['control', 'surface'] } },
})

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}

export function formatDate(date: Date): string {
  return date.toLocaleDateString('en-US', {
    year: 'numeric',
    month: 'long',
    day: 'numeric',
  })
}
