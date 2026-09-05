import { render, screen, act, fireEvent } from '@testing-library/react'
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { MemoryRouter } from 'react-router-dom'
import { IdleGuard } from './idle-guard'
import { useKioskStore } from '../store/kiosk-store'

describe('IdleGuard Inactivity Warning Modal', () => {
  beforeEach(() => {
    vi.useFakeTimers()
    useKioskStore.setState({
      settings: {
        brand_name: 'Test Kiosk',
        service_mode: 'both',
        counter_payment_enabled: true,
        card_payment_enabled: true,
        idle_timeout_seconds: 60,
        auto_reset_seconds: 10,
        receipt_header: null,
        receipt_footer: null,
        tax_rate_basis_points: 1200,
        welcome_background_url: null,
      },
    })
  })

  afterEach(() => {
    vi.clearAllTimers()
    vi.useRealTimers()
  })

  it('displays inactivity warning modal after idle period', () => {
    render(
      <MemoryRouter initialEntries={['/menu']}>
        <IdleGuard />
      </MemoryRouter>
    )

    expect(screen.queryByText('Are you still ordering?')).not.toBeInTheDocument()

    act(() => {
      vi.advanceTimersByTime(40000)
    })

    expect(screen.getByText('Are you still ordering?')).toBeInTheDocument()
    expect(screen.getByRole('button', { name: /continue ordering/i })).toBeInTheDocument()
  })

  it('keeps order and closes modal when continue ordering button is clicked', () => {
    render(
      <MemoryRouter initialEntries={['/menu']}>
        <IdleGuard />
      </MemoryRouter>
    )

    act(() => {
      vi.advanceTimersByTime(40000)
    })

    expect(screen.getByText('Are you still ordering?')).toBeInTheDocument()

    const continueBtn = screen.getByRole('button', { name: /continue ordering/i })
    act(() => {
      fireEvent.click(continueBtn)
    })

    expect(screen.queryByText('Are you still ordering?')).not.toBeInTheDocument()
  })
})

