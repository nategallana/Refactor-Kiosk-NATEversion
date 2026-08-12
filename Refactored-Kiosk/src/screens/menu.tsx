import { useEffect, useMemo, useState } from 'react'
import { useNavigate, useSearchParams } from 'react-router-dom'
import type { Catalog, Product } from '../domain/catalog'
import { catalogRepository } from '../data/catalog'
import { formatMoney } from '../domain/order'
import { MenuShell } from '../components/shell'

const categoryIcons: Record<string, string> = {
  featured: '☰',
  burgers: '🍔',
  combos: '🍱',
  meals: '🍽️',
  sides: '🍟',
  drinks: '🥤',
  desserts: '🍦',
}

function ProductArtwork({ product }: { product: Product }) {
  return product.imageUrl
    ? <img src={product.imageUrl} alt="" />
    : <span>{product.emoji}</span>
}

function ProductCard({ product }: { product: Product }) {
  const navigate = useNavigate()
  const openProduct = () => navigate('/products/' + product.id)
  const className = 'product-card' + (product.available ? '' : ' product-card--unavailable')

  return <article className={className}>
    <button className="product-card__main" disabled={!product.available} onClick={openProduct}>
      <span className="product-card__image" style={{ background: product.accent }}>
        <ProductArtwork product={product} />
        {!product.available && <b>Unavailable</b>}
      </span>
      <span className="product-card__name">{product.name}</span>
      <strong className="product-card__price">{formatMoney(product.basePrice)}</strong>
    </button>
    <button className="product-card__add" disabled={!product.available} onClick={openProduct}>+ Add</button>
  </article>
}

export function MenuScreen() {
  const [catalog, setCatalog] = useState<Catalog | null>(null)
  const [error, setError] = useState(false)
  const [params, setParams] = useSearchParams()
  const category = params.get('category') ?? 'featured'

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
  const heading = category === 'featured'
    ? 'All Items'
    : categories.find((item) => item.id === category)?.name ?? 'All Items'

  return <MenuShell><main className="portrait-menu screen-enter">
    <nav className="menu-categories" aria-label="Menu categories">
      {categories.map((item) => <button
        key={item.id}
        className={category === item.id ? 'active' : ''}
        onClick={() => setParams({ category: item.id })}
      >
        <span aria-hidden="true">{categoryIcons[item.id] ?? '•'}</span>
        <small>{item.name}</small>
      </button>)}
    </nav>

    <section className="portrait-menu__content">
      <h1>{heading}</h1>
      {!catalog && !error && <div className="state-card">Preparing today&rsquo;s menu&hellip;</div>}
      {error && <div className="state-card"><strong>We couldn&rsquo;t load the menu.</strong><span>Please ask a team member for help.</span></div>}
      {catalog && products.length === 0 && <div className="state-card"><strong>No items in this category.</strong><span>Please choose another category.</span></div>}
      <div className="product-grid">{products.map((product) => <ProductCard key={product.id} product={product} />)}</div>
    </section>
  </main></MenuShell>
}
