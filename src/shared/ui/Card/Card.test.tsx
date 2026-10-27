import { render, screen } from '@testing-library/react'
import { describe, expect, it } from 'vitest'
import { Card } from './Card'

// Uses the real `#ui-kit` (default kit): tests prop mapping, not kit styling.
describe('Card adapter', () => {
  it('renders children and forwards className to the kit card', () => {
    render(
      <Card className="mt-4">
        <p>content</p>
      </Card>
    )
    const card = screen.getByText('content').parentElement
    expect(card).toHaveClass('mt-4')
    expect(card).toHaveClass('bg-surface')
  })
})
