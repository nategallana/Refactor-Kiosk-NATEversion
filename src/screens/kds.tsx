import { useState, useEffect, useMemo, useRef } from 'react'
import { sounds } from '../domain/sound'

interface OrderItem {
  name: string
  quantity: number
  note?: string
  selections?: Array<{ groupName: string; valueName: string }>
}

interface KdsOrder {
  id: number
  order_number: string
  terminal_id: string
  dining_type: string
  fulfillment_status: 'pending' | 'preparing' | 'ready' | 'completed' | 'cancelled'
  placed_at: string
  items_json?: string
  total_minor: number
}

const apiBase = import.meta.env.VITE_API_BASE_URL || `${window.location.protocol}//${window.location.hostname}:8000/api/v1`

export function KdsScreen() {
  const [orders, setOrders] = useState<KdsOrder[]>([])
  const [audioEnabled, setAudioEnabled] = useState(true)
  const [filter, setFilter] = useState<'all' | 'dine-in' | 'takeout'>('all')
  const [clock, setClock] = useState(() => new Date())
  const previousPendingIdsRef = useRef<Set<number>>(new Set())

  // Live clock
  useEffect(() => {
    const timer = setInterval(() => setClock(new Date()), 1000)
    return () => clearInterval(timer)
  }, [])

  // Poll orders every 4 seconds
  useEffect(() => {
    let active = true

    const fetchOrders = async () => {
      try {
        const token = localStorage.getItem('kiosk_admin_token') || ''
        const url = token ? `${apiBase}/admin/orders` : `${apiBase}/orders`
        const res = await fetch(url, {
          headers: token ? { Authorization: `Bearer ${token}` } : {},
        })
        if (!res.ok) return
        const data = await res.json()
        const fetched: KdsOrder[] = data.orders || []

        if (!active) return

        // Audio chime if new pending orders arrived
        const currentPendingIds = new Set(fetched.filter(o => o.fulfillment_status === 'pending').map(o => o.id))
        const hasNewPending = Array.from(currentPendingIds).some(id => !previousPendingIdsRef.current.has(id))
        
        if (hasNewPending && previousPendingIdsRef.current.size > 0 && audioEnabled) {
          sounds.playOrderAlert()
        }
        previousPendingIdsRef.current = currentPendingIds

        setOrders(fetched)
      } catch {
        // network retry on next interval
      }
    }

    fetchOrders()
    const interval = setInterval(fetchOrders, 4000)
    return () => {
      active = false
      clearInterval(interval)
    }
  }, [audioEnabled])

  // Status transition handler
  const advanceStatus = async (orderId: number, nextStatus: 'preparing' | 'ready' | 'completed') => {
    sounds.playTap()
    // Optimistic UI update
    setOrders(prev => prev.map(o => o.id === orderId ? { ...o, fulfillment_status: nextStatus } : o))

    try {
      const token = localStorage.getItem('kiosk_admin_token') || ''
      const url = token ? `${apiBase}/admin/orders/${orderId}/status` : `${apiBase}/orders/${orderId}/status`
      await fetch(url, {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
          ...(token ? { Authorization: `Bearer ${token}` } : {}),
        },
        body: JSON.stringify({ status: nextStatus }),
      })
      if (nextStatus === 'ready' && audioEnabled) {
        sounds.playAddToCart()
      } else if (nextStatus === 'completed' && audioEnabled) {
        sounds.playOrderSuccess()
      }
    } catch (err) {
      console.error('Failed to update status', err)
    }
  }

  // Filter orders
  const filtered = useMemo(() => {
    return orders.filter(o => {
      if (filter === 'all') return true
      return o.dining_type.toLowerCase() === filter
    })
  }, [orders, filter])

  const pending = filtered.filter(o => o.fulfillment_status === 'pending')
  const preparing = filtered.filter(o => o.fulfillment_status === 'preparing')
  const ready = filtered.filter(o => o.fulfillment_status === 'ready')
  const completed = filtered.filter(o => o.fulfillment_status === 'completed').slice(0, 5)

  return (
    <div style={{
      minHeight: '100vh',
      backgroundColor: '#0f172a',
      color: '#f8fafc',
      fontFamily: 'Inter, system-ui, sans-serif',
      padding: '1.25rem',
      boxSizing: 'border-box',
    }}>
      {/* KDS Header */}
      <header style={{
        display: 'flex',
        flexWrap: 'wrap',
        justifyContent: 'space-between',
        alignItems: 'center',
        paddingBottom: '1rem',
        borderBottom: '1px solid #334155',
        marginBottom: '1.25rem',
        gap: '1rem',
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
          <div style={{
            background: 'linear-gradient(135deg, #ea580c, #c2410c)',
            color: '#fff',
            fontWeight: 800,
            padding: '0.4rem 0.8rem',
            borderRadius: '0.5rem',
            fontSize: '1.1rem',
            letterSpacing: '0.05em',
          }}>
            KDS KITCHEN
          </div>
          <span style={{ fontSize: '1.25rem', fontWeight: 700, color: '#e2e8f0' }}>
            {clock.toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit', second: '2-digit' })}
          </span>
          <span style={{ color: '#94a3b8', fontSize: '0.875rem' }}>
            Active: <strong style={{ color: '#f97316' }}>{pending.length + preparing.length}</strong>
          </span>
        </div>

        {/* Tools & Filter */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
          <div style={{ display: 'flex', background: '#1e293b', borderRadius: '0.5rem', padding: '0.2rem' }}>
            {(['all', 'dine-in', 'takeout'] as const).map(mode => (
              <button
                key={mode}
                onClick={() => { sounds.playTap(); setFilter(mode) }}
                style={{
                  background: filter === mode ? '#ea580c' : 'transparent',
                  color: filter === mode ? '#fff' : '#94a3b8',
                  border: 'none',
                  padding: '0.4rem 0.8rem',
                  borderRadius: '0.375rem',
                  fontWeight: 600,
                  fontSize: '0.85rem',
                  cursor: 'pointer',
                  textTransform: 'capitalize',
                }}
              >
                {mode === 'all' ? 'All Orders' : mode === 'dine-in' ? '🍽️ Dine In' : '🥡 Takeout'}
              </button>
            ))}
          </div>

          <button
            onClick={() => setAudioEnabled(v => !v)}
            style={{
              background: audioEnabled ? '#166534' : '#334155',
              color: audioEnabled ? '#4ade80' : '#94a3b8',
              border: 'none',
              padding: '0.5rem 0.9rem',
              borderRadius: '0.5rem',
              fontSize: '0.85rem',
              fontWeight: 600,
              cursor: 'pointer',
            }}
          >
            {audioEnabled ? '🔔 Audio ON' : '🔕 Audio Muted'}
          </button>

          <button
            onClick={() => window.location.href = '/admin/orders'}
            style={{
              background: '#334155',
              color: '#cbd5e1',
              border: 'none',
              padding: '0.5rem 0.9rem',
              borderRadius: '0.5rem',
              fontSize: '0.85rem',
              cursor: 'pointer',
            }}
          >
            Admin ↗
          </button>
        </div>
      </header>

      {/* Columns Board */}
      <div style={{
        display: 'grid',
        gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))',
        gap: '1.25rem',
        alignItems: 'start',
      }}>
        {/* Column 1: New Orders */}
        <KdsColumn title="NEW ORDERS" count={pending.length} accent="#ef4444">
          {pending.length === 0 ? (
            <EmptyColumn text="No pending orders in queue." />
          ) : (
            pending.map(order => (
              <KdsTicket
                key={order.id}
                order={order}
                actionLabel="👨‍🍳 Start Cooking"
                actionColor="#ea580c"
                onAction={() => advanceStatus(order.id, 'preparing')}
              />
            ))
          )}
        </KdsColumn>

        {/* Column 2: In Kitchen / Preparing */}
        <KdsColumn title="COOKING" count={preparing.length} accent="#f59e0b">
          {preparing.length === 0 ? (
            <EmptyColumn text="No orders currently on the grill." />
          ) : (
            preparing.map(order => (
              <KdsTicket
                key={order.id}
                order={order}
                actionLabel="🔔 Order Ready"
                actionColor="#16a34a"
                onAction={() => advanceStatus(order.id, 'ready')}
              />
            ))
          )}
        </KdsColumn>

        {/* Column 3: Ready for Pickup */}
        <KdsColumn title="READY FOR PICKUP" count={ready.length} accent="#22c55e">
          {ready.length === 0 ? (
            <EmptyColumn text="No orders waiting for customer pickup." />
          ) : (
            ready.map(order => (
              <KdsTicket
                key={order.id}
                order={order}
                actionLabel="✓ Bump / Complete"
                actionColor="#0284c7"
                onAction={() => advanceStatus(order.id, 'completed')}
              />
            ))
          )}
        </KdsColumn>

        {/* Column 4: Completed History */}
        <KdsColumn title="RECENT COMPLETED" count={completed.length} accent="#64748b">
          {completed.length === 0 ? (
            <EmptyColumn text="Completed tickets appear here." />
          ) : (
            completed.map(order => (
              <div
                key={order.id}
                style={{
                  background: '#1e293b',
                  borderRadius: '0.5rem',
                  padding: '0.75rem',
                  marginBottom: '0.75rem',
                  opacity: 0.65,
                }}
              >
                <div style={{ display: 'flex', justifyContent: 'space-between', fontWeight: 700, fontSize: '0.95rem' }}>
                  <span>{order.order_number}</span>
                  <span style={{ color: '#22c55e' }}>✓ Completed</span>
                </div>
                <div style={{ fontSize: '0.75rem', color: '#94a3b8', marginTop: '0.2rem' }}>
                  {order.placed_at ? new Date(order.placed_at.replace(' ', 'T')).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) : ''}
                </div>
              </div>
            ))
          )}
        </KdsColumn>
      </div>
    </div>
  )
}

function KdsColumn({ title, count, accent, children }: { title: string; count: number; accent: string; children: React.ReactNode }) {
  return (
    <div style={{
      background: '#1e293b',
      borderRadius: '0.75rem',
      padding: '1rem',
      minHeight: '75vh',
      display: 'flex',
      flexDirection: 'column',
    }}>
      <div style={{
        display: 'flex',
        justifyContent: 'space-between',
        alignItems: 'center',
        paddingBottom: '0.75rem',
        borderBottom: `2px solid ${accent}`,
        marginBottom: '1rem',
      }}>
        <h2 style={{ fontSize: '1rem', fontWeight: 800, margin: 0, letterSpacing: '0.05em', color: '#f1f5f9' }}>
          {title}
        </h2>
        <span style={{
          background: accent,
          color: '#fff',
          fontWeight: 800,
          borderRadius: '9999px',
          padding: '0.15rem 0.6rem',
          fontSize: '0.85rem',
        }}>
          {count}
        </span>
      </div>
      <div style={{ flex: 1 }}>{children}</div>
    </div>
  )
}

function KdsTicket({
  order,
  actionLabel,
  actionColor,
  onAction,
}: {
  order: KdsOrder
  actionLabel: string
  actionColor: string
  onAction: () => void
}) {
  const [elapsed, setElapsed] = useState('')
  const [isLate, setIsLate] = useState(false)

  // Parse items
  const items: OrderItem[] = useMemo(() => {
    try {
      return order.items_json ? JSON.parse(order.items_json) : []
    } catch {
      return []
    }
  }, [order.items_json])

  // Timer counter
  useEffect(() => {
    const updateTime = () => {
      const placedMs = new Date(order.placed_at.replace(' ', 'T') + '+08:00').getTime()
      if (isNaN(placedMs)) return
      const diffSecs = Math.max(0, Math.floor((Date.now() - placedMs) / 1000))
      const m = Math.floor(diffSecs / 60)
      const s = diffSecs % 60
      setElapsed(`${m}m ${s}s`)
      setIsLate(m >= 10)
    }

    updateTime()
    const timer = setInterval(updateTime, 1000)
    return () => clearInterval(timer)
  }, [order.placed_at])

  const isDineIn = order.dining_type.toLowerCase() === 'dine-in'

  return (
    <div style={{
      background: '#0f172a',
      border: isLate ? '2px solid #ef4444' : '1px solid #334155',
      borderRadius: '0.625rem',
      padding: '0.9rem',
      marginBottom: '1rem',
      boxShadow: '0 4px 6px -1px rgba(0, 0, 0, 0.4)',
    }}>
      {/* Card Header */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '0.5rem' }}>
        <div>
          <div style={{ fontSize: '1.25rem', fontWeight: 800, color: '#f8fafc', letterSpacing: '-0.02em' }}>
            {order.order_number}
          </div>
          <span style={{
            display: 'inline-block',
            fontSize: '0.75rem',
            fontWeight: 700,
            padding: '0.15rem 0.5rem',
            borderRadius: '0.25rem',
            marginTop: '0.2rem',
            background: isDineIn ? '#1e3a8a' : '#78350f',
            color: isDineIn ? '#93c5fd' : '#fde68a',
          }}>
            {isDineIn ? '🍽️ DINE IN' : '🥡 TAKEOUT'}
          </span>
        </div>

        {/* Elapsed Timer */}
        <div style={{
          textAlign: 'right',
          fontSize: '0.85rem',
          fontWeight: 700,
          color: isLate ? '#f87171' : '#38bdf8',
          background: isLate ? 'rgba(239, 68, 68, 0.15)' : 'rgba(56, 189, 248, 0.1)',
          padding: '0.2rem 0.5rem',
          borderRadius: '0.375rem',
        }}>
          ⏱️ {elapsed || 'Just now'}
        </div>
      </div>

      {/* Items List */}
      <div style={{ borderTop: '1px dashed #334155', paddingTop: '0.6rem', marginBottom: '0.8rem' }}>
        {items.length === 0 ? (
          <span style={{ fontSize: '0.85rem', color: '#94a3b8' }}>Order items details...</span>
        ) : (
          items.map((item, i) => (
            <div key={i} style={{ marginBottom: '0.4rem', fontSize: '0.95rem' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                <span style={{ fontWeight: 700, color: '#f1f5f9' }}>
                  <strong style={{ color: '#f97316', marginRight: '0.3rem' }}>{item.quantity}×</strong>
                  {item.name}
                </span>
              </div>
              {item.selections && item.selections.length > 0 && (
                <div style={{ fontSize: '0.8rem', color: '#94a3b8', paddingLeft: '1.4rem' }}>
                  {item.selections.map(s => s.valueName).join(', ')}
                </div>
              )}
              {item.note && (
                <div style={{ fontSize: '0.8rem', color: '#facc15', paddingLeft: '1.4rem', fontStyle: 'italic' }}>
                  Note: {item.note}
                </div>
              )}
            </div>
          ))
        )}
      </div>

      {/* Action CTA */}
      <button
        onClick={onAction}
        style={{
          width: '100%',
          background: actionColor,
          color: '#ffffff',
          border: 'none',
          borderRadius: '0.5rem',
          padding: '0.75rem',
          fontWeight: 700,
          fontSize: '1rem',
          cursor: 'pointer',
          boxShadow: '0 2px 4px rgba(0,0,0,0.2)',
          transition: 'transform 0.1s, opacity 0.1s',
        }}
        onMouseDown={e => e.currentTarget.style.transform = 'scale(0.98)'}
        onMouseUp={e => e.currentTarget.style.transform = 'scale(1)'}
      >
        {actionLabel}
      </button>
    </div>
  )
}

function EmptyColumn({ text }: { text: string }) {
  return (
    <div style={{
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      height: '140px',
      color: '#64748b',
      fontSize: '0.875rem',
      textAlign: 'center',
      border: '1px dashed #334155',
      borderRadius: '0.5rem',
      padding: '1rem',
    }}>
      {text}
    </div>
  )
}
