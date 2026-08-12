import { render, screen } from '@testing-library/react'
import { AdminApp } from './admin-app'
import { useAdminStore } from './admin-store'

describe('admin application', () => {
  beforeEach(() => { useAdminStore.getState().signOut(); window.history.pushState({}, '', '/admin/login') })
  it('renders the protected admin login', () => {
    render(<AdminApp />)
    expect(screen.getByRole('heading', { name: 'Welcome back' })).toBeInTheDocument()
    expect(screen.getByRole('button', { name: /sign in/i })).toBeInTheDocument()
  })
})
