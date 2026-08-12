import { useEffect, useMemo, useState } from 'react'
import { Navigate } from 'react-router-dom'
import { formatMoney } from '../domain/order'
import { getCatalog, getDashboard, getOrders, setAvailability, setOrderStatus, type AdminOrder, type AdminProduct } from './admin-api'
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
        <article className="admin-panel admin-note"><p>SHIFT NOTE</p><h2>Everything looks steady.</h2><span>All seeded terminals and products are ready for this development shift.</span></article>
      </section>
    </>}
  </AdminShell>
}

function OrderTable({ orders, compact = false, onStatus }: { orders: AdminOrder[]; compact?: boolean; onStatus?: (order: AdminOrder, status: string) => void }) {
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

export function CatalogPage() {
  const token = useAdminStore((state) => state.token)!
  const [products, setProducts] = useState<AdminProduct[]>([])
  const [error, setError] = useState('')

  useEffect(() => {
    getCatalog(token).then((result) => setProducts(result.products)).catch((reason: Error) => setError(reason.message))
  }, [token])

  const toggle = async (product: AdminProduct) => {
    const available = !product.available
    setProducts((items) => items.map((item) => item.id === product.id ? { ...item, available } : item))
    try {
      await setAvailability(token, product.id, available)
    } catch (reason) {
      setProducts((items) => items.map((item) => item.id === product.id ? product : item))
      setError(reason instanceof Error ? reason.message : 'Update failed.')
    }
  }

  return <AdminShell title="Catalog" eyebrow="MENU MANAGEMENT" action={<button className="admin-primary admin-primary--small">+ New product</button>}>
    {error && <div className="admin-error">{error}</div>}
    <section className="admin-panel">
      <div className="admin-panel__heading"><div><p>PRODUCTS</p><h2>{products.length} menu items</h2></div><input className="admin-search" placeholder="Search catalog" /></div>
      <div className="catalog-list">{products.map((product) => <article key={product.id}>
        <span className="catalog-art" style={{ background: product.accent }}>{product.emoji}</span>
        <div><strong>{product.name}</strong><small>{product.sku} &middot; {product.category_name}</small></div>
        <b>{formatMoney(product.price_minor)}</b>
        <label className="switch"><input type="checkbox" checked={product.available} onChange={() => toggle(product)} /><span /></label>
        <em>{product.available ? 'Available' : 'Unavailable'}</em>
      </article>)}</div>
      {!products.length && !error && <AdminState message="Loading catalog..." />}
    </section>
  </AdminShell>
}

export function OrdersPage() {
  const token = useAdminStore((state) => state.token)!
  const [orders, setOrders] = useState<AdminOrder[]>([])
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
    setOrders((items) => items.map((item) => item.id === order.id ? { ...item, fulfillment_status: status } : item))
    try {
      const result = await setOrderStatus(token, order.id, status)
      setOrders((items) => items.map((item) => item.id === order.id ? result.order : item))
    } catch (reason) {
      setOrders((items) => items.map((item) => item.id === order.id ? order : item))
      setError(reason instanceof Error ? reason.message : 'Update failed.')
    }
  }

  const filteredOrders = useMemo(() => {
    const term = query.trim().toLowerCase()
    return term
      ? orders.filter((order) => (order.order_number + ' ' + order.terminal_id + ' ' + order.fulfillment_status).toLowerCase().includes(term))
      : orders
  }, [orders, query])
  const selectedOrder = orders.find((order) => order.id === selectedId) ?? filteredOrders[0]

  return <AdminShell title="Orders" eyebrow="FULFILLMENT" action={<span className="admin-live"><i /> Live</span>}>
    {error && <div className="admin-error">{error}</div>}
    {!orders.length && !error ? <AdminState message="Loading orders..." /> : <section className="orders-workspace">
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
