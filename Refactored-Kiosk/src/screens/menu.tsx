import { useEffect, useMemo, useState } from 'react'
import { useNavigate, useSearchParams } from 'react-router-dom'
import type { Catalog, Product } from '../domain/catalog'
import { catalogRepository } from '../data/catalog'
import { formatMoney } from '../domain/order'
import { MenuShell } from '../components/shell'
import { AdBanner } from '../components/ad-banner'
import { useKioskStore } from '../store/kiosk-store'

const categoryIcons: Record<string, { img?: string; emoji: string }> = {
  featured: { img: '/menu/burger-bundle.png', emoji: '☰' },
  burgers: { img: '/menu/cheeseburger.png', emoji: '🍔' },
  combos: { img: '/menu/burger-bundle.png', emoji: '🍱' },
  meals: { img: '/menu/chicken-rice.png', emoji: '🍗' },
  sides: { img: '/menu/fries.png', emoji: '🍟' },
  drinks: { img: '/menu/drink.png', emoji: '🥤' },
  desserts: { img: '/menu/dessert.png', emoji: '🍦' },
}

function ProductArtwork({ product }: { product: Product }) {
  return product.imageUrl
    ? <img src={product.imageUrl} alt={product.name} />
    : <span>{product.emoji}</span>
}

function ProductCard({ product }: { product: Product }) {
  const navigate = useNavigate()
  const openProduct = () => navigate('/products/' + product.id)
  const className = 'kiosk-card' + (product.available ? '' : ' kiosk-card--unavailable')

  return (
    <button
      type="button"
      className={className}
      disabled={!product.available}
      onClick={openProduct}
      aria-label={`Select ${product.name}, ${formatMoney(product.basePrice)}`}
    >
      <span className="kiosk-card__image" style={{ background: product.accent || '#fff7ed' }}>
        <ProductArtwork product={product} />
        {!product.available && <b className="kiosk-card__badge">Unavailable</b>}
      </span>
      <span className="kiosk-card__code">{product.sku}</span>
      <h3 className="kiosk-card__title">{product.name}</h3>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', width: '100%', marginTop: 'auto', paddingTop: '0.4rem' }}>
        <strong className="kiosk-card__price">{formatMoney(product.basePrice)}</strong>
        <span
          style={{
            background: product.available ? '#ea580c' : '#a8a29e',
            color: '#fff',
            borderRadius: '999px',
            padding: '0.35rem 0.85rem',
            fontSize: '0.82rem',
            fontWeight: 800,
            display: 'inline-flex',
            alignItems: 'center',
            gap: '0.2rem',
          }}
        >
          {product.available ? '+ Order' : 'Sold Out'}
        </span>
      </div>
    </button>
  )
}

export function MenuScreen() {
  const [catalog, setCatalog] = useState<Catalog | null>(null)
  const [error, setError] = useState(false)
  const [params, setParams] = useSearchParams()
  const category = params.get('category') ?? 'featured'
  const diningType = useKioskStore((state) => state.diningType)

  useEffect(() => {
    const controller = new AbortController()
    catalogRepository.getCatalog(controller.signal).then(setCatalog).catch((reason) => {
      if (reason.name !== 'AbortError') setError(true)
    })
    return () => controller.abort()
  }, [])

  const categories = useMemo(
    () => catalog?.categories.filter((item) => item.active).sort((a, b) => a.displayOrder - b.displayOrder) ?? [],
    [catalog],
  )
  const products = useMemo(
    () => catalog?.products.filter((product) => product.active && (category === 'featured' || product.categoryId === category)) ?? [],
    [catalog, category],
  )
  const activeCategory = categories.find((item) => item.id === category)
  const heading = category === 'featured' ? 'All Items' : (activeCategory?.name ?? 'Menu')

  return (
    <MenuShell>
      <main className="kiosk-menu-page screen-enter">
        {/* Top Ad Promotional Banner */}
        <AdBanner />

        {/* Category Header Bar */}
        <div className="kiosk-header-bar">
          <div className="kiosk-header-bar__title">
            <h2>{heading}</h2>
          </div>
          <div className="kiosk-header-bar__badge">
            <span>{diningType === 'takeout' ? '🥡 Takeout' : '🍽️ Dine-In'}</span>
          </div>
        </div>

        {/* Main Body: Left Vertical Sidebar + Right 3-Column Product Grid */}
        <div className="kiosk-menu-body">
          <aside className="kiosk-sidebar" aria-label="Menu categories">
            <div className="kiosk-sidebar__nav">
              {categories.map((item) => {
                const isActive = category === item.id
                const meta = categoryIcons[item.id]
                return (
                  <button
                    key={item.id}
                    className={`kiosk-sidebar__tab ${isActive ? 'active' : ''}`}
                    onClick={() => setParams({ category: item.id })}
                  >
                    <div className="kiosk-sidebar__thumb">
                      {meta?.img ? <img src={meta.img} alt="" /> : <span>{meta?.emoji ?? '•'}</span>}
                    </div>
                    <span className="kiosk-sidebar__label">{item.name}</span>
                  </button>
                )
              })}
            </div>
          </aside>

          <section className="kiosk-products-container">
            {!catalog && !error && <div className="state-card">Preparing today&rsquo;s menu&hellip;</div>}
            {error && <div className="state-card"><strong>We couldn&rsquo;t load the menu.</strong><span>Please ask a team member for help.</span></div>}
            {catalog && products.length === 0 && <div className="state-card"><strong>No items in this category.</strong><span>Please choose another category.</span></div>}
            <div className="kiosk-products-grid">
              {products.map((product) => (
                <ProductCard key={product.id} product={product} />
              ))}
            </div>
          </section>
        </div>
      </main>
    </MenuShell>
  )
}
