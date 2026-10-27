import { describe, expect, it } from 'vitest'
import { cn } from './index'

describe('cn', () => {
  it('lets a later semantic radius override an earlier one', () => {
    expect(cn('rounded-surface', 'rounded-none')).toBe('rounded-none')
    expect(cn('rounded-md', 'rounded-control')).toBe('rounded-control')
  })

  it('lets a later semantic color override an earlier one', () => {
    expect(cn('bg-primary', 'bg-danger')).toBe('bg-danger')
  })
})
