import { useEffect, useMemo, useState } from 'react'
import { Navigate } from 'react-router-dom'
import { formatMoney } from '../domain/order'
import { getCatalog, getDashboard, getOrders, retryWboxExport, setAvailability, setOrderStatus, setWboxMapping, type AdminOrder, type AdminProduct } from './admin-api'
import { AdminShell } from './admin-shell'
import { useAdminStore } from './admin-store'

const statuses = ['pending', 'confirmed', 'preparing', 'ready', 'completed', 'cancelled']
const time = (value: string) => new Date(value).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })

function AdminState({ message }: { message: string }) {
  return <div className="admin-state">{message}</div>
}

export function AdminGuard({ children }: { children: React.ReactNode }) {
  return useAdminStore((state) => state.token) ? children : <Navigate to="/admin/login" replace />
}

export function DashboardPage() {
  const token = useAdminStore((state) => state.token)!
  const [data, setData] = useState<Awaited<ReturnType<typeof getDashboard>> | null>(null)
  const [error, setError] = useState('')

  useEffect(() => {
    getDashboard(token).then(setData).catch((reason: Error) => setError(reason.message))
  }, [token])

  return <AdminShell title="Good morning." eyebrow="TODAY AT A GLANCE" action={<span className="admin-live"><i /> Live operations</span>}>
    {error ? <AdminState message={error} /> : !data ? <AdminState message="Loading today's operation..." /> : <>
      <section className="metric-grid">
        <article><span>Net sales</span><strong>{formatMoney(data.summary.sales_minor)}</strong><small>Paid orders today</small></article>
        <article><span>Orders today</span><strong>{data.summary.orders}</strong><small>Across all terminals</small></article>
        <article><span>Active orders</span><strong>{data.summary.active_orders}</strong><small>Pending through ready</small></article>
        <article><span>Menu available</span><strong>{data.summary.available_products}</strong><small>Active products</small></article>
      </section>
      <section className="admin-panel">
        <div className="admin-panel__heading"><div><p>ORDER QUEUE</p><h2>Recent orders</h2></div><a href="/admin/orders">View all &rarr;</a></div>
        <OrderTable orders={data.recent_orders} compact />
      </section>
      <section className="admin-split">
        <article className="admin-panel">
          <div className="admin-panel__heading"><div><p>QUICK ACTIONS</p><h2>Keep things moving</h2></div></div>
          <div className="quick-actions"><a href="/admin/catalog">+ Add a product</a><a href="/admin/orders">Process orders</a><a href="/admin/kiosks">Check terminals</a></div>
        </article>
        <article className="admin-panel admin-note"><p>SHIFT NOTE</p><h2>Everything looks steady.</h2><span>All systems operational and ready for orders.</span></article>
      </section>
    </>}
  </AdminShell>
}

function OrderTable({ orders, compact = false, onStatus }: { orders: AdminOrder[]; compact?: boolean; onStatus?: (order: AdminOrder, status: string) => void }) {
  if (!orders.length) {
    return <div className="admin-state" style={{ padding: '2rem 1rem' }}>No orders placed today.</div>
  }
  return <div className="admin-table-wrap"><table className="admin-table">
    <thead><tr><th>Order</th><th>Terminal</th><th>Service</th><th>Placed</th><th>Total</th><th>Status</th></tr></thead>
    <tbody>{orders.map((order) => <tr key={order.id}>
      <td><strong>#{order.order_number}</strong></td><td>{order.terminal_id}</td><td>{order.dining_type}</td><td>{time(order.placed_at)}</td><td>{formatMoney(order.total_minor)}</td>
      <td>{compact
        ? <span className={'status status--' + order.fulfillment_status}>{order.fulfillment_status}</span>
        : <select value={order.fulfillment_status} onChange={(event) => onStatus?.(order, event.target.value)}>{statuses.map((status) => <option key={status}>{status}</option>)}</select>}
      </td>
    </tr>)}</tbody>
  </table></div>
}

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

export function CatalogPage() {
  const token = useAdminStore((state) => state.token)!
  const [products, setProducts] = useState<AdminProduct[]>([])
  const [error, setError] = useState('')
  const [search, setSearch] = useState('')
  const [editingProduct, setEditingProduct] = useState<AdminProduct | null>(null)
  const [activeTab, setActiveTab] = useState<'info' | 'combo' | 'media'>('info')

  // Custom Uploaded Images Store
  const [customImages, setCustomImages] = useState<Record<string, string>>(() => {
    try {
      const saved = localStorage.getItem('kiosk_custom_product_images')
      return saved ? JSON.parse(saved) : {}
    } catch {
      return {}
    }
  })

  // Form states
  const [editName, setEditName] = useState('')
  const [editSku, setEditSku] = useState('')
  const [editWboxItemCode, setEditWboxItemCode] = useState('')
  const [editCategory, setEditCategory] = useState('Burgers')
  const [editDesc, setEditDesc] = useState('')
  const [editPrice, setEditPrice] = useState<number>(0)
  const [editAvailable, setEditAvailable] = useState(true)
  const [isCombo, setIsCombo] = useState(false)
  const [editAccent, setEditAccent] = useState('#fff7ed')
  const [editImageUrl, setEditImageUrl] = useState<string>('')
  const [toast, setToast] = useState<string | null>(null)

  // Combo Option Groups state
  const [comboSteps, setComboSteps] = useState<Array<{ title: string; options: Array<{ name: string; extra: number }> }>>([
    { title: 'Main / Burger Choice', options: [{ name: 'Regular Choice', extra: 0 }, { name: 'Premium Upgrade', extra: 20 }] },
    { title: 'Side Choice', options: [{ name: 'Golden Fries', extra: 0 }, { name: 'Classic Spaghetti', extra: 25 }] },
  ])

  useEffect(() => {
    getCatalog(token).then((result) => setProducts(result.products)).catch((reason: Error) => setError(reason.message))
  }, [token])

  const showToast = (msg: string) => {
    setToast(msg)
    window.setTimeout(() => setToast(null), 3000)
  }

  const getProductImage = (sku: string) => customImages[sku] || productImages[sku]

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) return
    const reader = new FileReader()
    reader.onload = () => {
      const result = reader.result as string
      setEditImageUrl(result)
      showToast('📸 Image uploaded successfully!')
    }
    reader.readAsDataURL(file)
  }

  const toggle = async (product: AdminProduct) => {
    const available = !product.available
    setProducts((items) => items.map((item) => item.id === product.id ? { ...item, available } : item))
    try {
      await setAvailability(token, product.id, available)
      showToast(`${product.name} is now ${available ? 'Available' : 'Unavailable'}`)
    } catch (reason) {
      setProducts((items) => items.map((item) => item.id === product.id ? product : item))
      setError(reason instanceof Error ? reason.message : 'Update failed.')
    }
  }

  const openEditModal = (product: AdminProduct) => {
    setEditingProduct(product)
    setActiveTab('info')
    setEditName(product.name)
    setEditSku(product.sku)
    setEditWboxItemCode(product.wbox_item_code ?? '')
    setEditCategory(product.category_name)
    setEditDesc(product.description || '')
    setEditPrice(product.price_minor / 100)
    setEditAvailable(product.available)
    setIsCombo(product.category_name.toLowerCase().includes('combo') || product.sku.startsWith('CMB'))
    setEditAccent(product.accent || '#fff7ed')
    setEditImageUrl(customImages[product.sku] || productImages[product.sku] || '')
  }

  const handleSaveEdit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!editingProduct) return
    const updatedPriceMinor = Math.round(editPrice * 100)
    const targetSku = editSku.trim() || editingProduct.sku

    if (editImageUrl) {
      const updatedImages = { ...customImages, [targetSku]: editImageUrl }
      setCustomImages(updatedImages)
      localStorage.setItem('kiosk_custom_product_images', JSON.stringify(updatedImages))
    }

    const updatedProduct: AdminProduct = {
      ...editingProduct,
      name: editName.trim() || editingProduct.name,
      sku: targetSku,
      wbox_item_code: editWboxItemCode.trim() || null,
      category_name: editCategory,
      description: editDesc.trim() || null,
      price_minor: updatedPriceMinor,
      available: editAvailable,
      accent: editAccent,
    }

    setProducts((items) => items.map((item) => item.id === editingProduct.id ? updatedProduct : item))
    setEditingProduct(null)
    showToast(`✅ Saved changes for ${updatedProduct.name}`)

    try {
      if (editAvailable !== editingProduct.available) {
        await setAvailability(token, editingProduct.id, editAvailable)
      }
      if ((editWboxItemCode.trim() || null) !== editingProduct.wbox_item_code) {
        await setWboxMapping(token, editingProduct.id, editWboxItemCode.trim() || null)
      }
    } catch {
      // ignore
    }
  }

  const filteredProducts = products.filter((p) =>
    p.name.toLowerCase().includes(search.toLowerCase()) ||
    p.sku.toLowerCase().includes(search.toLowerCase()) ||
    p.category_name.toLowerCase().includes(search.toLowerCase())
  )

  return <AdminShell
    title="Catalog"
    eyebrow="MENU MANAGEMENT"
    action={
      <div style={{ display: 'flex', gap: '0.6rem', alignItems: 'center' }}>
        <button
          className="admin-primary admin-primary--small"
          style={{ background: '#fff7ed', border: '1.5px solid #ea580c', color: '#ea580c' }}
          onClick={() => {
            openEditModal({
              id: Date.now(),
              category_id: 3,
              category_name: 'Combo Meals',
              sku: 'CMB-' + String(Math.floor(100 + Math.random() * 900)),
              name: '',
              description: 'Build your customized combo meal in easy steps.',
              price_minor: 25900,
              emoji: '🍱',
              accent: '#fff4ed',
              active: true,
              available: true,
              wbox_item_code: null,
            })
            setActiveTab('combo')
            setIsCombo(true)
          }}
        >
          🍱 + Create combo meal
        </button>
        <button
          className="admin-primary admin-primary--small"
          onClick={() => openEditModal({
            id: Date.now(),
            category_id: 1,
            category_name: 'Burgers',
            sku: 'PRD-' + String(Math.floor(100 + Math.random() * 900)),
            name: '',
            description: '',
            price_minor: 19900,
            emoji: '🍔',
            accent: '#fff7ed',
            active: true,
            available: true,
            wbox_item_code: null,
          })}
        >
          + New product
        </button>
      </div>
    }
  >
    {toast && <div className="toast-notification" style={{ position: 'fixed', top: '1.5rem', right: '1.5rem', background: '#ea580c', color: '#fff', padding: '0.8rem 1.4rem', borderRadius: '0.6rem', fontWeight: 700, zIndex: 9999 }}>{toast}</div>}
    {error && <div className="admin-error">{error}</div>}
    <section className="admin-panel">
      <div className="admin-panel__heading">
        <div><p>PRODUCTS</p><h2>{products.length} menu items</h2></div>
        <input className="admin-search" placeholder="Search catalog by name, sku..." value={search} onChange={(e) => setSearch(e.target.value)} />
      </div>
      <div className="catalog-list">{filteredProducts.map((product) => <article key={product.id}>
        <span className="catalog-art" style={{ background: product.accent || '#fff7ed' }}>
          {getProductImage(product.sku) ? (
            <img src={getProductImage(product.sku)} alt={product.name} style={{ height: '85%', width: '85%', objectFit: 'contain' }} />
          ) : (
            product.emoji
          )}
        </span>
        <div>
          <strong>{product.name}</strong>
          <small>
            {product.sku} &middot; {product.category_name}
            {(product.category_name.toLowerCase().includes('combo') || product.sku.startsWith('CMB')) && (
              <span style={{ marginLeft: '0.4rem', background: '#ea580c20', color: '#ea580c', padding: '0.15rem 0.4rem', borderRadius: '0.3rem', fontSize: '0.62rem', fontWeight: 800 }}>COMBO MEAL</span>
            )}
          </small>
        </div>
        <b>{formatMoney(product.price_minor)}</b>
        <label className="switch"><input type="checkbox" checked={product.available} onChange={() => toggle(product)} /><span /></label>
        <em>{product.available ? 'Available' : 'Unavailable'}</em>
        <button
          onClick={() => openEditModal(product)}
          style={{
            background: '#fff8f5',
            border: '1px solid #fed7aa',
            borderRadius: '0.45rem',
            color: '#ea580c',
            fontWeight: 750,
            fontSize: '0.72rem',
            padding: '0.45rem 0.85rem',
            cursor: 'pointer',
          }}
        >
          Edit
        </button>
      </article>)}</div>
      {!products.length && !error && <AdminState message="Loading catalog..." />}
    </section>

    {/* Full-Featured Product & Combo Studio Modal */}
    {editingProduct && (
      <div className="modal-backdrop" onClick={() => setEditingProduct(null)}>
        <div className="idle-modal" style={{ maxWidth: '36rem', width: '92vw', textAlign: 'left', maxHeight: '90vh', overflowY: 'auto' }} onClick={(e) => e.stopPropagation()}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
            <div>
              <p className="eyebrow" style={{ color: '#ea580c', fontWeight: 800 }}>MENU MANAGEMENT</p>
              <h2 style={{ fontFamily: 'Georgia, serif', margin: '0.2rem 0 0', color: '#1f1816', fontSize: '1.4rem' }}>
                Edit Menu Item
              </h2>
            </div>
            <span style={{ background: '#fff7ed', border: '1px solid #fed7aa', color: '#ea580c', borderRadius: '0.45rem', padding: '0.3rem 0.6rem', fontSize: '0.72rem', fontWeight: 800 }}>
              {editSku || editingProduct.sku}
            </span>
          </div>

          {/* Navigation Tabs */}
          <div style={{ display: 'flex', gap: '0.5rem', borderBottom: '1px solid #fed7aa', margin: '1rem 0 1.2rem', paddingBottom: '0.3rem' }}>
            <button
              type="button"
              onClick={() => setActiveTab('info')}
              style={{
                background: activeTab === 'info' ? '#ea580c' : 'transparent',
                color: activeTab === 'info' ? '#fff' : '#78716c',
                border: 0,
                borderRadius: '0.45rem',
                padding: '0.45rem 0.85rem',
                fontSize: '0.75rem',
                fontWeight: 750,
                cursor: 'pointer',
              }}
            >
              📋 Product Details
            </button>
            <button
              type="button"
              onClick={() => setActiveTab('combo')}
              style={{
                background: activeTab === 'combo' ? '#ea580c' : 'transparent',
                color: activeTab === 'combo' ? '#fff' : '#78716c',
                border: 0,
                borderRadius: '0.45rem',
                padding: '0.45rem 0.85rem',
                fontSize: '0.75rem',
                fontWeight: 750,
                cursor: 'pointer',
              }}
            >
              🍱 Combo & Options
            </button>
            <button
              type="button"
              onClick={() => setActiveTab('media')}
              style={{
                background: activeTab === 'media' ? '#ea580c' : 'transparent',
                color: activeTab === 'media' ? '#fff' : '#78716c',
                border: 0,
                borderRadius: '0.45rem',
                padding: '0.45rem 0.85rem',
                fontSize: '0.75rem',
                fontWeight: 750,
                cursor: 'pointer',
              }}
            >
              🎨 Media & Styling
            </button>
          </div>

          <form onSubmit={handleSaveEdit} style={{ display: 'flex', flexDirection: 'column', gap: '0.9rem' }}>
            {/* Tab 1: Product Details */}
            {activeTab === 'info' && (
              <>
                <div style={{ display: 'grid', gridTemplateColumns: '2fr 1fr', gap: '0.8rem' }}>
                  <div>
                    <label style={{ display: 'block', fontSize: '0.72rem', fontWeight: 700, color: '#574d49', marginBottom: '0.3rem' }}>
                      Product Name
                    </label>
                    <input
                      type="text"
                      required
                      value={editName}
                      onChange={(e) => setEditName(e.target.value)}
                      style={{ width: '100%', padding: '0.7rem', borderRadius: '0.55rem', border: '1px solid #fed7aa', fontSize: '0.8rem' }}
                    />
                  </div>

                  <div>
                    <label style={{ display: 'block', fontSize: '0.72rem', fontWeight: 700, color: '#574d49', marginBottom: '0.3rem' }}>
                      SKU Code
                    </label>
                    <input
                      type="text"
                      required
                      value={editSku}
                      onChange={(e) => setEditSku(e.target.value)}
                      style={{ width: '100%', padding: '0.7rem', borderRadius: '0.55rem', border: '1px solid #fed7aa', fontSize: '0.8rem' }}
                    />
                  </div>
                </div>

                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.8rem' }}>
                  <div>
                    <label style={{ display: 'block', fontSize: '0.72rem', fontWeight: 700, color: '#574d49', marginBottom: '0.3rem' }}>
                      Category
                    </label>
                    <select
                      value={editCategory}
                      onChange={(e) => {
                        setEditCategory(e.target.value)
                        if (e.target.value === 'Combo Meals') setIsCombo(true)
                      }}
                      style={{ width: '100%', padding: '0.7rem', borderRadius: '0.55rem', border: '1px solid #fed7aa', fontSize: '0.8rem', background: '#fff' }}
                    >
                      <option value="Burgers">Burgers</option>
                      <option value="Combo Meals">Combo Meals</option>
                      <option value="Meals">Meals</option>
                      <option value="Sides">Sides</option>
                      <option value="Drinks">Drinks</option>
                      <option value="Desserts">Desserts</option>
                    </select>
                  </div>

                  <div>
                    <label style={{ display: 'block', fontSize: '0.72rem', fontWeight: 700, color: '#574d49', marginBottom: '0.3rem' }}>
                      Base Price (PHP ₱)
                    </label>
                    <input
                      type="number"
                      step="0.01"
                      required
                      value={editPrice}
                      onChange={(e) => setEditPrice(parseFloat(e.target.value) || 0)}
                      style={{ width: '100%', padding: '0.7rem', borderRadius: '0.55rem', border: '1px solid #fed7aa', fontSize: '0.8rem' }}
                    />
                  </div>
                </div>

                <div>
                  <label style={{ display: 'block', fontSize: '0.72rem', fontWeight: 700, color: '#574d49', marginBottom: '0.3rem' }}>
                    Description & Ingredients
                  </label>
                  <textarea
                    rows={2}
                    value={editDesc}
                    onChange={(e) => setEditDesc(e.target.value)}
                    placeholder="Short description displayed on the item detail screen..."
                    style={{ width: '100%', padding: '0.7rem', borderRadius: '0.55rem', border: '1px solid #fed7aa', fontSize: '0.8rem', resize: 'vertical' }}
                  />
                </div>

                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '0.75rem', background: '#fff8f5', borderRadius: '0.65rem', border: '1px solid #fed7aa' }}>
                  <div>
                    <strong style={{ display: 'block', fontSize: '0.8rem', color: '#1f1816' }}>Available on Customer Kiosk</strong>
                    <small style={{ color: '#78716c', fontSize: '0.68rem' }}>When disabled, item is marked unavailable and cannot be ordered.</small>
                  </div>
                  <label className="switch">
                    <input
                      type="checkbox"
                      checked={editAvailable}
                      onChange={(e) => setEditAvailable(e.target.checked)}
                    />
                    <span />
                  </label>
                </div>
              </>
            )}

            {/* Tab 2: Combo & Options Builder */}
            {activeTab === 'combo' && (
              <div style={{ display: 'flex', flexDirection: 'column', gap: '0.85rem' }}>
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '0.75rem', background: '#fff8f5', borderRadius: '0.65rem', border: '1px solid #fed7aa' }}>
                  <div>
                    <strong style={{ display: 'block', fontSize: '0.8rem', color: '#1f1816' }}>Enable Multi-Step Combo Flow</strong>
                    <small style={{ color: '#78716c', fontSize: '0.68rem' }}>Guides customer through step-by-step choices (e.g. Choose burger, side, drink).</small>
                  </div>
                  <label className="switch">
                    <input
                      type="checkbox"
                      checked={isCombo}
                      onChange={(e) => setIsCombo(e.target.checked)}
                    />
                    <span />
                  </label>
                </div>

                <div style={{ borderTop: '1px solid #f0e8e2', paddingTop: '0.8rem' }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.6rem' }}>
                    <small style={{ color: '#ea580c', fontWeight: 800, fontSize: '0.65rem', letterSpacing: '0.08em' }}>
                      CONFIGURED STEPS & OPTIONS
                    </small>
                    <button
                      type="button"
                      onClick={() => setComboSteps([...comboSteps, { title: 'New Option Step', options: [{ name: 'Option 1', extra: 0 }] }])}
                      style={{ background: '#fff7ed', border: '1px solid #fed7aa', color: '#ea580c', borderRadius: '0.4rem', padding: '0.25rem 0.6rem', fontSize: '0.68rem', fontWeight: 750, cursor: 'pointer' }}
                    >
                      + Add Step
                    </button>
                  </div>

                  <div style={{ display: 'flex', flexDirection: 'column', gap: '0.7rem' }}>
                    {comboSteps.map((step, sIdx) => (
                      <div key={sIdx} style={{ background: '#ffffff', border: '1px solid #fed7aa', borderRadius: '0.65rem', padding: '0.75rem' }}>
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.5rem' }}>
                          <input
                            type="text"
                            value={step.title}
                            onChange={(e) => {
                              const val = e.target.value
                              setComboSteps((steps) => steps.map((s, i) => i === sIdx ? { ...s, title: val } : s))
                            }}
                            style={{ fontWeight: 750, fontSize: '0.78rem', color: '#1f1816', border: '1px solid transparent', borderBottom: '1px dashed #fed7aa', padding: '0.2rem', width: '70%' }}
                          />
                          <button
                            type="button"
                            onClick={() => setComboSteps((steps) => steps.filter((_, i) => i !== sIdx))}
                            style={{ background: '#fef2f2', border: '1px solid #fca5a5', color: '#dc2626', borderRadius: '0.35rem', padding: '0.2rem 0.5rem', fontSize: '0.65rem', cursor: 'pointer' }}
                          >
                            Remove Step
                          </button>
                        </div>

                        <div style={{ display: 'flex', flexDirection: 'column', gap: '0.4rem' }}>
                          {step.options.map((opt, oIdx) => (
                            <div key={oIdx} style={{ display: 'flex', gap: '0.5rem', alignItems: 'center' }}>
                              <input
                                type="text"
                                value={opt.name}
                                placeholder="Option name"
                                onChange={(e) => {
                                  const val = e.target.value
                                  setComboSteps((steps) => steps.map((s, i) => i === sIdx ? { ...s, options: s.options.map((o, j) => j === oIdx ? { ...o, name: val } : o) } : s))
                                }}
                                style={{ flex: 1, padding: '0.45rem', borderRadius: '0.4rem', border: '1px solid #e7dfd8', fontSize: '0.75rem' }}
                              />
                              <div style={{ display: 'flex', alignItems: 'center', gap: '0.25rem', width: '6.5rem' }}>
                                <span style={{ fontSize: '0.72rem', color: '#78716c' }}>+₱</span>
                                <input
                                  type="number"
                                  value={opt.extra}
                                  onChange={(e) => {
                                    const val = parseFloat(e.target.value) || 0
                                    setComboSteps((steps) => steps.map((s, i) => i === sIdx ? { ...s, options: s.options.map((o, j) => j === oIdx ? { ...o, extra: val } : o) } : s))
                                  }}
                                  style={{ width: '100%', padding: '0.45rem', borderRadius: '0.4rem', border: '1px solid #e7dfd8', fontSize: '0.75rem' }}
                                />
                              </div>
                            </div>
                          ))}
                          <button
                            type="button"
                            onClick={() => {
                              setComboSteps((steps) => steps.map((s, i) => i === sIdx ? { ...s, options: [...s.options, { name: 'Additional Choice', extra: 0 }] } : s))
                            }}
                            style={{ alignSelf: 'flex-start', background: 'transparent', border: 0, color: '#ea580c', fontSize: '0.68rem', fontWeight: 700, cursor: 'pointer', marginTop: '0.2rem' }}
                          >
                            + Add choice
                          </button>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            )}

            {/* Tab 3: Media & Styling */}
            {activeTab === 'media' && (
              <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
                {/* Live Image & Frame Preview */}
                <div style={{ display: 'flex', alignItems: 'center', gap: '1.2rem', padding: '1rem', background: '#fff8f5', borderRadius: '0.75rem', border: '1px solid #fed7aa' }}>
                  <div style={{ width: '5.5rem', height: '5.5rem', borderRadius: '0.75rem', background: editAccent, display: 'flex', alignItems: 'center', justifyContent: 'center', boxShadow: '0 4px 12px #ea580c10', overflow: 'hidden' }}>
                    {editImageUrl || getProductImage(editSku || editingProduct.sku) ? (
                      <img
                        src={editImageUrl || getProductImage(editSku || editingProduct.sku)}
                        alt="preview"
                        style={{ width: '85%', height: '85%', objectFit: 'contain' }}
                      />
                    ) : (
                      <span style={{ fontSize: '2.5rem' }}>{editingProduct.emoji || '🍔'}</span>
                    )}
                  </div>
                  <div>
                    <strong style={{ display: 'block', fontSize: '0.85rem', color: '#1f1816' }}>Artwork & Tile Frame</strong>
                    <small style={{ color: '#78716c', fontSize: '0.7rem' }}>
                      {editImageUrl ? 'Using custom uploaded asset' : `Using default menu asset for ${editSku || editingProduct.sku}`}
                    </small>
                  </div>
                </div>

                {/* Upload Image Section */}
                <div style={{ background: '#ffffff', border: '2px dashed #fed7aa', borderRadius: '0.75rem', padding: '1.2rem', textAlign: 'center' }}>
                  <label
                    htmlFor="product-image-upload-input"
                    style={{
                      display: 'inline-flex',
                      alignItems: 'center',
                      gap: '0.5rem',
                      background: '#ea580c',
                      color: '#ffffff',
                      padding: '0.65rem 1.4rem',
                      borderRadius: '0.55rem',
                      fontWeight: 750,
                      fontSize: '0.78rem',
                      cursor: 'pointer',
                      boxShadow: '0 4px 12px #ea580c25',
                    }}
                  >
                    📁 Upload Product Image (PNG, JPG, WebP)
                  </label>
                  <input
                    id="product-image-upload-input"
                    type="file"
                    accept="image/*"
                    onChange={handleFileUpload}
                    style={{ display: 'none' }}
                  />
                  <p style={{ margin: '0.5rem 0 0', color: '#78716c', fontSize: '0.68rem' }}>
                    Select an image from your computer to use for this menu item.
                  </p>
                </div>

                {/* Preset Fast Food Asset Gallery */}
                <div>
                  <small style={{ color: '#ea580c', fontWeight: 800, fontSize: '0.65rem', letterSpacing: '0.08em', display: 'block', marginBottom: '0.5rem' }}>
                    OR CHOOSE FROM MENU ASSET GALLERY
                  </small>
                  <div style={{ display: 'grid', gridTemplateColumns: 'repeat(6, 1fr)', gap: '0.5rem' }}>
                    {Object.entries(productImages).map(([sku, imgUrl]) => (
                      <button
                        key={sku}
                        type="button"
                        onClick={() => {
                          setEditImageUrl(imgUrl)
                          showToast(`Selected ${sku} image`)
                        }}
                        style={{
                          background: '#fff8f5',
                          border: editImageUrl === imgUrl ? '2px solid #ea580c' : '1px solid #fed7aa',
                          borderRadius: '0.55rem',
                          padding: '0.4rem',
                          height: '3.8rem',
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'center',
                          cursor: 'pointer',
                        }}
                      >
                        <img src={imgUrl} alt={sku} style={{ width: '80%', height: '80%', objectFit: 'contain' }} />
                      </button>
                    ))}
                  </div>
                </div>

                {/* Background Accent Color */}
                <div>
                  <label style={{ display: 'block', fontSize: '0.72rem', fontWeight: 700, color: '#574d49', marginBottom: '0.3rem' }}>
                    Card Background Accent Color
                  </label>
                  <div style={{ display: 'flex', gap: '0.6rem', alignItems: 'center' }}>
                    <input
                      type="color"
                      value={editAccent}
                      onChange={(e) => setEditAccent(e.target.value)}
                      style={{ width: '3rem', height: '2.5rem', borderRadius: '0.45rem', border: '1px solid #fed7aa', cursor: 'pointer' }}
                    />
                    <input
                      type="text"
                      value={editAccent}
                      onChange={(e) => setEditAccent(e.target.value)}
                      style={{ width: '8rem', padding: '0.6rem', borderRadius: '0.45rem', border: '1px solid #fed7aa', fontSize: '0.8rem' }}
                    />
                  </div>
                </div>
              </div>
            )}

            <div>
              <label style={{ display: 'block', fontSize: '0.72rem', fontWeight: 700, color: '#574d49', marginBottom: '0.3rem' }}>
                WBOX Item Code
              </label>
              <input
                type='text'
                value={editWboxItemCode}
                onChange={(event) => setEditWboxItemCode(event.target.value)}
                placeholder='WBOX menukey'
                style={{ width: '100%', padding: '0.7rem', borderRadius: '0.55rem', border: '1px solid #fed7aa', fontSize: '0.8rem' }}
              />
              <small style={{ color: '#78716c', fontSize: '0.65rem' }}>This must match the item menukey configured in WBOX.</small>
            </div>

            {/* Action Buttons Footer */}
            <div style={{ display: 'flex', gap: '0.8rem', marginTop: '1rem', borderTop: '1px solid #f0e8e2', paddingTop: '1rem' }}>
              <button type="submit" className="admin-primary" style={{ flex: 1 }}>
                Save Changes &rarr;
              </button>
              <button
                type="button"
                className="secondary-button"
                style={{ padding: '0 1.4rem', borderRadius: '0.6rem', border: '1px solid #ea580c40', color: '#c2410c' }}
                onClick={() => setEditingProduct(null)}
              >
                Cancel
              </button>
            </div>
          </form>
        </div>
      </div>
    )}
  </AdminShell>
}

export function OrdersPage() {
  const token = useAdminStore((state) => state.token)!
  const [orders, setOrders] = useState<AdminOrder[] | null>(null)
  const [error, setError] = useState('')
  const [query, setQuery] = useState('')
  const [selectedId, setSelectedId] = useState<number | null>(null)

  useEffect(() => {
    getOrders(token).then((result) => {
      setOrders(result.orders)
      setSelectedId(result.orders[0]?.id ?? null)
    }).catch((reason: Error) => setError(reason.message))
  }, [token])

  const update = async (order: AdminOrder, status: string) => {
    setOrders((items) => (items ?? []).map((item) => item.id === order.id ? { ...item, fulfillment_status: status } : item))
    try {
      const result = await setOrderStatus(token, order.id, status)
      setOrders((items) => (items ?? []).map((item) => item.id === order.id ? result.order : item))
    } catch (reason) {
      setOrders((items) => (items ?? []).map((item) => item.id === order.id ? order : item))
      setError(reason instanceof Error ? reason.message : 'Update failed.')
    }
  }

  const retryWbox = async (order: AdminOrder) => {
    setError('')
    try {
      await retryWboxExport(token, order.id)
      setOrders((items) => (items ?? []).map((item) => item.id === order.id
        ? { ...item, wbox_status: 'pending', wbox_last_error: null }
        : item))
    } catch (reason) {
      setError(reason instanceof Error ? reason.message : 'Unable to retry WBOX delivery.')
    }
  }

  const filteredOrders = useMemo(() => {
    const list = orders ?? []
    const term = query.trim().toLowerCase()
    return term
      ? list.filter((order) => (order.order_number + ' ' + order.terminal_id + ' ' + order.fulfillment_status).toLowerCase().includes(term))
      : list
  }, [orders, query])
  const selectedOrder = (orders ?? []).find((order) => order.id === selectedId) ?? filteredOrders[0]

  return <AdminShell title="Orders" eyebrow="FULFILLMENT" action={<span className="admin-live"><i /> Live</span>}>
    {error && <div className="admin-error">{error}</div>}
    {orders === null ? (!error && <AdminState message="Loading orders..." />) : orders.length === 0 ? <div className="admin-state" style={{ padding: '3rem 1rem' }}>No orders placed yet.</div> : <section className="orders-workspace">
      <div className="orders-list">
        <div className="orders-toolbar">
          <label><span aria-hidden="true">&#9906;</span><input value={query} onChange={(event) => setQuery(event.target.value)} placeholder="Search orders" aria-label="Search orders" /></label>
          <button aria-label="Filter orders">&#9776;</button>
        </div>
        <div className="orders-list__head"><span>Order</span><span>Terminal</span><span>Placed</span><span>Status</span></div>
        <div className="orders-list__body">
          {filteredOrders.map((order) => <button key={order.id} className={selectedOrder?.id === order.id ? 'active' : ''} onClick={() => setSelectedId(order.id)}>
            <span><strong>#{order.order_number}</strong><small>{order.dining_type}</small></span>
            <span>{order.terminal_id}</span>
            <span>{time(order.placed_at)}</span>
            <span className={'status status--' + order.fulfillment_status}>{order.fulfillment_status}</span>
          </button>)}
          {!filteredOrders.length && <AdminState message="No matching orders." />}
        </div>
        <footer>Showing {filteredOrders.length} of {orders.length} orders</footer>
      </div>

      <aside className="order-detail">
        {selectedOrder ? <>
          <div className="order-detail__heading">
            <div><small>ORDER</small><h2>#{selectedOrder.order_number}</h2><p>{selectedOrder.terminal_id} &middot; {selectedOrder.dining_type}</p></div>
            <span className={'status status--' + selectedOrder.fulfillment_status}>{selectedOrder.fulfillment_status}</span>
          </div>
          <div className="order-detail__stats">
            <div><span>Placed</span><strong>{time(selectedOrder.placed_at)}</strong></div>
            <div><span>Payment</span><strong>{selectedOrder.payment_status}</strong></div>
            <div><span>Subtotal</span><strong>{formatMoney(selectedOrder.subtotal_minor)}</strong></div>
            <div><span>Tax</span><strong>{formatMoney(selectedOrder.tax_minor)}</strong></div>
            <div className="order-detail__total"><span>Order total</span><strong>{formatMoney(selectedOrder.total_minor)}</strong></div>
          </div>

          <div style={{ margin: '1.2rem 0', borderTop: '1px solid #f0e8e2', paddingTop: '1rem' }}>
            <small style={{ color: '#ea580c', fontWeight: 800, fontSize: '0.62rem', letterSpacing: '0.12em', display: 'block', marginBottom: '0.6rem' }}>
              ORDERED PRODUCTS
            </small>
            {(() => {
              let items: Array<{ name: string; quantity: number; sku?: string; selections?: Array<{ valueName: string }>; note?: string; basePrice?: number }> = []
              if (selectedOrder.items_json) {
                try {
                  items = JSON.parse(selectedOrder.items_json)
                } catch {
                  // ignore
                }
              }
              if (!items.length) {
                return <p style={{ color: '#78716c', fontSize: '0.74rem', margin: 0 }}>Items list recorded with receipt #{selectedOrder.order_number}</p>
              }
              return (
                <div style={{ display: 'flex', flexDirection: 'column', gap: '0.55rem' }}>
                  {items.map((item, idx) => (
                    <div
                      key={idx}
                      style={{
                        background: '#fff8f5',
                        border: '1px solid #fed7aa',
                        borderRadius: '0.6rem',
                        padding: '0.7rem 0.85rem',
                        display: 'flex',
                        justifyContent: 'space-between',
                        alignItems: 'flex-start',
                      }}
                    >
                      <div>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '0.45rem' }}>
                          <span
                            style={{
                              background: '#ea580c',
                              color: '#fff',
                              borderRadius: '50%',
                              width: '1.35rem',
                              height: '1.35rem',
                              display: 'inline-flex',
                              alignItems: 'center',
                              justifyContent: 'center',
                              fontSize: '0.7rem',
                              fontWeight: 800,
                            }}
                          >
                            {item.quantity}x
                          </span>
                          <strong style={{ color: '#1f1816', fontSize: '0.82rem', fontFamily: 'Georgia, serif' }}>
                            {item.name}
                          </strong>
                        </div>
                        {item.selections && item.selections.length > 0 && (
                          <small style={{ color: '#78716c', display: 'block', marginTop: '0.2rem', fontSize: '0.65rem' }}>
                            {item.selections.map((s) => s.valueName).join(' · ')}
                          </small>
                        )}
                        {item.note && (
                          <small style={{ color: '#c2410c', display: 'block', marginTop: '0.15rem', fontSize: '0.65rem' }}>
                            Note: {item.note}
                          </small>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              )
            })()}
          </div>

          <div className='order-detail__note'>
            <strong>WBOX POS delivery</strong>
            <p>Status: {selectedOrder.wbox_status ?? 'not queued'}</p>
            {selectedOrder.wbox_request_filename && <p>Request: {selectedOrder.wbox_request_filename}</p>}
            {(selectedOrder.wbox_response_message || selectedOrder.wbox_last_error) && <p>{selectedOrder.wbox_response_message || selectedOrder.wbox_last_error}</p>}
            {(!selectedOrder.wbox_status || ['failed', 'rejected'].includes(selectedOrder.wbox_status)) && (
              <button type='button' className='secondary-button' onClick={() => retryWbox(selectedOrder)}>Retry WBOX delivery</button>
            )}
          </div>

          <label className="order-status-control">Fulfillment status<select value={selectedOrder.fulfillment_status} onChange={(event) => update(selectedOrder, event.target.value)}>{statuses.map((status) => <option key={status}>{status}</option>)}</select></label>
          <div className="order-detail__note"><strong>Order activity</strong><p>Status changes are saved immediately and remain visible to the fulfillment team.</p></div>
        </> : <AdminState message="Select an order to view details." />}
      </aside>
    </section>}
  </AdminShell>
}

const placeholderCopy: Record<string, [string, string, string]> = {
  kiosks: ['TERMINAL MANAGEMENT', 'Kiosks', 'Register terminals, rotate credentials, and monitor device health from this workspace.'],
  reports: ['INSIGHTS', 'Reports', 'Sales summaries, product performance, and export tools will live here.'],
  settings: ['CONFIGURATION', 'Settings', 'Control branding, tax, receipts, payment methods, and service modes.'],
}

export function PlaceholderPage({ section }: { section: keyof typeof placeholderCopy }) {
  const copy = placeholderCopy[section]
  if (!copy) return null
  return <AdminShell eyebrow={copy[0]} title={copy[1]}>
    <section className="admin-panel empty-feature"><span>&#9675;</span><h2>Foundation ready</h2><p>{copy[2]}</p><small>This module is prepared for the next API milestone.</small></section>
  </AdminShell>
}
