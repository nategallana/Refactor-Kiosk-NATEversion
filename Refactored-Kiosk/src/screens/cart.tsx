import { useNavigate } from 'react-router-dom'
import { ArrowLeft } from '../components/icons'
import { Brand } from '../components/brand'
import { calculateTotals, formatMoney, lineTotal } from '../domain/order'
import { useKioskStore } from '../store/kiosk-store'

export function CartScreen() {
  const navigate = useNavigate()
  const items = useKioskStore((state) => state.items)
  const updateQuantity = useKioskStore((state) => state.updateQuantity)
  const removeItem = useKioskStore((state) => state.removeItem)
  const totals = calculateTotals(items)
  return <main className="review screen-enter">
    <header className="simple-header"><button className="icon-button" onClick={() => navigate('/menu')} aria-label="Back to menu"><ArrowLeft /></button><Brand compact /><span className="header-spacer" /></header>
    <section className="review-layout"><div className="review-items"><p className="eyebrow">ALMOST THERE</p><h1>Review your order</h1>{items.length === 0 ? <div className="state-card"><strong>Your order is empty.</strong><button className="text-link" onClick={() => navigate('/menu')}>Explore the menu →</button></div> : items.map((item) => <article className="cart-line" key={item.id}><div className="cart-line__art">{item.name.includes('Chicken') ? '🍗' : item.name.includes('Burger') ? '🍔' : '🍽️'}</div><div className="cart-line__copy"><strong>{item.name}</strong><span>{item.selections.map((selection) => selection.valueName).join(' · ')}</span>{item.note && <small>Note: {item.note}</small>}<button onClick={() => removeItem(item.id)}>Remove</button></div><div className="quantity quantity--small"><button onClick={() => updateQuantity(item.id, item.quantity - 1)}>−</button><strong>{item.quantity}</strong><button onClick={() => updateQuantity(item.id, item.quantity + 1)}>+</button></div><b>{formatMoney(lineTotal(item))}</b></article>)}</div>
      <aside className="summary"><p className="eyebrow">ORDER SUMMARY</p><div><span>Subtotal</span><strong>{formatMoney(totals.subtotal)}</strong></div><div><span>VAT (12%)</span><strong>{formatMoney(totals.tax)}</strong></div><div className="summary__total"><span>Total</span><strong>{formatMoney(totals.total)}</strong></div><button className="primary-button" disabled={!items.length} onClick={() => navigate('/payment')}>Continue to payment <span>→</span></button><button className="secondary-button" onClick={() => navigate('/menu')}>+ Add more items</button></aside>
    </section>
  </main>
}
