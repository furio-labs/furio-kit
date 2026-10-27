import { render, screen } from '@testing-library/react'
import { describe, expect, it, vi } from 'vitest'
import { LoginForm } from './LoginForm'

vi.mock('../actions/login-action', () => ({ loginAction: vi.fn() }))

async function renderForm(params?: Record<string, string>) {
  const ui = await LoginForm(params ? { searchParams: Promise.resolve(params) } : {})
  return render(ui)
}

describe('LoginForm', () => {
  it('renders a plain form that submits without client JavaScript', async () => {
    const { container } = await renderForm()
    const form = container.querySelector('form')
    expect(form).not.toBeNull()
    expect(screen.getByLabelText('Email')).toHaveAttribute('name', 'email')
    expect(screen.getByLabelText('Password')).toHaveAttribute('name', 'password')
    expect(screen.getByRole('button', { name: 'Sign in' })).toHaveAttribute('type', 'submit')
    expect(screen.queryByRole('alert')).toBeNull()
  })

  it('shows the message for a known error code', async () => {
    await renderForm({ error: 'invalid_email' })
    expect(screen.getByRole('alert')).toHaveTextContent('Invalid email address')
  })

  it('never reflects an unknown error value', async () => {
    await renderForm({ error: '<script>alert(1)</script>' })
    expect(screen.getByRole('alert')).toHaveTextContent('Sign-in failed')
    expect(screen.getByRole('alert')).not.toHaveTextContent('script')
  })

  it('carries a safe returnTo in a hidden field', async () => {
    const { container } = await renderForm({ returnTo: '/reports' })
    const hidden = container.querySelector('input[name="returnTo"]')
    expect(hidden).toHaveAttribute('value', '/reports')
  })

  it('drops an off-site returnTo', async () => {
    const { container } = await renderForm({ returnTo: '//evil.example' })
    expect(container.querySelector('input[name="returnTo"]')).toBeNull()
  })
})
