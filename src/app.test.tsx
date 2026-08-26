import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { App } from './app'
import { useKioskStore } from './store/kiosk-store'
import { useTerminalStore } from './store/terminal-store'

describe('customer journey foundation', () => {
  beforeEach(() => {
    useKioskStore.getState().reset()
    useTerminalStore.setState({ registered: true, terminalId: 'TEST', apiToken: 'token', status: 'online' })
  })

  it('moves from welcome to dining choice without browser navigation', async () => {
    window.history.pushState({}, '', '/')
    render(<App />)
    await userEvent.click(screen.getByRole('button', { name: /start your order/i }))
    expect(screen.getByRole('heading', { name: /welcome! let.s get started/i })).toBeInTheDocument()
    expect(screen.getByRole('button', { name: /dine in/i })).toBeInTheDocument()
    expect(screen.getByRole('button', { name: /take away/i })).toBeInTheDocument()
  })

  it('builds a combo in two steps and adds it to the order', async () => {
    window.history.pushState({}, '', '/products/combo-burger')
    render(<App />)

    expect(await screen.findByRole('heading', { name: 'Burger Menu Combo' })).toBeInTheDocument()
    expect(screen.getByRole('list', { name: /step 1 of 2/i })).toBeInTheDocument()
    await userEvent.click(screen.getByRole('button', { name: /zinger burger with cheese/i }))

    expect(screen.getByRole('heading', { name: /choose your side choice/i })).toBeInTheDocument()
    await userEvent.click(screen.getByRole('button', { name: /golden fries/i }))

    expect(await screen.findByRole('heading', { name: 'All Items' })).toBeInTheDocument()
    expect(useKioskStore.getState().items).toHaveLength(1)
  })
})
