import { useEffect, useMemo, useState } from 'react'
import { useNavigate, useSearchParams } from 'react-router-dom'
import type { Catalog, Product } from '../domain/catalog'
import { catalogRepository } from '../data/catalog'
import { formatMoney } from '../domain/order'
import { Search } from '../components/icons'
import { MenuShell } from '../components/shell'

function ProductCard({ product }: { product: Product }) {
  const navigate = useNavigate()
  return <button className="product-card" disabled={!product.available} onClick={() => navigate(`/products/${product.id}`)}>
    <span className="product-card__image" style={{ background: product.accent }}><span>{product.emoji}</span>{!product.available && <b>Temporarily unavailable</b>}</span>
    <span className="product-card__body"><strong>{product.name}</strong><small>{product.description}</small><span>{formatMoney(product.basePrice)}</span></span>
  </button>
}

export function MenuScreen() {
  const [catalog, setCatalog] = useState<Catalog | null>(null)
  const [error, setError] = useState(false)
  const [params, setParams] = useSearchParams()
  const category = params.get('category') ?? 'featured'
  const query = params.get('q') ?? ''
  useEffect(() => {
    const controller = new AbortController()
    catalogRepository.getCatalog(controller.signal).then(setCatalog).catch((reason) => { if (reason.name !== 'AbortError') setError(true) })
    return () => controller.abort()
  }, [])
  const products = useMemo(() => catalog?.products.filter((product) => product.active && (query ? `${product.name} ${product.description}`.toLowerCase().includes(query.toLowerCase()) : product.categoryId === category)) ?? [], [catalog, category, query])
  return <MenuShell><main className="menu-layout screen-enter">
    <aside className="category-rail">
      <p>Explore</p>
      <nav aria-label="Menu categories">{catalog?.categories.filter((item) => item.active).map((item) => <button key={item.id} className={category === item.id && !query ? 'active' : ''} onClick={() => setParams({ category: item.id })}>{item.name}</button>)}</nav>
      <button className="allergen-link">ⓘ Allergens</button>
    </aside>
    <section className="menu-content">
      <div className="menu-heading"><div><p className="eyebrow">OUR MENU</p><h1>{query ? 'Search results' : catalog?.categories.find((item) => item.id === category)?.name ?? 'Featured'}</h1></div><label className="search-box"><Search /><input value={query} onChange={(event) => setParams(event.target.value ? { q: event.target.value } : { category })} placeholder="Search our menu" aria-label="Search menu" /></label></div>
      {!catalog && !error && <div className="state-card">Preparing today’s menu…</div>}
      {error && <div className="state-card"><strong>We couldn’t load the menu.</strong><span>Please ask a team member for help.</span></div>}
      {catalog && products.length === 0 && <div className="state-card"><strong>No matching dishes found.</strong><span>Try another search or category.</span></div>}
      <div className="product-grid">{products.map((product) => <ProductCard key={product.id} product={product} />)}</div>
    </section>
  </main></MenuShell>
}
