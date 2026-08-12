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
      <button className="order-dock__cancel" onClick={cancel}>Cancel</button>
      <div className="order-dock__summary">
        <small>Your order</small>
        <span><strong>{count}</strong> item{count === 1 ? '' : 's'} &middot; {formatMoney(cartSubtotal(items))}</span>
      </div>
      <button className="order-dock__button" disabled={!items.length} onClick={() => navigate('/cart')}>Order</button>
    </footer>
  </div>
}
