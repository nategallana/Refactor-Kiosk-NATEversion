import { render, screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { MemoryRouter, Route, Routes } from 'react-router-dom'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { defaultSettings, useKioskStore } from '../store/kiosk-store'
import { PaymentScreen } from './payment'

const cartItem = {
  id: 'cart-1',
  productId: 'p2',
  sku: 'BRG-001',
  name: 'Client name',
  unitPrice: 21900,
  quantity: 1,
  selections: [{
    groupId: 'size', groupName: 'Size', valueId: 'regular', valueName: 'Regular', priceDelta: 0,
  }],
  note: '',
}

function renderPayment() {
  return render(
    <MemoryRouter initialEntries={['/payment']}>
      <Routes>
        <Route path={'/payment'} element={<PaymentScreen />} />
        <Route path={'/ticket'} element={<div>Ticket reached</div>} />
      </Routes>
    </MemoryRouter>,
  )
}

async function confirmCardOrder() {
  await userEvent.click(screen.getByRole('button', { name: /card at kiosk/i }))
  await userEvent.click(screen.getByRole('button', { name: /place order/i }))
  await userEvent.click(screen.getByRole('button', { name: /yes, place order/i }))
}

describe('payment checkout contract', () => {
  beforeEach(() => {
    useKioskStore.setState({
      diningType: 'dine-in',
      items: [cartItem],
      receipt: null,
      checkoutAttempt: null,
      settings: defaultSettings,
    })
  })

  afterEach(() => vi.unstubAllGlobals())

  it('uses the server-generated order number, canonical items, and totals', async () => {
    const fetchMock = vi.fn().mockResolvedValue({
      ok: true,
      json: async () => ({
        order: {
          id: 42,
          order_number: 'K260826-000042',
          subtotal_minor: 21900,
          tax_minor: 2628,
          total_minor: 24528,
          items: [{
            productId: 3,
            sku: 'BRG-001',
            name: 'The House Burger',
            quantity: 1,
            unitPrice: 21900,
            selections: [{
              groupId: 'size', groupName: 'Size', valueId: 'regular', valueName: 'Regular', priceDelta: 0,
            }],
            note: '',
          }],
        },
      }),
    })
    vi.stubGlobal('fetch', fetchMock)

    renderPayment()
    await confirmCardOrder()

    expect(await screen.findByText('Ticket reached')).toBeInTheDocument()
    expect(useKioskStore.getState().receipt).toMatchObject({
      orderNumber: 'K260826-000042',
      subtotal: 21900,
      tax: 2628,
      total: 24528,
      items: [{ name: 'The House Burger', unitPrice: 21900 }],
    })

    expect(fetchMock).toHaveBeenCalledOnce()
    const requestInit = fetchMock.mock.calls.at(0)?.[1] as RequestInit | undefined
    const requestBody = JSON.parse(String(requestInit?.body))
    expect(requestInit?.headers).toMatchObject({ 'Idempotency-Key': expect.stringMatching(/^[0-9a-f-]{36}$/i) })
    expect(requestBody).not.toHaveProperty('order_number')
    expect(requestBody).not.toHaveProperty('total_minor')
    expect(requestBody.items[0]).toEqual({
      sku: 'BRG-001',
      quantity: 1,
      note: '',
      selections: [{ groupId: 'size', valueId: 'regular' }],
    })
  })

  it('shows an error and does not issue a receipt when order creation fails', async () => {
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue({
      ok: false,
      json: async () => ({ message: 'Invalid order.' }),
    }))

    renderPayment()
    await confirmCardOrder()

    expect(await screen.findByText(/payment could not be completed/i)).toBeInTheDocument()
    await waitFor(() => expect(useKioskStore.getState().receipt).toBeNull())
    expect(screen.queryByText('Ticket reached')).not.toBeInTheDocument()
  })

  it('reuses the same idempotency key after a lost response', async () => {
    const fetchMock = vi.fn()
      .mockRejectedValueOnce(new TypeError('Connection lost after submission.'))
      .mockResolvedValueOnce({
        ok: true,
        json: async () => ({
          order: {
            id: 42,
            order_number: 'K260826-000042',
            subtotal_minor: 21900,
            tax_minor: 2628,
            total_minor: 24528,
            items: [{
              productId: 3,
              sku: 'BRG-001',
              name: 'The House Burger',
              quantity: 1,
              unitPrice: 21900,
              selections: [{
                groupId: 'size', groupName: 'Size', valueId: 'regular', valueName: 'Regular', priceDelta: 0,
              }],
              note: '',
            }],
          },
        }),
      })
    vi.stubGlobal('fetch', fetchMock)

    renderPayment()
    await confirmCardOrder()
    expect(await screen.findByText(/payment could not be completed/i)).toBeInTheDocument()

    await confirmCardOrder()
    expect(await screen.findByText('Ticket reached')).toBeInTheDocument()

    const firstRequest = fetchMock.mock.calls.at(0)?.[1] as RequestInit | undefined
    const retryRequest = fetchMock.mock.calls.at(1)?.[1] as RequestInit | undefined
    const firstKey = (firstRequest?.headers as Record<string, string> | undefined)?.['Idempotency-Key']
    const retryKey = (retryRequest?.headers as Record<string, string> | undefined)?.['Idempotency-Key']
    expect(firstKey).toMatch(/^[0-9a-f-]{36}$/i)
    expect(retryKey).toBe(firstKey)
  })
})
