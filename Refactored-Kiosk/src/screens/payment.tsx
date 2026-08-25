import { useRef, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { ArrowLeft, Card, Store } from '../components/icons'
import { Brand } from '../components/brand'
import { calculateTotals, formatMoney, type PaymentMethod, type OrderReceipt } from '../domain/order'
import { useKioskStore } from '../store/kiosk-store'

export function PaymentScreen() {
  const navigate = useNavigate()
  const diningType = useKioskStore((state) => state.diningType)
  const items = useKioskStore((state) => state.items)
  const setReceipt = useKioskStore((state) => state.setReceipt)
  const [method, setMethod] = useState<PaymentMethod | null>(null)
  const [status, setStatus] = useState<'idle' | 'processing' | 'failed'>('idle')
  const [showConfirmModal, setShowConfirmModal] = useState(false)
  const submitting = useRef(false)

  const totals = calculateTotals(items)

  const handlePlaceOrderClick = () => {
    if (!method || !diningType || !items.length) return
    setShowConfirmModal(true)
  }

  const checkout = async () => {
    if (!method || !diningType || !items.length || submitting.current) return
    submitting.current = true
    setStatus('processing')
    setShowConfirmModal(false)

    const orderNumber = String(Math.floor(1000 + Math.random() * 9000))
    const apiBase = import.meta.env.VITE_API_BASE_URL || `${window.location.protocol}//${window.location.hostname}:8000/api/v1`

    try {
      await fetch(`${apiBase}/orders`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Accept: 'application/json' },
        body: JSON.stringify({
          order_number: orderNumber,
          terminal_id: 'KIOSK-01',
          dining_type: diningType,
          payment_method: method,
          subtotal_minor: totals.subtotal,
          tax_minor: totals.tax,
          total_minor: totals.total,
          items: items.map((i) => ({
            sku: i.sku,
            name: i.name,
            quantity: i.quantity,
            unitPrice: i.unitPrice,
            note: i.note,
            selections: i.selections,
          })),
        }),
      })
    } catch {
      // Offline fallback
    }

    const receipt: OrderReceipt = {
      id: crypto.randomUUID(),
      orderNumber,
      createdAt: new Date().toISOString(),
      diningType,
      paymentMethod: method,
      items,
      ...totals,
    }
    setReceipt(receipt)
    navigate('/ticket', { replace: true })
  }

  return (
    <main className="payment screen-enter">
      <header className="simple-header">
        <button className="icon-button" onClick={() => navigate('/cart')} aria-label="Back">
          <ArrowLeft />
        </button>
        <Brand compact />
        <span className="header-spacer" />
      </header>

      <section className="payment-content">
        <p className="eyebrow">PAYMENT</p>
        <h1>How would you like<br /><em>to pay?</em></h1>

        <div className="payment-options">
          <button
            className={method === 'card' ? 'payment-card active' : 'payment-card'}
            onClick={() => setMethod('card')}
          >
            <span><Card /></span>
            <strong>Card at kiosk</strong>
            <small>Credit or debit card</small>
          </button>
          <button
            className={method === 'counter' ? 'payment-card active' : 'payment-card'}
            onClick={() => setMethod('counter')}
          >
            <span><Store /></span>
            <strong>Pay at counter</strong>
            <small>Cash, card, or e-wallet</small>
          </button>
        </div>

        <div className="payment-summary-bar">
          <span>Total to Pay ({items.reduce((sum, item) => sum + item.quantity, 0)} items)</span>
          <strong>{formatMoney(totals.total)}</strong>
        </div>

        {status === 'failed' && (
          <p className="error-message">Payment could not be completed. Please try again.</p>
        )}

        <button
          className="primary-button primary-button--wide"
          disabled={!method || status === 'processing'}
          onClick={handlePlaceOrderClick}
        >
          {status === 'processing' ? 'Creating your order…' : 'Place order'} <span>&rarr;</span>
        </button>

        <p className="secure-note">
          Your order is submitted only once, even if the button is tapped again.
        </p>
      </section>

      {showConfirmModal && (
        <div className="modal-backdrop" onClick={() => setShowConfirmModal(false)}>
          <div className="idle-modal confirm-order-modal" onClick={(e) => e.stopPropagation()}>
            <p className="eyebrow" style={{ color: '#c2410c', fontWeight: 800 }}>ORDER CONFIRMATION</p>
            <h2 style={{ fontFamily: 'Georgia, serif', margin: '0.4rem 0 1rem', color: '#261817' }}>
              Confirm your order?
            </h2>
            <div
              style={{
                background: '#fff7ed',
                border: '1px solid #fed7aa',
                borderRadius: '1rem',
                padding: '1.2rem',
                margin: '1.2rem 0',
                textAlign: 'left',
                display: 'flex',
                flexDirection: 'column',
                gap: '0.5rem',
              }}
            >
              <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                <span style={{ color: '#78716c' }}>Dining Mode:</span>
                <strong style={{ color: '#261817' }}>{diningType === 'takeout' ? 'Takeout' : 'Dine-In'}</strong>
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                <span style={{ color: '#78716c' }}>Payment:</span>
                <strong style={{ color: '#261817' }}>{method === 'card' ? 'Card at kiosk' : 'Pay at counter'}</strong>
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                <span style={{ color: '#78716c' }}>Total Items:</span>
                <strong style={{ color: '#261817' }}>{items.reduce((sum, i) => sum + i.quantity, 0)} items</strong>
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between', borderTop: '1px solid #fed7aa', paddingTop: '0.5rem', marginTop: '0.3rem' }}>
                <span style={{ color: '#261817', fontWeight: 700 }}>Total Amount:</span>
                <strong style={{ color: '#ea580c', fontSize: '1.2rem', fontFamily: 'Georgia, serif' }}>{formatMoney(totals.total)}</strong>
              </div>
            </div>
            <button className="primary-button" style={{ width: '100%' }} onClick={checkout}>
              Yes, Place Order &rarr;
            </button>
            <button
              className="secondary-button"
              style={{ width: '100%', marginTop: '0.6rem' }}
              onClick={() => setShowConfirmModal(false)}
            >
              No, Review Order
            </button>
          </div>
        </div>
      )}
    </main>
  )
}
