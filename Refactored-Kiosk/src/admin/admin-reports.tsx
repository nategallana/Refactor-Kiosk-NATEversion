import { useEffect, useMemo, useState } from 'react'
import { formatMoney } from '../domain/order'
import { getOrders, getSettings, type AdminOrder } from './admin-api'
import { AdminShell } from './admin-shell'
import { useAdminStore } from './admin-store'

interface OrderItemDetail {
  name: string
  quantity: number
  price_minor?: number
  selections?: Array<{ groupName: string; valueName: string; price_minor?: number }>
  note?: string
}

export function ReportsPage() {
  const token = useAdminStore((state) => state.token)!
  const [orders, setOrders] = useState<AdminOrder[]>([])
  const [brandName, setBrandName] = useState<string>('Kiosk Store')
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')

  // Filters
  const [datePreset, setDatePreset] = useState<'today' | 'yesterday' | 'week' | 'month' | 'all' | 'custom'>('today')
  const [customFrom, setCustomFrom] = useState('')
  const [customTo, setCustomTo] = useState('')
  const [selectedTerminal, setSelectedTerminal] = useState<string>('all')
  const [selectedDiningType, setSelectedDiningType] = useState<string>('all')
  const [searchQuery, setSearchQuery] = useState('')

  useEffect(() => {
    setLoading(true)
    Promise.all([
      getOrders(token),
      getSettings(token).catch(() => null),
    ])
      .then(([ordersData, settingsData]) => {
        setOrders(ordersData.orders)
        if (settingsData?.settings?.brand_name) {
          setBrandName(settingsData.settings.brand_name)
        }
        setError('')
      })
      .catch((err: Error) => setError(err.message))
      .finally(() => setLoading(false))
  }, [token])

  // Terminals list
  const terminals = useMemo(() => {
    const set = new Set<string>()
    orders.forEach((o) => {
      if (o.terminal_id) set.add(o.terminal_id)
    })
    return Array.from(set).sort()
  }, [orders])

  // Filtered Orders
  const filteredOrders = useMemo(() => {
    const now = new Date()
    const todayStart = new Date(now.getFullYear(), now.getMonth(), now.getDate()).getTime()
    const yesterdayStart = todayStart - 86400000
    const weekStart = todayStart - 7 * 86400000
    const monthStart = new Date(now.getFullYear(), now.getMonth(), 1).getTime()

    return orders.filter((order) => {
      const orderTime = new Date(order.placed_at).getTime()

      // Date filtering
      if (datePreset === 'today') {
        if (orderTime < todayStart) return false
      } else if (datePreset === 'yesterday') {
        if (orderTime < yesterdayStart || orderTime >= todayStart) return false
      } else if (datePreset === 'week') {
        if (orderTime < weekStart) return false
      } else if (datePreset === 'month') {
        if (orderTime < monthStart) return false
      } else if (datePreset === 'custom') {
        if (customFrom) {
          const fromTime = new Date(customFrom).getTime()
          if (orderTime < fromTime) return false
        }
        if (customTo) {
          const toTime = new Date(customTo + 'T23:59:59').getTime()
          if (orderTime > toTime) return false
        }
      }

      // Terminal filtering
      if (selectedTerminal !== 'all' && order.terminal_id !== selectedTerminal) {
        return false
      }

      // Dining type filtering
      if (selectedDiningType !== 'all' && order.dining_type.toLowerCase() !== selectedDiningType.toLowerCase()) {
        return false
      }

      // Search query
      if (searchQuery.trim()) {
        const q = searchQuery.toLowerCase()
        const matchNum = order.order_number.toLowerCase().includes(q)
        const matchItems = order.items_json?.toLowerCase().includes(q) ?? false
        if (!matchNum && !matchItems) return false
      }

      return true
    })
  }, [orders, datePreset, customFrom, customTo, selectedTerminal, selectedDiningType, searchQuery])

  // KPIs
  const stats = useMemo(() => {
    const totalSalesMinor = filteredOrders.reduce((sum, o) => sum + (o.total_minor || 0), 0)
    const totalOrders = filteredOrders.length
    const avgOrderValueMinor = totalOrders > 0 ? Math.round(totalSalesMinor / totalOrders) : 0

    let totalItems = 0
    let dineInCount = 0
    let takeoutCount = 0

    filteredOrders.forEach((o) => {
      if (o.dining_type?.toLowerCase() === 'dine-in' || o.dining_type?.toLowerCase() === 'dine in') {
        dineInCount++
      } else {
        takeoutCount++
      }

      if (o.items_json) {
        try {
          const items: OrderItemDetail[] = JSON.parse(o.items_json)
          if (Array.isArray(items)) {
            items.forEach((it) => {
              totalItems += it.quantity || 1
            })
          }
        } catch {
          totalItems += 1
        }
      } else {
        totalItems += 1
      }
    })

    const taxMinor = filteredOrders.reduce((sum, o) => sum + (o.tax_minor || 0), 0)
    const subtotalMinor = filteredOrders.reduce((sum, o) => sum + (o.subtotal_minor || 0), 0)

    return {
      totalSalesMinor,
      totalOrders,
      avgOrderValueMinor,
      totalItems,
      dineInCount,
      takeoutCount,
      taxMinor,
      subtotalMinor,
    }
  }, [filteredOrders])

  // Payment Breakdown
  const paymentBreakdown = useMemo(() => {
    const map = new Map<string, { count: number; totalMinor: number }>()

    filteredOrders.forEach((o) => {
      const method = o.payment_status === 'paid' ? 'Card / Digital' : 'Counter Cash'
      const cur = map.get(method) || { count: 0, totalMinor: 0 }
      cur.count++
      cur.totalMinor += o.total_minor || 0
      map.set(method, cur)
    })

    return Array.from(map.entries()).map(([method, val]) => ({
      method,
      count: val.count,
      totalMinor: val.totalMinor,
      percent: stats.totalSalesMinor > 0 ? (val.totalMinor / stats.totalSalesMinor) * 100 : 0,
    }))
  }, [filteredOrders, stats.totalSalesMinor])

  // Hourly Activity
  const hourlyActivity = useMemo(() => {
    const hours = Array.from({ length: 15 }, (_, i) => i + 8) // 8 AM to 10 PM
    const data = hours.map((h) => ({
      hour: h,
      label: `${h % 12 === 0 ? 12 : h % 12} ${h < 12 ? 'AM' : 'PM'}`,
      orders: 0,
      salesMinor: 0,
    }))

    filteredOrders.forEach((o) => {
      const d = new Date(o.placed_at)
      const h = d.getHours()
      const item = data.find((x) => x.hour === h)
      if (item) {
        item.orders++
        item.salesMinor += o.total_minor || 0
      }
    })

    const maxSales = Math.max(...data.map((d) => d.salesMinor), 1)
    const peakHour = [...data].sort((a, b) => b.salesMinor - a.salesMinor)[0]

    return { data, maxSales, peakHour }
  }, [filteredOrders])

  // Top Selling Items
  const topProducts = useMemo(() => {
    const itemMap = new Map<string, { name: string; qty: number; salesMinor: number }>()

    filteredOrders.forEach((o) => {
      if (o.items_json) {
        try {
          const items: OrderItemDetail[] = JSON.parse(o.items_json)
          if (Array.isArray(items)) {
            items.forEach((it) => {
              const name = it.name || 'Unnamed Item'
              const cur = itemMap.get(name) || { name, qty: 0, salesMinor: 0 }
              const qty = it.quantity || 1
              const price = it.price_minor || Math.round((o.total_minor || 0) / Math.max(items.length, 1))
              cur.qty += qty
              cur.salesMinor += price * qty
              itemMap.set(name, cur)
            })
          }
        } catch {
          // ignore
        }
      }
    })

    return Array.from(itemMap.values())
      .sort((a, b) => b.qty - a.qty)
      .slice(0, 8)
  }, [filteredOrders])

  // Export CSV
  const handleExportCsv = () => {
    if (filteredOrders.length === 0) {
      alert('No orders to export.')
      return
    }

    const headers = ['Order Number', 'Date & Time', 'Terminal', 'Dining Type', 'Payment Status', 'Fulfillment', 'Subtotal (PHP)', '12% Tax (PHP)', 'Total (PHP)']
    const rows = filteredOrders.map((o) => [
      `#${o.order_number}`,
      new Date(o.placed_at).toLocaleString(),
      o.terminal_id,
      o.dining_type,
      o.payment_status,
      o.fulfillment_status,
      ((o.subtotal_minor || 0) / 100).toFixed(2),
      ((o.tax_minor || 0) / 100).toFixed(2),
      ((o.total_minor || 0) / 100).toFixed(2),
    ])

    const csvContent = 'data:text/csv;charset=utf-8,' + [headers.join(','), ...rows.map((e) => e.join(','))].join('\n')
    const encodedUri = encodeURI(csvContent)
    const link = document.createElement('a')
    link.setAttribute('href', encodedUri)
    const cleanBrand = brandName.replace(/[^a-zA-Z0-9]/g, '_')
    link.setAttribute('download', `${cleanBrand}_Sales_Report_${datePreset}_${new Date().toISOString().slice(0, 10)}.csv`)
    document.body.appendChild(link)
    link.click()
    document.body.removeChild(link)
  }

  // Print Daily Z-Reading Report
  const handlePrintReport = () => {
    const printWin = window.open('', '', 'width=700,height=900')
    if (!printWin) return

    const dateLabel = datePreset === 'today' ? 'Today' : datePreset === 'yesterday' ? 'Yesterday' : datePreset === 'week' ? 'Last 7 Days' : 'Custom Period'

    printWin.document.write(`
      <!DOCTYPE html>
      <html>
      <head>
        <title>${brandName} - Daily Sales Report / Z-Reading</title>
        <style>
          body { font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, monospace; margin: 2rem; color: #1c1917; font-size: 13px; }
          .header { text-align: center; border-bottom: 2px dashed #444; padding-bottom: 1rem; margin-bottom: 1rem; }
          .header h1 { margin: 0; font-size: 1.3rem; text-transform: uppercase; letter-spacing: 1px; }
          .header p { margin: 0.2rem 0; color: #666; font-size: 11px; }
          .section { margin-bottom: 1.2rem; }
          .section h3 { margin: 0 0 0.5rem; font-size: 11px; text-transform: uppercase; color: #888; border-bottom: 1px solid #ddd; padding-bottom: 3px; }
          .row { display: flex; justify-content: space-between; margin: 0.3rem 0; }
          .row.bold { font-weight: bold; font-size: 14px; border-top: 1px solid #111; padding-top: 0.4rem; }
          .table { width: 100%; border-collapse: collapse; margin-top: 0.5rem; }
          .table th, .table td { text-align: left; padding: 4px 0; font-size: 12px; }
          .table td.right, .table th.right { text-align: right; }
          .footer { text-align: center; font-size: 10px; color: #999; margin-top: 2rem; border-top: 1px dashed #bbb; padding-top: 0.8rem; }
        </style>
      </head>
      <body>
        <div class="header">
          <h1>${brandName}</h1>
          <p>Official Daily Sales & POS Audit Report</p>
          <p>Period: ${dateLabel} (${new Date().toLocaleDateString()})</p>
          <p>Generated: ${new Date().toLocaleString()}</p>
        </div>

        <div class="section">
          <h3>Executive Summary</h3>
          <div class="row"><span>Total Gross Collections:</span><strong>${formatMoney(stats.totalSalesMinor)}</strong></div>
          <div class="row"><span>Net Vatable Sales:</span><span>${formatMoney(stats.subtotalMinor)}</span></div>
          <div class="row"><span>12% Philippine Output VAT:</span><span>${formatMoney(stats.taxMinor)}</span></div>
          <div class="row"><span>Total Receipts / Orders:</span><span>${stats.totalOrders} Orders</span></div>
          <div class="row"><span>Average Ticket (AOV):</span><span>${formatMoney(stats.avgOrderValueMinor)}</span></div>
          <div class="row"><span>Total Items Served:</span><span>${stats.totalItems} Items</span></div>
          <div class="row"><span>Dining Split:</span><span>${stats.dineInCount} Dine In / ${stats.takeoutCount} Takeout</span></div>
        </div>

        <div class="section">
          <h3>Payment Tenders</h3>
          ${paymentBreakdown.map((p) => `
            <div class="row"><span>${p.method} (${p.count} orders):</span><span>${formatMoney(p.totalMinor)}</span></div>
          `).join('')}
          <div class="row bold"><span>Total Collections Due:</span><span>${formatMoney(stats.totalSalesMinor)}</span></div>
        </div>

        <div class="section">
          <h3>Top 5 Selling Items</h3>
          <table class="table">
            <thead><tr><th>Item</th><th class="right">Qty</th><th class="right">Total</th></tr></thead>
            <tbody>
              ${topProducts.slice(0, 5).map((p) => `
                <tr><td>${p.name}</td><td class="right">${p.qty}x</td><td class="right">${formatMoney(p.salesMinor)}</td></tr>
              `).join('')}
            </tbody>
          </table>
        </div>

        <div class="footer">
          <p>*** END OF SALES REPORT ***</p>
          <p>Kiosk Administrator System Audit Log</p>
        </div>

        <script>
          window.onload = function() { window.print(); }
        </script>
      </body>
      </html>
    `)
    printWin.document.close()
  }

  return (
    <AdminShell
      title="Sales & Operations Reports"
      eyebrow="BUSINESS INSIGHTS"
      action={
        <div style={{ display: 'flex', gap: '0.6rem' }}>
          <button
            onClick={handleExportCsv}
            style={{
              display: 'inline-flex',
              alignItems: 'center',
              gap: '0.4rem',
              padding: '0.45rem 0.9rem',
              borderRadius: '0.5rem',
              fontSize: '0.8rem',
              fontWeight: 600,
              background: '#fff',
              border: '1px solid #e7e5e4',
              color: '#44403c',
              cursor: 'pointer',
              boxShadow: '0 1px 2px rgba(0,0,0,0.04)',
            }}
          >
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/><polyline points="7 10 12 15 17 10"/><line x1="12" y1="15" x2="12" y2="3"/></svg>
            Export CSV
          </button>
          <button
            onClick={handlePrintReport}
            style={{
              display: 'inline-flex',
              alignItems: 'center',
              gap: '0.4rem',
              padding: '0.45rem 0.9rem',
              borderRadius: '0.5rem',
              fontSize: '0.8rem',
              fontWeight: 600,
              background: '#ea580c',
              border: '1px solid #c2410c',
              color: '#fff',
              cursor: 'pointer',
              boxShadow: '0 1px 3px rgba(234,88,12,0.25)',
            }}
          >
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><polyline points="6 9 6 2 18 2 18 9"/><path d="M6 18H4a2 2 0 0 1-2-2v-5a2 2 0 0 1 2-2h16a2 2 0 0 1 2 2v5a2 2 0 0 1-2 2h-2"/><rect x="6" y="14" width="12" height="8"/></svg>
            Print Z-Reading
          </button>
        </div>
      }
    >
      {/* Filters Toolbar */}
      <section
        style={{
          background: '#fff',
          border: '1px solid #f0e8e2',
          borderRadius: '0.75rem',
          padding: '0.85rem 1.1rem',
          marginBottom: '1.25rem',
          display: 'flex',
          flexWrap: 'wrap',
          alignItems: 'center',
          justifyContent: 'space-between',
          gap: '0.85rem',
          boxShadow: '0 1px 4px rgba(0,0,0,0.02)',
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.4rem', flexWrap: 'wrap' }}>
          <span style={{ fontSize: '0.75rem', fontWeight: 700, color: '#78716c', letterSpacing: '0.05em', marginRight: '0.2rem' }}>
            PERIOD:
          </span>
          {(['today', 'yesterday', 'week', 'month', 'all', 'custom'] as const).map((preset) => (
            <button
              key={preset}
              onClick={() => setDatePreset(preset)}
              style={{
                padding: '0.35rem 0.75rem',
                borderRadius: '0.45rem',
                fontSize: '0.78rem',
                fontWeight: 600,
                cursor: 'pointer',
                background: datePreset === preset ? '#ea580c' : '#f5f5f4',
                color: datePreset === preset ? '#fff' : '#57534e',
                border: 'none',
                transition: 'all 0.15s ease',
              }}
            >
              {preset === 'today' ? 'Today' : preset === 'yesterday' ? 'Yesterday' : preset === 'week' ? '7 Days' : preset === 'month' ? 'This Month' : preset === 'all' ? 'All Time' : 'Custom'}
            </button>
          ))}

          {datePreset === 'custom' && (
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.35rem', marginLeft: '0.5rem' }}>
              <input
                type="date"
                value={customFrom}
                onChange={(e) => setCustomFrom(e.target.value)}
                style={{ padding: '0.3rem 0.5rem', borderRadius: '0.4rem', border: '1px solid #d6d3d1', fontSize: '0.75rem' }}
              />
              <span style={{ fontSize: '0.75rem', color: '#78716c' }}>to</span>
              <input
                type="date"
                value={customTo}
                onChange={(e) => setCustomTo(e.target.value)}
                style={{ padding: '0.3rem 0.5rem', borderRadius: '0.4rem', border: '1px solid #d6d3d1', fontSize: '0.75rem' }}
              />
            </div>
          )}
        </div>

        <div style={{ display: 'flex', alignItems: 'center', gap: '0.65rem', flexWrap: 'wrap' }}>
          <select
            value={selectedTerminal}
            onChange={(e) => setSelectedTerminal(e.target.value)}
            style={{
              padding: '0.35rem 0.65rem',
              borderRadius: '0.45rem',
              border: '1px solid #e7e5e4',
              fontSize: '0.78rem',
              background: '#fafaf9',
              color: '#44403c',
              cursor: 'pointer',
            }}
          >
            <option value="all">All Terminals</option>
            {terminals.map((t) => (
              <option key={t} value={t}>
                {t}
              </option>
            ))}
          </select>

          <select
            value={selectedDiningType}
            onChange={(e) => setSelectedDiningType(e.target.value)}
            style={{
              padding: '0.35rem 0.65rem',
              borderRadius: '0.45rem',
              border: '1px solid #e7e5e4',
              fontSize: '0.78rem',
              background: '#fafaf9',
              color: '#44403c',
              cursor: 'pointer',
            }}
          >
            <option value="all">All Dining Types</option>
            <option value="dine-in">Dine In</option>
            <option value="takeout">Takeout</option>
          </select>
        </div>
      </section>

      {error ? (
        <div className="admin-state">{error}</div>
      ) : loading ? (
        <div className="admin-state">Loading sales insights and order history...</div>
      ) : (
        <>
          {/* KPI Stat Cards */}
          <section className="metric-grid" style={{ marginBottom: '1.25rem' }}>
            <article>
              <span>Gross Sales</span>
              <strong>{formatMoney(stats.totalSalesMinor)}</strong>
              <small>{stats.totalOrders} paid receipts in period</small>
            </article>

            <article>
              <span>Total Orders</span>
              <strong>{stats.totalOrders}</strong>
              <small>
                {stats.dineInCount} Dine In · {stats.takeoutCount} Takeout
              </small>
            </article>

            <article>
              <span>Average Order Value</span>
              <strong>{formatMoney(stats.avgOrderValueMinor)}</strong>
              <small>Per customer basket</small>
            </article>

            <article>
              <span>12% Output VAT</span>
              <strong>{formatMoney(stats.taxMinor)}</strong>
              <small>Net vatable: {formatMoney(stats.subtotalMinor)}</small>
            </article>
          </section>

          {/* Grid Split: Hourly Activity & Payment Tenders */}
          <section style={{ display: 'grid', gridTemplateColumns: '1.6fr 1fr', gap: '1.25rem', marginBottom: '1.25rem' }}>
            {/* Hourly Peak Activity */}
            <article className="admin-panel" style={{ padding: '1.25rem' }}>
              <div className="admin-panel__heading" style={{ marginBottom: '1rem' }}>
                <div>
                  <p>STORE RUSH TIMELINE</p>
                  <h2 style={{ fontSize: '1.05rem', margin: '0.15rem 0' }}>Hourly Sales Activity</h2>
                </div>
                {hourlyActivity.peakHour && hourlyActivity.peakHour.orders > 0 && (
                  <span
                    style={{
                      background: '#fff7ed',
                      color: '#ea580c',
                      border: '1px solid #fed7aa',
                      borderRadius: '0.4rem',
                      fontSize: '0.72rem',
                      fontWeight: 700,
                      padding: '0.2rem 0.5rem',
                    }}
                  >
                    🔥 Peak: {hourlyActivity.peakHour.label} ({formatMoney(hourlyActivity.peakHour.salesMinor)})
                  </span>
                )}
              </div>

              <div style={{ display: 'flex', flexDirection: 'column', gap: '0.45rem', marginTop: '0.75rem' }}>
                {hourlyActivity.data.map((h) => {
                  const barWidth = (h.salesMinor / hourlyActivity.maxSales) * 100
                  return (
                    <div key={h.hour} style={{ display: 'grid', gridTemplateColumns: '4rem 1fr 5rem', alignItems: 'center', gap: '0.65rem' }}>
                      <span style={{ fontSize: '0.72rem', color: '#78716c', fontWeight: 600 }}>{h.label}</span>
                      <div style={{ background: '#f5f5f4', borderRadius: '4px', height: '14px', width: '100%', overflow: 'hidden' }}>
                        <div
                          style={{
                            width: `${Math.max(barWidth, h.orders > 0 ? 3 : 0)}%`,
                            height: '100%',
                            background: h.orders > 0 ? '#ea580c' : 'transparent',
                            borderRadius: '4px',
                            transition: 'width 0.3s ease',
                          }}
                        />
                      </div>
                      <span style={{ fontSize: '0.72rem', color: '#292524', textAlign: 'right', fontWeight: 600 }}>
                        {h.orders > 0 ? formatMoney(h.salesMinor) : '—'}
                      </span>
                    </div>
                  )
                })}
              </div>
            </article>

            {/* Payment Tenders & VAT Summary */}
            <article className="admin-panel" style={{ padding: '1.25rem', display: 'flex', flexDirection: 'column', justifyContent: 'space-between' }}>
              <div>
                <div className="admin-panel__heading" style={{ marginBottom: '1rem' }}>
                  <div>
                    <p>COLLECTIONS & TAX</p>
                    <h2 style={{ fontSize: '1.05rem', margin: '0.15rem 0' }}>Payment Breakdown</h2>
                  </div>
                </div>

                <div style={{ display: 'flex', flexDirection: 'column', gap: '0.65rem', marginBottom: '1.25rem' }}>
                  {paymentBreakdown.length === 0 ? (
                    <div style={{ color: '#a8a29e', fontSize: '0.8rem', padding: '1rem 0' }}>No transactions in this period.</div>
                  ) : (
                    paymentBreakdown.map((p) => (
                      <div
                        key={p.method}
                        style={{
                          display: 'flex',
                          justifyContent: 'space-between',
                          alignItems: 'center',
                          padding: '0.65rem 0.85rem',
                          background: '#fafaf9',
                          borderRadius: '0.5rem',
                          border: '1px solid #f5f5f4',
                        }}
                      >
                        <div>
                          <strong style={{ fontSize: '0.82rem', color: '#1c1917' }}>{p.method}</strong>
                          <small style={{ display: 'block', color: '#78716c', fontSize: '0.7rem' }}>
                            {p.count} orders ({p.percent.toFixed(1)}%)
                          </small>
                        </div>
                        <strong style={{ fontSize: '0.88rem', color: '#ea580c' }}>{formatMoney(p.totalMinor)}</strong>
                      </div>
                    ))
                  )}
                </div>
              </div>

              {/* Philippine VAT Card */}
              <div
                style={{
                  background: '#fff7ed',
                  border: '1px solid #fed7aa',
                  borderRadius: '0.6rem',
                  padding: '0.85rem 1rem',
                  fontSize: '0.78rem',
                }}
              >
                <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '0.3rem', color: '#7c2d12' }}>
                  <span>Vatable Sales (Net):</span>
                  <strong>{formatMoney(stats.subtotalMinor)}</strong>
                </div>
                <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '0.3rem', color: '#7c2d12' }}>
                  <span>12% Output VAT:</span>
                  <strong>{formatMoney(stats.taxMinor)}</strong>
                </div>
                <div
                  style={{
                    display: 'flex',
                    justifyContent: 'space-between',
                    paddingTop: '0.35rem',
                    borderTop: '1px solid #fdba74',
                    fontWeight: 800,
                    color: '#9a3412',
                    fontSize: '0.86rem',
                  }}
                >
                  <span>Total Gross Due:</span>
                  <span>{formatMoney(stats.totalSalesMinor)}</span>
                </div>
              </div>
            </article>
          </section>

          {/* Top Selling Products Performance */}
          <section className="admin-panel" style={{ padding: '1.25rem', marginBottom: '1.25rem' }}>
            <div className="admin-panel__heading" style={{ marginBottom: '1rem' }}>
              <div>
                <p>PRODUCT RANKING</p>
                <h2 style={{ fontSize: '1.05rem', margin: '0.15rem 0' }}>Top Performing Menu Items</h2>
              </div>
              <small style={{ color: '#78716c' }}>Ranked by total quantity sold</small>
            </div>

            {topProducts.length === 0 ? (
              <div style={{ color: '#a8a29e', fontSize: '0.8rem', padding: '1.5rem', textAlign: 'center' }}>No item-level data available for this range.</div>
            ) : (
              <div className="admin-table-wrap">
                <table className="admin-table">
                  <thead>
                    <tr>
                      <th style={{ width: '3rem' }}>Rank</th>
                      <th>Menu Item</th>
                      <th style={{ textAlign: 'center' }}>Units Sold</th>
                      <th style={{ textAlign: 'right' }}>Total Revenue</th>
                      <th style={{ textAlign: 'right' }}>Share of Food Sales</th>
                    </tr>
                  </thead>
                  <tbody>
                    {topProducts.map((p, idx) => {
                      const share = stats.totalSalesMinor > 0 ? (p.salesMinor / stats.totalSalesMinor) * 100 : 0
                      return (
                        <tr key={p.name}>
                          <td>
                            <span
                              style={{
                                display: 'inline-flex',
                                width: '1.5rem',
                                height: '1.5rem',
                                borderRadius: '50%',
                                background: idx === 0 ? '#ea580c' : idx === 1 ? '#f97316' : idx === 2 ? '#fb923c' : '#f5f5f4',
                                color: idx < 3 ? '#fff' : '#78716c',
                                alignItems: 'center',
                                justifyContent: 'center',
                                fontSize: '0.72rem',
                                fontWeight: 800,
                              }}
                            >
                              {idx + 1}
                            </span>
                          </td>
                          <td>
                            <strong>{p.name}</strong>
                          </td>
                          <td style={{ textAlign: 'center' }}>
                            <span style={{ fontWeight: 700, color: '#1c1917' }}>{p.qty}x</span>
                          </td>
                          <td style={{ textAlign: 'right' }}>
                            <strong>{formatMoney(p.salesMinor)}</strong>
                          </td>
                          <td style={{ textAlign: 'right' }}>
                            <span style={{ color: '#78716c', fontSize: '0.78rem' }}>{share.toFixed(1)}%</span>
                          </td>
                        </tr>
                      )
                    })}
                  </tbody>
                </table>
              </div>
            )}
          </section>

          {/* Itemized Orders Audit Table */}
          <section className="admin-panel" style={{ padding: '1.25rem' }}>
            <div
              className="admin-panel__heading"
              style={{
                marginBottom: '1rem',
                display: 'flex',
                justifyContent: 'space-between',
                alignItems: 'center',
                flexWrap: 'wrap',
                gap: '0.75rem',
              }}
            >
              <div>
                <p>TRANSACTION LOG</p>
                <h2 style={{ fontSize: '1.05rem', margin: '0.15rem 0' }}>Itemized Orders Audit</h2>
              </div>
              <input
                type="search"
                placeholder="Search order # or item..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                style={{
                  padding: '0.35rem 0.75rem',
                  borderRadius: '0.45rem',
                  border: '1px solid #d6d3d1',
                  fontSize: '0.78rem',
                  width: '14rem',
                }}
              />
            </div>

            {filteredOrders.length === 0 ? (
              <div style={{ color: '#a8a29e', fontSize: '0.8rem', padding: '2rem', textAlign: 'center' }}>No matching orders found.</div>
            ) : (
              <div className="admin-table-wrap">
                <table className="admin-table">
                  <thead>
                    <tr>
                      <th>Order #</th>
                      <th>Time</th>
                      <th>Terminal</th>
                      <th>Service</th>
                      <th>Payment</th>
                      <th>Subtotal</th>
                      <th>12% Tax</th>
                      <th>Total</th>
                      <th>Status</th>
                    </tr>
                  </thead>
                  <tbody>
                    {filteredOrders.map((o) => (
                      <tr key={o.id}>
                        <td>
                          <strong>#{o.order_number}</strong>
                        </td>
                        <td>{new Date(o.placed_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</td>
                        <td>{o.terminal_id}</td>
                        <td>
                          <span
                            style={{
                              display: 'inline-block',
                              padding: '0.15rem 0.45rem',
                              borderRadius: '0.3rem',
                              fontSize: '0.68rem',
                              fontWeight: 700,
                              background: o.dining_type?.toLowerCase().includes('dine') ? '#eff6ff' : '#fdf2f8',
                              color: o.dining_type?.toLowerCase().includes('dine') ? '#1d4ed8' : '#be185d',
                            }}
                          >
                            {o.dining_type}
                          </span>
                        </td>
                        <td>
                          <span style={{ fontSize: '0.75rem', color: o.payment_status === 'paid' ? '#15803d' : '#854d0e', fontWeight: 600 }}>
                            {o.payment_status === 'paid' ? 'Paid (Card/Digital)' : 'Counter Cash'}
                          </span>
                        </td>
                        <td>{formatMoney(o.subtotal_minor || 0)}</td>
                        <td>{formatMoney(o.tax_minor || 0)}</td>
                        <td>
                          <strong style={{ color: '#1c1917' }}>{formatMoney(o.total_minor || 0)}</strong>
                        </td>
                        <td>
                          <span className={`status status--${o.fulfillment_status}`}>{o.fulfillment_status}</span>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </section>
        </>
      )}
    </AdminShell>
  )
}
