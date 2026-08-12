import type { ReactNode } from 'react'
import { useNavigate } from 'react-router-dom'
import { Bag } from './icons'
import { Brand } from './brand'
import { cartSubtotal } from '../domain/order'
import { useKioskStore } from '../store/kiosk-store'

export function MenuShell({ children }: { children: ReactNode }) {
  const navigate = useNavigate()
  const items = useKioskStore((state) => state.items)
  const count = items.reduce((sum, item) => sum + item.quantity, 0)
  return <div className="app-shell">
    <header className="topbar">
      <button className="brand-button" onClick={() => navigate('/')} aria-label="Return to welcome"><Brand compact /></button>
      <div className="topbar__message"><strong>Take your time.</strong><span>Every meal is made fresh for you.</span></div>
      <button className="cart-pill" onClick={() => navigate('/cart')} aria-label={`View cart with ${count} items`}>
        <Bag /><span className="cart-pill__copy"><small>Your order</small><strong>{count ? `${count} item${count === 1 ? '' : 's'}` : 'Empty'}</strong></span>
        <span className="cart-pill__total">₱{(cartSubtotal(items) / 100).toFixed(2)}</span>
      </button>
    </header>
    {children}
  </div>
}
