import { useNavigate } from 'react-router-dom'
import { ArrowLeft } from '../components/icons'
import { Brand } from '../components/brand'
import { calculateTotals, formatMoney, lineTotal } from '../domain/order'
import { useKioskStore } from '../store/kiosk-store'

const productImages: Record<string, string> = {
  'CMB-001': '/menu/burger-bundle.png',
  'MEAL-001': '/menu/chicken-rice.png',
  'BRG-001': '/menu/cheeseburger.png',
  'MEAL-002': '/menu/chicken-rice.png',
  'PASTA-001': '/menu/chicken-spaghetti.png',
  'SIDE-001': '/menu/fries.png',
  'DRK-001': '/menu/drink.png',
  'DSR-001': '/menu/dessert.png',
  'BRG-002': '/menu/big-burger.png',
  'BRG-003': '/menu/double-burger.png',
  'PASTA-002': '/menu/spaghetti.png',
  'SND-001': '/menu/chicken-sandwich.png',
  'BRG-004': '/menu/bacon-burger.png',
}

export function CartScreen() {
  const navigate = useNavigate()
  const items = useKioskStore((state) => state.items)
  const updateQuantity = useKioskStore((state) => state.updateQuantity)
  const removeItem = useKioskStore((state) => state.removeItem)
  const totals = calculateTotals(items)

  return (
    <main className="review screen-enter">
      <header className="simple-header">
        <button className="icon-button" onClick={() => navigate('/menu')} aria-label="Back to menu">
          <ArrowLeft />
        </button>
        <Brand compact />
        <span className="header-spacer" />
      </header>

      <section className="review-body">
        <div className="review-heading">
          <p className="eyebrow">ALMOST THERE</p>
          <h1>Review your order</h1>
        </div>

        {items.length === 0 ? (
          <div className="state-card">
            <strong>Your order is empty.</strong>
            <button className="text-link" onClick={() => navigate('/menu')}>
              Explore the menu &rarr;
            </button>
          </div>
        ) : (
          <div className="review-items-list">
            {items.map((item) => {
              const imageSrc = productImages[item.sku]
              return (
                <article className="cart-line" key={item.id}>
                  <div className="cart-line__art">
                    {imageSrc ? (
                      <img src={imageSrc} alt={item.name} />
                    ) : (
                      <span>{item.name.includes('Chicken') ? '🍗' : item.name.includes('Burger') ? '🍔' : '🍽️'}</span>
                    )}
                  </div>
                  <div className="cart-line__copy">
                    <strong>{item.name}</strong>
                    <span>{item.selections.map((selection) => selection.valueName).join(' · ')}</span>
                    {item.note && <small>Note: {item.note}</small>}
                    <button onClick={() => removeItem(item.id)}>Remove</button>
                  </div>
                  <div className="quantity quantity--small">
                    <button onClick={() => updateQuantity(item.id, item.quantity - 1)}>−</button>
                    <strong>{item.quantity}</strong>
                    <button onClick={() => updateQuantity(item.id, item.quantity + 1)}>+</button>
                  </div>
                  <b>{formatMoney(lineTotal(item))}</b>
                </article>
              )
            })}
          </div>
        )}
      </section>

      {items.length > 0 && (
        <footer className="review-dock">
          <div className="review-dock__inner">
            <div className="review-dock__pricing">
              <div className="review-dock__breakdown">
                <div><span>Subtotal</span><b>{formatMoney(totals.subtotal)}</b></div>
                <div><span>VAT (12%)</span><b>{formatMoney(totals.tax)}</b></div>
              </div>
              <div className="review-dock__total">
                <small>Total</small>
                <strong>{formatMoney(totals.total)}</strong>
              </div>
            </div>

            <div className="review-dock__actions">
              <button className="secondary-button review-dock__add-btn" onClick={() => navigate('/menu')}>
                + Add more items
              </button>
              <button
                className="primary-button review-dock__pay-btn"
                disabled={!items.length}
                onClick={() => navigate('/payment')}
              >
                Continue to payment <span>&rarr;</span>
              </button>
            </div>
          </div>
        </footer>
      )}
    </main>
  )
}
