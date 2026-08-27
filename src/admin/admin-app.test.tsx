import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { AdminApp } from './admin-app'
import { useAdminStore } from './admin-store'

describe('admin application', () => {
  beforeEach(() => { useAdminStore.getState().signOut(); window.history.pushState({}, '', '/admin/login') })
  it('renders the protected admin login and toggles password visibility', async () => {
    render(<AdminApp />)
    expect(screen.getByRole('heading', { name: 'Welcome back' })).toBeInTheDocument()
    expect(screen.getByRole('button', { name: /sign in/i })).toBeInTheDocument()
    const password = screen.getByLabelText('Password')
    expect(password).toHaveAttribute('type', 'password')
    await userEvent.click(screen.getByRole('button', { name: 'Show password' }))
    expect(password).toHaveAttribute('type', 'text')
    expect(screen.getByRole('button', { name: 'Hide password' })).toBeInTheDocument()
  })
})
