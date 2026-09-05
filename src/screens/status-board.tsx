import { useState, useEffect, useRef } from 'react'
import { sounds } from '../domain/sound'

interface BoardOrder {
  id: number
  order_number: string
  fulfillment_status: 'pending' | 'preparing' | 'ready' | 'completed' | 'cancelled'
  dining_type: string
}

const apiBase = import.meta.env.VITE_API_BASE_URL || `${window.location.protocol}//${window.location.hostname}:8000/api/v1`

export function StatusBoardScreen() {
  const [orders, setOrders] = useState<BoardOrder[]>([])
  const [clock, setClock] = useState(() => new Date())
  const [audioEnabled, setAudioEnabled] = useState(true)
  const previousReadyIdsRef = useRef<Set<number>>(new Set())

  // Clock
  useEffect(() => {
    const timer = setInterval(() => setClock(new Date()), 1000)
    return () => clearInterval(timer)
  }, [])

  // Poll orders
  useEffect(() => {
    let active = true

    const fetchBoard = async () => {
      try {
        const token = localStorage.getItem('kiosk_admin_token') || ''
        const url = token ? `${apiBase}/admin/orders` : `${apiBase}/orders`
        const res = await fetch(url, {
          headers: token ? { Authorization: `Bearer ${token}` } : {},
        })
        if (!res.ok) return
        const data = await res.json()
        const fetched: BoardOrder[] = data.orders || []

        if (!active) return

        // Check if new order transitioned to ready
        const currentReadyIds = new Set(fetched.filter(o => o.fulfillment_status === 'ready').map(o => o.id))
        const hasNewReady = Array.from(currentReadyIds).some(id => !previousReadyIdsRef.current.has(id))
        
        if (hasNewReady && previousReadyIdsRef.current.size > 0 && audioEnabled) {
          sounds.playOrderAlert()
        }
        previousReadyIdsRef.current = currentReadyIds

        setOrders(fetched)
      } catch {}
    }

    fetchBoard()
    const interval = setInterval(fetchBoard, 4000)
    return () => {
      active = false
      clearInterval(interval)
    }
  }, [audioEnabled])

  const preparing = orders.filter(o => o.fulfillment_status === 'pending' || o.fulfillment_status === 'preparing')
  const ready = orders.filter(o => o.fulfillment_status === 'ready')

  return (
    <div style={{
      minHeight: '100vh',
      backgroundColor: '#090d16',
      color: '#f8fafc',
      fontFamily: 'Inter, system-ui, sans-serif',
      display: 'flex',
      flexDirection: 'column',
      boxSizing: 'border-box',
    }}>
      {/* Board Top Header */}
      <header style={{
        background: '#0f172a',
        borderBottom: '2px solid #ea580c',
        padding: '1.25rem 2.5rem',
        display: 'flex',
        justifyContent: 'space-between',
        alignItems: 'center',
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '1.25rem' }}>
          <div style={{
            background: 'linear-gradient(135deg, #ea580c, #c2410c)',
            color: '#fff',
            fontWeight: 900,
            padding: '0.4rem 1rem',
            borderRadius: '0.5rem',
            fontSize: '1.4rem',
            letterSpacing: '0.05em',
          }}>
            ORDER STATUS
          </div>
          <span style={{ fontSize: '1.1rem', color: '#94a3b8', fontWeight: 600 }}>
            Please watch for your call number
          </span>
        </div>

        <div style={{ display: 'flex', alignItems: 'center', gap: '1.5rem' }}>
          <button
            onClick={() => setAudioEnabled(v => !v)}
            style={{
              background: audioEnabled ? '#14532d' : '#334155',
              color: audioEnabled ? '#4ade80' : '#94a3b8',
              border: 'none',
              borderRadius: '0.375rem',
              padding: '0.3rem 0.6rem',
              fontSize: '0.8rem',
              cursor: 'pointer',
            }}
          >
            {audioEnabled ? '🔔 Chime' : '🔕 Muted'}
          </button>
          <div style={{ fontSize: '1.5rem', fontWeight: 800, color: '#f1f5f9' }}>
            {clock.toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit', second: '2-digit' })}
          </div>
        </div>
      </header>

      {/* Main Display Grid */}
      <main style={{
        flex: 1,
        display: 'grid',
        gridTemplateColumns: '1fr 1fr',
        gap: '2rem',
        padding: '2rem',
        boxSizing: 'border-box',
      }}>
        {/* Left Column: Preparing */}
        <section style={{
          background: '#0f172a',
          borderRadius: '1rem',
          border: '1px solid #1e293b',
          display: 'flex',
          flexDirection: 'column',
          overflow: 'hidden',
        }}>
          <div style={{
            background: '#1e293b',
            padding: '1.25rem 2rem',
            borderBottom: '3px solid #f59e0b',
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center',
          }}>
            <h2 style={{ margin: 0, fontSize: '1.6rem', fontWeight: 900, letterSpacing: '0.05em', color: '#fde68a' }}>
              🍳 PREPARING
            </h2>
            <span style={{
              background: '#d97706',
              color: '#fff',
              fontWeight: 800,
              padding: '0.2rem 0.75rem',
              borderRadius: '9999px',
              fontSize: '1.1rem',
            }}>
              {preparing.length}
            </span>
          </div>

          <div style={{
            flex: 1,
            padding: '2rem',
            display: 'grid',
            gridTemplateColumns: 'repeat(auto-fill, minmax(180px, 1fr))',
            gap: '1.25rem',
            alignContent: 'start',
          }}>
            {preparing.length === 0 ? (
              <div style={{ gridColumn: '1 / -1', color: '#64748b', fontSize: '1.2rem', textAlign: 'center', marginTop: '3rem' }}>
                All orders are up to date!
              </div>
            ) : (
              preparing.map(order => (
                <div
                  key={order.id}
                  style={{
                    background: '#1e293b',
                    border: '1px solid #334155',
                    borderRadius: '0.75rem',
                    padding: '1.25rem 1rem',
                    textAlign: 'center',
                    boxShadow: '0 4px 6px -1px rgba(0, 0, 0, 0.3)',
                  }}
                >
                  <div style={{ fontSize: '1.6rem', fontWeight: 900, color: '#f8fafc', letterSpacing: '-0.02em' }}>
                    {order.order_number}
                  </div>
                  <span style={{
                    display: 'inline-block',
                    marginTop: '0.4rem',
                    fontSize: '0.8rem',
                    fontWeight: 700,
                    color: '#94a3b8',
                    textTransform: 'uppercase',
                  }}>
                    {order.dining_type}
                  </span>
                </div>
              ))
            )}
          </div>
        </section>

        {/* Right Column: Now Serving / Ready */}
        <section style={{
          background: '#0f172a',
          borderRadius: '1rem',
          border: '1px solid #1e293b',
          display: 'flex',
          flexDirection: 'column',
          overflow: 'hidden',
          boxShadow: '0 0 25px rgba(34, 197, 94, 0.08)',
        }}>
          <div style={{
            background: 'linear-gradient(90deg, #14532d, #166534)',
            padding: '1.25rem 2rem',
            borderBottom: '3px solid #22c55e',
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center',
          }}>
            <h2 style={{ margin: 0, fontSize: '1.6rem', fontWeight: 900, letterSpacing: '0.05em', color: '#86efac' }}>
              🔔 NOW SERVING / PICK UP
            </h2>
            <span style={{
              background: '#22c55e',
              color: '#052e16',
              fontWeight: 900,
              padding: '0.2rem 0.75rem',
              borderRadius: '9999px',
              fontSize: '1.1rem',
            }}>
              {ready.length}
            </span>
          </div>

          <div style={{
            flex: 1,
            padding: '2rem',
            display: 'grid',
            gridTemplateColumns: 'repeat(auto-fill, minmax(200px, 1fr))',
            gap: '1.5rem',
            alignContent: 'start',
          }}>
            {ready.length === 0 ? (
              <div style={{ gridColumn: '1 / -1', color: '#64748b', fontSize: '1.2rem', textAlign: 'center', marginTop: '3rem' }}>
                No orders ready for pickup.
              </div>
            ) : (
              ready.map(order => (
                <div
                  key={order.id}
                  style={{
                    background: 'linear-gradient(180deg, #1e293b, #0f172a)',
                    border: '2px solid #22c55e',
                    borderRadius: '0.875rem',
                    padding: '1.5rem 1rem',
                    textAlign: 'center',
                    boxShadow: '0 0 15px rgba(34, 197, 94, 0.25)',
                  }}
                >
                  <div style={{ fontSize: '1.9rem', fontWeight: 900, color: '#4ade80', letterSpacing: '-0.02em' }}>
                    {order.order_number}
                  </div>
                  <div style={{
                    marginTop: '0.5rem',
                    display: 'inline-block',
                    background: '#22c55e',
                    color: '#052e16',
                    fontSize: '0.85rem',
                    fontWeight: 800,
                    padding: '0.2rem 0.6rem',
                    borderRadius: '0.375rem',
                  }}>
                    READY
                  </div>
                </div>
              ))
            )}
          </div>
        </section>
      </main>
    </div>
  )
}
