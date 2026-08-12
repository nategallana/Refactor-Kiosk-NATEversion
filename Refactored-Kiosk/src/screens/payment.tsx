import { useRef, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { ArrowLeft, Card, Store } from '../components/icons'
import { Brand } from '../components/brand'
import { calculateTotals, type PaymentMethod, type OrderReceipt } from '../domain/order'
import { useKioskStore } from '../store/kiosk-store'

export function PaymentScreen() {
  const navigate = useNavigate()
  const diningType = useKioskStore((state) => state.diningType)
  const items = useKioskStore((state) => state.items)
  const setReceipt = useKioskStore((state) => state.setReceipt)
  const [method, setMethod] = useState<PaymentMethod | null>(null)
  const [status, setStatus] = useState<'idle' | 'processing' | 'failed'>('idle')
  const submitting = useRef(false)
  const checkout = async () => {
    if (!method || !diningType || !items.length || submitting.current) return
    submitting.current = true; setStatus('processing')
    await new Promise((resolve) => window.setTimeout(resolve, 700))
    const totals = calculateTotals(items)
    const receipt: OrderReceipt = { id: crypto.randomUUID(), orderNumber: String(Math.floor(1000 + Math.random() * 9000)), createdAt: new Date().toISOString(), diningType, paymentMethod: method, items, ...totals }
    setReceipt(receipt); navigate('/ticket', { replace: true })
  }
  return <main className="payment screen-enter"><header className="simple-header"><button className="icon-button" onClick={() => navigate('/cart')} aria-label="Back"><ArrowLeft /></button><Brand compact /><span className="header-spacer" /></header><section className="payment-content"><p className="eyebrow">PAYMENT</p><h1>How would you like<br /><em>to pay?</em></h1><div className="payment-options"><button className={method === 'card' ? 'payment-card active' : 'payment-card'} onClick={() => setMethod('card')}><span><Card /></span><strong>Card at kiosk</strong><small>Credit or debit card</small></button><button className={method === 'counter' ? 'payment-card active' : 'payment-card'} onClick={() => setMethod('counter')}><span><Store /></span><strong>Pay at counter</strong><small>Cash, card, or e-wallet</small></button></div>{status === 'failed' && <p className="error-message">Payment could not be completed. Please try again.</p>}<button className="primary-button primary-button--wide" disabled={!method || status === 'processing'} onClick={checkout}>{status === 'processing' ? 'Creating your order…' : 'Place order'} <span>→</span></button><p className="secure-note">Your order is submitted only once, even if the button is tapped again.</p></section></main>
}
