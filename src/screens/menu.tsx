import { useEffect, useMemo, useState } from 'react'
import { useNavigate, useSearchParams } from 'react-router-dom'
import type { Catalog, Product } from '../domain/catalog'
import { catalogRepository } from '../data/catalog'
import { formatMoney } from '../domain/order'
import { formatPhTime } from '../domain/datetime'
import { MenuShell } from '../components/shell'
import { AdBanner } from '../components/ad-banner'
import { useKioskStore } from '../store/kiosk-store'

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
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(true)
  const [searchQuery, setSearchQuery] = useState('')
  const [params, setParams] = useSearchParams()
  const category = params.get('category') ?? 'all'
  const diningType = useKioskStore((state) => state.diningType)
  const [phTime, setPhTime] = useState(() => formatPhTime(new Date()))

  useEffect(() => {
    const updateTime = () => setPhTime(formatPhTime(new Date()))
    const clockTimer = setInterval(updateTime, 1000)
    window.addEventListener('kiosk:timezone-changed', updateTime)
    window.addEventListener('kiosk:timeformat-changed', updateTime)
    return () => {
      clearInterval(clockTimer)
      window.removeEventListener('kiosk:timezone-changed', updateTime)
      window.removeEventListener('kiosk:timeformat-changed', updateTime)
    }
  }, [])

  const loadCatalog = () => {
    setError('')
    setLoading(true)
    const controller = new AbortController()
    catalogRepository
      .getCatalog(controller.signal)
      .then((data) => {
        setCatalog(data)
        setLoading(false)
      })
      .catch((reason) => {
        if (reason?.name !== 'AbortError') {
          setError(reason instanceof Error ? reason.message : 'We could not load the menu. Please try again.')
          setLoading(false)
        }
      })
    return () => controller.abort()
  }

  useEffect(() => {
    return loadCatalog()
  }, [])

  const categories = useMemo(
    () => catalog?.categories.filter((item) => item.active).sort((a, b) => a.displayOrder - b.displayOrder) ?? [],
    [catalog],
  )

  const products = useMemo(() => {
    if (!catalog) return []
    const query = searchQuery.trim().toLowerCase()
    return catalog.products.filter((product) => {
      if (!product.active) return false
      const matchesCategory = category === 'all' || product.categoryId === category
      const matchesSearch =
        !query ||
        product.name.toLowerCase().includes(query) ||
        product.sku.toLowerCase().includes(query) ||
        product.description.toLowerCase().includes(query)
      return matchesCategory && matchesSearch
    })
  }, [catalog, category, searchQuery])

  const activeCategory = categories.find((item) => item.id === category)
  const heading = category === 'all' ? 'All Items' : (activeCategory?.name ?? 'Menu')

  return (
    <MenuShell>
      <main className="kiosk-menu-page screen-enter">
        {/* Top Ad Promotional Banner */}
        <AdBanner />

        {/* Category Header Bar, Centered Search Filter & Live Philippines Clock */}
        <div className="kiosk-header-bar" style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '0.75rem', padding: '0.75rem clamp(1rem, 2.5vw, 1.8rem)' }}>
          {/* Left: Category Title */}
          <div className="kiosk-header-bar__title" style={{ flex: '1 1 0', minWidth: '140px' }}>
            <h2 style={{ whiteSpace: 'nowrap', textOverflow: 'ellipsis', overflow: 'hidden' }}>{heading}</h2>
          </div>

          {/* Center: Perfectly Centered Search Bar */}
          <div style={{ flex: '0 1 420px', display: 'flex', justifyContent: 'center' }}>
            <div className="kiosk-header-bar__search">
              <svg
                viewBox="0 0 24 24"
                width="18"
                height="18"
                fill="none"
                stroke="#ea580c"
                strokeWidth="2.5"
                strokeLinecap="round"
                strokeLinejoin="round"
                aria-hidden="true"
                style={{ marginRight: '0.5rem', flexShrink: 0 }}
              >
                <circle cx="11" cy="11" r="7" />
                <line x1="21" y1="21" x2="16.65" y2="16.65" />
              </svg>
              <input
                type="text"
                placeholder="Search menu items..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                aria-label="Search menu items"
              />
              {searchQuery && (
                <button
                  type="button"
                  onClick={() => setSearchQuery('')}
                  style={{
                    border: 'none',
                    background: '#f1f5f9',
                    borderRadius: '50%',
                    width: '24px',
                    height: '24px',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    cursor: 'pointer',
                    color: '#64748b',
                    fontWeight: 'bold',
                    fontSize: '0.75rem',
                    padding: 0,
                    marginLeft: '0.35rem',
                    flexShrink: 0,
                  }}
                  aria-label="Clear search"
                >
                  ✕
                </button>
              )}
            </div>
          </div>

          {/* Right: Clock & Dining Badge */}
          <div style={{ flex: '1 1 0', display: 'flex', alignItems: 'center', justifyContent: 'flex-end', gap: '0.5rem' }}>
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
                whiteSpace: 'nowrap',
              }}
            >
              <span aria-hidden="true">🕒</span>
              <span>{phTime}</span>
            </div>
            <div className="kiosk-header-bar__badge">
              <span>{diningType === 'takeout' ? 'Takeout' : 'Dine-In'}</span>
            </div>
          </div>
        </div>

        {/* Main Body: Left Vertical Sidebar + Right 3-Column Product Grid */}
        <div className="kiosk-menu-body">
          <aside className="kiosk-sidebar" aria-label="Menu categories">
            <div className="kiosk-sidebar__nav">
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
              {categories.map((item) => {
                const isActive = category === item.id
                const meta = categoryIconsByName[item.name]
                return (
                  <button
                    key={item.id}
                    className={`kiosk-sidebar__tab ${isActive ? 'active' : ''}`}
                    onClick={() => setParams({ category: item.id })}
                  >
                    <div className="kiosk-sidebar__thumb">
                      {meta?.img ? (
                        <img src={meta.img} alt="" onError={(e) => { (e.target as HTMLImageElement).style.display = 'none' }} />
                      ) : (
                        <span>{meta?.emoji || '🍽️'}</span>
                      )}
                    </div>
                    <span className="kiosk-sidebar__label">{item.name}</span>
                  </button>
                )
              })}
            </div>
          </aside>

          <section className="kiosk-products-container">
            {loading && !catalog && !error && (
              <div className="state-card">
                <p>Preparing today&rsquo;s menu&hellip;</p>
              </div>
            )}
            {error && (
              <div className="state-card" style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem', alignItems: 'center' }}>
                <strong>{error}</strong>
                <span>Please check your network connection or ask a team member for help.</span>
                <button
                  type="button"
                  className="primary-button"
                  style={{ marginTop: '0.5rem', minHeight: '44px' }}
                  onClick={loadCatalog}
                >
                  Retry loading menu
                </button>
              </div>
            )}
            {!loading && catalog && products.length === 0 && (
              <div className="state-card">
                <strong>No items found in this section.</strong>
                <span>Try choosing another category or clearing your search filter.</span>
              </div>
            )}
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
