import { useEffect, useState } from 'react'
import { Navigate, useNavigate } from 'react-router-dom'
import { Brand } from '../components/brand'
import { Check } from '../components/icons'
import { formatMoney, lineTotal } from '../domain/order'
import { useKioskStore } from '../store/kiosk-store'

export function TicketScreen() {
  const navigate = useNavigate()
  const receipt = useKioskStore((state) => state.receipt)
  const reset = useKioskStore((state) => state.reset)
  const settings = useKioskStore((state) => state.settings)
  const autoResetSeconds = settings?.auto_reset_seconds || 10
  const [secondsLeft, setSecondsLeft] = useState(autoResetSeconds)

  useEffect(() => {
    if (!receipt) return
    const timer = setInterval(() => {
      setSecondsLeft((prev) => Math.max(0, prev - 1))
    }, 1000)

    return () => clearInterval(timer)
  }, [receipt])

  useEffect(() => {
    if (secondsLeft === 0) {
      reset()
      navigate('/', { replace: true })
    }
  }, [secondsLeft, reset, navigate])

  if (!receipt) return <Navigate to="/" replace />

  const finish = () => {
    reset()
    navigate('/', { replace: true })
  }

  return (
    <main className="ticket-page screen-enter">
      <section className="success-copy">
        <span className="success-icon"><Check /></span>
        <p className="eyebrow">ORDER CONFIRMED</p>
        <h1>Thank you!</h1>
        <p>Your order is in the kitchen.<br />Please take your receipt.</p>
        <div className="ticket-number">
          <span>YOUR ORDER NUMBER</span>
          <strong>{receipt.orderNumber}</strong>
        </div>
        <button className="primary-button primary-button--wide" onClick={finish}>
          Finish ({secondsLeft}s)
        </button>
        <button
          type="button"
          className="secondary-button"
          style={{ marginTop: '0.6rem', width: '100%', minHeight: '44px' }}
          onClick={() => window.print()}
        >
          Print Receipt 🖨️
        </button>
      </section>

      <article className="receipt">
        <Brand compact />
        {settings?.receipt_header && (
          <p style={{ fontWeight: 600, color: '#ea580c', margin: '0.2rem 0' }}>{settings.receipt_header}</p>
        )}
        <p>
          {receipt.diningType === 'dine-in' ? 'DINE IN' : 'TAKE OUT'} · {new Date(receipt.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
        </p>
        <div className="receipt__number">#{receipt.orderNumber}</div>
        <hr />
        {receipt.items.map((item) => (
          <div className="receipt__line" key={item.id}>
            <span>
              {item.quantity} × {item.name}
              <small>{item.selections.map((option) => option.valueName).join(', ')}</small>
            </span>
            <b>{formatMoney(lineTotal(item))}</b>
          </div>
        ))}
        <hr />
        <div className="receipt__line">
          <span>Subtotal</span>
          <b>{formatMoney(receipt.subtotal)}</b>
        </div>
        <div className="receipt__line">
          <span>VAT</span>
          <b>{formatMoney(receipt.tax)}</b>
        </div>
        <div className="receipt__line receipt__total">
          <span>Total</span>
          <b>{formatMoney(receipt.total)}</b>
        </div>
        <p className="receipt__footer">
          Payment: {receipt.paymentMethod === 'counter' ? 'PAY AT COUNTER' : 'CARD'}<br />
          Status: {receipt.paymentStatus ? receipt.paymentStatus.toUpperCase() : 'PENDING'}<br />
          {settings?.receipt_footer || 'Thank you for dining with us.'}
        </p>
      </article>
    </main>
  )
}
