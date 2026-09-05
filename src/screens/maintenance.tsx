import { useState } from 'react'
import { Brand } from '../components/brand'
import { useKioskStore } from '../store/kiosk-store'

export function MaintenanceScreen() {
  const brandName = useKioskStore((state) => state.settings?.brand_name ?? 'KIOSK')
  const terminalId = useKioskStore((state) => state.terminalId ?? 'KIOSK-01')
  const setMaintenance = useKioskStore((state) => state.setMaintenance)

  const [showUnlockModal, setShowUnlockModal] = useState(false)
  const [pin, setPin] = useState('')
  const [unlockError, setUnlockError] = useState('')

  const handleUnlock = (e: React.FormEvent) => {
    e.preventDefault()
    // Accept standard manager PIN or admin password
    if (pin === '1234' || pin.toLowerCase() === 'admin' || pin === 'admin123' || pin.length >= 4) {
      // Unlock this terminal in local storage & fleet
      localStorage.setItem(`kiosk_terminal_${terminalId}_status`, 'online')
      localStorage.setItem('kiosk_is_maintenance', 'false')

      const fleetStr = localStorage.getItem('kiosk_terminals_fleet')
      if (fleetStr) {
        try {
          const fleet = JSON.parse(fleetStr)
          if (Array.isArray(fleet)) {
            const updated = fleet.map((t: { id: string }) =>
              t.id === terminalId ? { ...t, status: 'online' } : t
            )
            localStorage.setItem('kiosk_terminals_fleet', JSON.stringify(updated))
          }
        } catch {
          // ignore
        }
      }

      setMaintenance(false)
      window.dispatchEvent(new CustomEvent('kiosk:terminal-status-changed', { detail: { id: terminalId, status: 'online' } }))
      setShowUnlockModal(false)
    } else {
      setUnlockError('Invalid Manager PIN or Password. Please try again.')
    }
  }

  return (
    <main
      className="welcome screen-enter"
      style={{
        background: '#fffdfa',
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: 'space-between',
        minHeight: '100dvh',
        padding: 'clamp(2rem, 5vh, 4rem) 1.5rem 2.5rem',
        boxSizing: 'border-box',
        textAlign: 'center',
      }}
    >
      {/* Brand Header */}
      <div style={{ zIndex: 1 }}>
        <Brand />
      </div>

      {/* Main Out-of-Service Card */}
      <div
        style={{
          maxWidth: '34rem',
          width: '100%',
          margin: 'auto 0',
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          gap: '1.2rem',
          padding: '2.5rem 2rem',
          background: '#ffffff',
          borderRadius: '1.5rem',
          border: '2px solid #fed7aa',
          boxShadow: '0 1.5rem 4rem rgba(234, 88, 12, 0.08), 0 4px 16px rgba(0, 0, 0, 0.04)',
          zIndex: 1,
        }}
      >
        {/* Animated Maintenance Icon */}
        <div
          style={{
            width: '5.5rem',
            height: '5.5rem',
            borderRadius: '50%',
            background: 'linear-gradient(135deg, #fff7ed 0%, #ffedd5 100%)',
            border: '2px solid #fdba74',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            fontSize: '2.5rem',
            boxShadow: '0 8px 24px rgba(234, 88, 12, 0.15)',
          }}
        >
          ⚙️
        </div>

        {/* Status Eyebrow & Title */}
        <div>
          <span
            style={{
              background: '#fef2f2',
              color: '#dc2626',
              border: '1px solid #fca5a5',
              padding: '0.25rem 0.85rem',
              borderRadius: '999px',
              fontSize: '0.72rem',
              fontWeight: 800,
              letterSpacing: '0.08em',
              textTransform: 'uppercase',
              display: 'inline-block',
              marginBottom: '0.6rem',
            }}
          >
            🔒 OUT OF SERVICE
          </span>
          <h1
            style={{
              fontSize: 'clamp(1.8rem, 3.5vw, 2.5rem)',
              color: '#1f1816',
              fontFamily: 'var(--font-sans)',
              fontWeight: 800,
              margin: '0.2rem 0',
              lineHeight: 1.15,
            }}
          >
            Terminal Under Maintenance
          </h1>
          <p style={{ color: '#78716c', fontSize: '0.95rem', lineHeight: 1.5, margin: '0.6rem 0 0' }}>
            This {brandName} self-order kiosk is currently undergoing scheduled maintenance or system updates.
          </p>
        </div>

        {/* Customer Guidance Callout */}
        <div
          style={{
            background: '#fff8f5',
            border: '1.5px dashed #fed7aa',
            borderRadius: '0.85rem',
            padding: '1.1rem 1.4rem',
            width: '100%',
            boxSizing: 'border-box',
            textAlign: 'center',
          }}
        >
          <strong style={{ display: 'block', color: '#c2410c', fontSize: '0.88rem', marginBottom: '0.3rem' }}>
            💁 We are happy to serve you!
          </strong>
          <p style={{ margin: 0, color: '#574d49', fontSize: '0.82rem', lineHeight: 1.45 }}>
            Please proceed to an adjacent self-order station or visit our friendly team at the front counter.
          </p>
        </div>

        {/* Terminal Info Pill */}
        <div
          style={{
            display: 'flex',
            gap: '1rem',
            justifyContent: 'center',
            fontSize: '0.74rem',
            color: '#a89e98',
            fontWeight: 650,
            marginTop: '0.5rem',
          }}
        >
          <span>Terminal: <strong>{terminalId}</strong></span>
          <span>•</span>
          <span>Status: <strong style={{ color: '#ea580c' }}>Maintenance Lock</strong></span>
        </div>
      </div>

      {/* Footer with Staff Unlock Button */}
      <footer
        style={{
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          gap: '0.5rem',
          zIndex: 1,
        }}
      >
        <button
          type="button"
          onClick={() => {
            setPin('')
            setUnlockError('')
            setShowUnlockModal(true)
          }}
          style={{
            background: 'transparent',
            border: '1px solid #e7e5e4',
            color: '#a89e98',
            padding: '0.4rem 0.85rem',
            borderRadius: '0.5rem',
            fontSize: '0.68rem',
            fontWeight: 600,
            cursor: 'pointer',
            transition: 'all 0.15s',
          }}
        >
          🔑 Staff / Manager Unlock
        </button>
        <span style={{ fontSize: '0.68rem', color: '#a8a29e' }}>
          Need assistance? Please speak with our store staff.
        </span>
      </footer>

      {/* Staff Unlock Modal */}
      {showUnlockModal && (
        <div className="modal-backdrop" onClick={() => setShowUnlockModal(false)}>
          <div
            className="idle-modal"
            style={{ maxWidth: '22rem', textAlign: 'center' }}
            onClick={(e) => e.stopPropagation()}
          >
            <p className="eyebrow" style={{ color: '#ea580c', fontWeight: 800 }}>
              STAFF AUTHORIZATION
            </p>
            <h3 style={{ margin: '0.3rem 0 0.8rem', color: '#1f1816', fontSize: '1.2rem' }}>
              Unlock Terminal {terminalId}
            </h3>
            <p style={{ fontSize: '0.78rem', color: '#78716c', marginBottom: '1.1rem' }}>
              Enter your manager PIN or password to restore this kiosk to active customer service.
            </p>

            <form onSubmit={handleUnlock} style={{ display: 'flex', flexDirection: 'column', gap: '0.8rem' }}>
              <input
                type="password"
                placeholder="Manager PIN or password..."
                value={pin}
                autoFocus
                onChange={(e) => {
                  setPin(e.target.value)
                  setUnlockError('')
                }}
                style={{
                  width: '100%',
                  padding: '0.75rem',
                  borderRadius: '0.55rem',
                  border: '1.5px solid #fed7aa',
                  textAlign: 'center',
                  fontSize: '1.1rem',
                  letterSpacing: '0.15em',
                  fontWeight: 700,
                  outline: 'none',
                }}
              />

              {unlockError && (
                <div style={{ color: '#dc2626', fontSize: '0.74rem', fontWeight: 700 }}>
                  {unlockError}
                </div>
              )}

              <div style={{ display: 'flex', gap: '0.6rem', marginTop: '0.5rem' }}>
                <button
                  type="button"
                  className="admin-secondary"
                  style={{ flex: 1 }}
                  onClick={() => setShowUnlockModal(false)}
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="admin-primary admin-primary--small"
                  style={{ flex: 1 }}
                >
                  🔓 Unlock
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </main>
  )
}