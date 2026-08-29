import { useEffect, useMemo, useState } from 'react'
import { useNavigate, useSearchParams } from 'react-router-dom'
import type { Catalog, Product } from '../domain/catalog'
import { catalogRepository } from '../data/catalog'
import { formatMoney } from '../domain/order'
import { formatPhTime } from '../domain/datetime'
import { MenuShell } from '../components/shell'
import { AdBanner } from '../components/ad-banner'
import { useKioskStore } from '../store/kiosk-store'

<<<<<<< Updated upstream
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
=======
const categoryIconsByName: Record<string, { img?: string; emoji: string }> = {
  'Main': { img: '/menu/burger-bundle.png', emoji: '🍱' },
  'Burgers': { img: '/menu/cheeseburger.png', emoji: '🍔' },
  'Combo Meals': { img: '/menu/burger-bundle.png', emoji: '🍱' },
  'Meals': { img: '/menu/chicken-rice.png', emoji: '🍗' },
  'Sides': { img: '/menu/fries.png', emoji: '🍟' },
  'Drinks': { img: '/menu/drink.png', emoji: '🥤' },
  'Desserts': { img: '/menu/dessert.png', emoji: '🍦' },
}

function ProductArtwork({ product }: { product: Product }) {
  const [imgError, setImgError] = useState(false)
  if (product.imageUrl && !imgError) {
    return <img src={product.imageUrl} alt={product.name} onError={() => setImgError(true)} />
  }
  return <span style={{ fontSize: '2.5rem' }}>{product.emoji || '🍔'}</span>
>>>>>>> Stashed changes
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
  const [phTime, setPhTime] = useState(() => formatPhTime(new Date()))

  useEffect(() => {
    const clockTimer = setInterval(() => {
      setPhTime(formatPhTime(new Date()))
    }, 1000)
    return () => clearInterval(clockTimer)
  }, [])

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

<<<<<<< Updated upstream
        {/* Category Header Bar */}
        <div className="kiosk-header-bar">
          <div className="kiosk-header-bar__title">
            <h2>{heading}</h2>
          </div>
          <div className="kiosk-header-bar__badge">
            <span>{diningType === 'takeout' ? '🥡 Takeout' : '🍽️ Dine-In'}</span>
=======
        {/* Category Header Bar, Search Filter & Live Philippines Clock */}
        <div className="kiosk-header-bar" style={{ flexWrap: 'wrap', gap: '0.75rem' }}>
          <div className="kiosk-header-bar__title">
            <h2>{heading}</h2>
          </div>

          {/* Touch-friendly Search Bar */}
          <div style={{ display: 'flex', alignItems: 'center', background: '#fff', border: '1.5px solid #e2e8f0', borderRadius: '999px', padding: '0.35rem 0.85rem', flex: '1 1 200px', maxWidth: '320px' }}>
            <svg
              viewBox="0 0 24 24"
              width="18"
              height="18"
              fill="none"
              stroke="#94a3b8"
              strokeWidth="2.5"
              strokeLinecap="round"
              strokeLinejoin="round"
              aria-hidden="true"
              style={{ marginRight: '0.4rem', flexShrink: 0 }}
            >
              <circle cx="11" cy="11" r="7" />
              <line x1="21" y1="21" x2="16.65" y2="16.65" />
            </svg>
            <input
              type="text"
              placeholder="Search items..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              style={{ border: 'none', outline: 'none', background: 'transparent', width: '100%', fontSize: '0.95rem', fontWeight: 500 }}
              aria-label="Search menu items"
            />
            {searchQuery && (
              <button
                type="button"
                onClick={() => setSearchQuery('')}
                style={{ border: 'none', background: 'transparent', cursor: 'pointer', color: '#94a3b8', fontWeight: 'bold', padding: '0 0.2rem' }}
                aria-label="Clear search"
              >
                ✕
              </button>
            )}
          </div>

          <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
            <div
              className="kiosk-header-bar__clock"
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: '0.35rem',
                background: '#ffffff',
                border: '1.5px solid #fed7aa',
                borderRadius: '999px',
                padding: '0.35rem 0.75rem',
                fontSize: '0.82rem',
                fontWeight: 750,
                color: '#c2410c',
              }}
            >
              <span aria-hidden="true">🕒</span>
              <span>{phTime}</span>
            </div>
            <div className="kiosk-header-bar__badge">
              <span>{diningType === 'takeout' ? 'Takeout' : 'Dine-In'}</span>
            </div>
>>>>>>> Stashed changes
          </div>
        </div>

        {/* Main Body: Left Vertical Sidebar + Right 3-Column Product Grid */}
        <div className="kiosk-menu-body">
          <aside className="kiosk-sidebar" aria-label="Menu categories">
            <div className="kiosk-sidebar__nav">
<<<<<<< Updated upstream
=======
              <button
                className={`kiosk-sidebar__tab ${category === 'all' ? 'active' : ''}`}
                onClick={() => setParams({ category: 'all' })}
              >
                <div className="kiosk-sidebar__thumb">
                  <svg
                    viewBox="0 0 24 24"
                    width="22"
                    height="22"
                    fill="none"
                    stroke="currentColor"
                    strokeWidth="2.2"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    aria-hidden="true"
                  >
                    <rect x="3" y="3" width="7" height="7" rx="1.5" />
                    <rect x="14" y="3" width="7" height="7" rx="1.5" />
                    <rect x="3" y="14" width="7" height="7" rx="1.5" />
                    <rect x="14" y="14" width="7" height="7" rx="1.5" />
                  </svg>
                </div>
                <span className="kiosk-sidebar__label">All Items</span>
              </button>
>>>>>>> Stashed changes
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
<<<<<<< Updated upstream
                      {meta?.img ? <img src={meta.img} alt="" /> : <span>{meta?.emoji ?? '•'}</span>}
=======
                      {meta?.img ? (
                        <img src={meta.img} alt="" onError={(e) => { (e.target as HTMLImageElement).style.display = 'none' }} />
                      ) : (
                        <span>{meta?.emoji || '🍽️'}</span>
                      )}
>>>>>>> Stashed changes
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
