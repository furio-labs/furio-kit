import { fireEvent, render, screen } from '@testing-library/react'
import { describe, expect, it, vi } from 'vitest'
import { Button } from './Button'

// Uses the real `#ui-kit` (default kit): tests prop mapping, not kit styling.
describe('Button adapter', () => {
  it('renders a non-submitting button by default', () => {
    render(<Button>Save</Button>)
    expect(screen.getByRole('button', { name: 'Save' })).toHaveAttribute(
      'type',
      'button'
    )
  })

  it('maps type, disabled and className to the kit button', () => {
    render(
      <Button type="submit" disabled className="w-full">
        Send
      </Button>
    )
    const button = screen.getByRole('button', { name: 'Send' })
    expect(button).toHaveAttribute('type', 'submit')
    expect(button).toBeDisabled()
    expect(button).toHaveClass('w-full')
  })

  it('forwards onClick', () => {
    const onClick = vi.fn()
    render(<Button onClick={onClick}>Go</Button>)
    fireEvent.click(screen.getByRole('button', { name: 'Go' }))
    expect(onClick).toHaveBeenCalledOnce()
  })

  it('maps variant to the kit (primary by default)', () => {
    const { rerender } = render(<Button>V</Button>)
    expect(screen.getByRole('button')).toHaveClass('bg-primary')
    rerender(<Button variant="secondary">V</Button>)
    expect(screen.getByRole('button')).toHaveClass('bg-secondary')
  })
})
