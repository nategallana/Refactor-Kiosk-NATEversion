import type { ReactNode } from 'react'
import { useNavigate } from 'react-router-dom'
import { cartSubtotal, formatMoney } from '../domain/order'
import { useKioskStore } from '../store/kiosk-store'

export function MenuShell({ children }: { children: ReactNode }) {
  const navigate = useNavigate()
  const items = useKioskStore((state) => state.items)
  const reset = useKioskStore((state) => state.reset)
  const count = items.reduce((sum, item) => sum + item.quantity, 0)

  const cancel = () => {
    reset()
    navigate('/')
  }

  return <div className="app-shell menu-shell">
    {children}
    <footer className="order-dock">
      <button className="order-dock__cancel" onClick={cancel} aria-label="Cancel order">Cancel</button>
      <button className="order-dock__pay-btn" disabled={!items.length} onClick={() => navigate('/cart')}>
        <strong>Review &amp; Pay Order</strong>
        {items.length > 0 && <small>{count} {count === 1 ? 'item' : 'items'}</small>}
      </button>
      <div className="order-dock__total-box">
        <small>Order Total</small>
        <strong>{formatMoney(cartSubtotal(items))}</strong>
      </div>
    </footer>
  </div>
}
