import { render, screen } from '@testing-library/react'
import { describe, expect, it } from 'vitest'
import { UserCard } from './UserCard'
import type { User } from '../model/types'

const mockUser: User = {
  id: '1',
  name: 'Alex Rivera',
  email: 'alex@example.com',
  role: 'admin',
}

describe('UserCard', () => {
  it('renders user name and email', () => {
    render(<UserCard user={mockUser} />)
    expect(screen.getByText('Alex Rivera')).toBeInTheDocument()
    expect(screen.getByText('alex@example.com')).toBeInTheDocument()
  })

  it('renders role badge', () => {
    render(<UserCard user={mockUser} />)
    expect(screen.getByText('admin')).toBeInTheDocument()
  })

  it('renders avatar initial', () => {
    render(<UserCard user={mockUser} />)
    expect(screen.getByText('A')).toBeInTheDocument()
  })
})
