import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { App } from './app'

describe('customer journey foundation', () => {
  it('moves from welcome to dining choice without browser navigation', async () => {
    window.history.pushState({}, '', '/')
    render(<App />)
    await userEvent.click(screen.getByRole('button', { name: /start your order/i }))
    expect(screen.getByRole('heading', { name: /where will you/i })).toBeInTheDocument()
    expect(screen.getByRole('button', { name: /dine in/i })).toBeInTheDocument()
  })
})
