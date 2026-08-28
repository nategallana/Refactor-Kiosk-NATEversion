import { useState } from 'react'
import { useTerminalStore } from '../store/terminal-store'
import { useKioskStore } from '../store/kiosk-store'

export function TerminalSetup() {
  const register = useTerminalStore((s) => s.register)
  const brandName = useKioskStore((s) => s.settings.brand_name)

  const [activationCode, setActivationCode] = useState('')
  const [name, setName] = useState('Main Customer Terminal')
  const [location, setLocation] = useState('Lobby')
  const [error, setError] = useState('')
  const [submitting, setSubmitting] = useState(false)

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setError('')
    setSubmitting(true)
    try {
      await register(activationCode, name.trim(), location.trim())
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Registration failed.')
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <div style={{
      display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center',
      minHeight: '100vh', background: '#0c0a09',
      color: '#f5f5f4', fontFamily: 'system-ui, -apple-system, sans-serif', padding: '2rem',
    }}>
      <div style={{
        background: '#1c1917', border: '1px solid #292524', borderRadius: '1rem',
        padding: '2.5rem', maxWidth: '440px', width: '100%',
        boxShadow: '0 20px 25px -5px rgba(0, 0, 0, 0.5), 0 8px 10px -6px rgba(0, 0, 0, 0.5)',
      }}>
        <div style={{
          display: 'inline-block',
          fontSize: '0.75rem', fontWeight: 700, letterSpacing: '0.08em',
          textTransform: 'uppercase', color: '#ea580c',
          background: 'rgba(234, 88, 12, 0.12)', border: '1px solid rgba(234, 88, 12, 0.25)',
          borderRadius: '999px', padding: '0.3rem 0.75rem', marginBottom: '1rem',
        }}>
          System Activation
        </div>

        <h1 style={{ fontSize: '1.5rem', fontWeight: 700, letterSpacing: '-0.02em', margin: '0 0 0.4rem 0', color: '#fafaf9' }}>
          Terminal Setup
        </h1>
        <p style={{ color: '#78716c', margin: '0 0 1.75rem 0', fontSize: '0.92rem', lineHeight: 1.4 }}>
          Register this device with {brandName || 'the central server'}.
        </p>

        <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '1.1rem' }}>
          <div>
            <label style={{ display: 'block', fontSize: '0.8rem', fontWeight: 600, color: '#a8a29e', marginBottom: '0.35rem', textTransform: 'uppercase', letterSpacing: '0.04em' }}>
              Activation Code
            </label>
            <input
              value={activationCode}
              onChange={(e) => setActivationCode(e.target.value.toUpperCase())}
              placeholder="AB12CD34"
              required
              style={inputStyle}
            />
          </div>

          <div>
            <label style={{ display: 'block', fontSize: '0.8rem', fontWeight: 600, color: '#a8a29e', marginBottom: '0.35rem', textTransform: 'uppercase', letterSpacing: '0.04em' }}>
              Terminal Display Name
            </label>
            <input
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="Main Customer Terminal"
              required
              style={inputStyle}
            />
          </div>

          <div>
            <label style={{ display: 'block', fontSize: '0.8rem', fontWeight: 600, color: '#a8a29e', marginBottom: '0.35rem', textTransform: 'uppercase', letterSpacing: '0.04em' }}>
              Location / Placement
            </label>
            <input
              value={location}
              onChange={(e) => setLocation(e.target.value)}
              placeholder="Lobby"
              style={inputStyle}
            />
          </div>

          {error && (
            <div style={{
              background: 'rgba(239, 68, 68, 0.1)', border: '1px solid rgba(239, 68, 68, 0.3)',
              color: '#f87171', padding: '0.65rem 0.85rem', borderRadius: '0.5rem',
              fontSize: '0.85rem', textAlign: 'center',
            }}>
              {error}
            </div>
          )}

          <button
            type="submit"
            disabled={submitting || activationCode.trim().length !== 8 || !name.trim()}
            style={{
              background: submitting ? '#57534e' : '#ea580c',
              color: '#ffffff', border: 'none', borderRadius: '0.5rem',
              padding: '0.85rem 1rem', fontSize: '1rem', fontWeight: 600,
              cursor: submitting ? 'not-allowed' : 'pointer',
              marginTop: '0.5rem', transition: 'background-color 0.15s ease',
            }}
          >
            {submitting ? 'Connecting...' : 'Activate Terminal'}
          </button>
        </form>
      </div>
    </div>
  )
}

const inputStyle: React.CSSProperties = {
  width: '100%', padding: '0.75rem 0.9rem', fontSize: '0.95rem',
  background: '#141210', border: '1px solid #332f2c', borderRadius: '0.5rem',
  color: '#fafaf9', outline: 'none', boxSizing: 'border-box',
  fontFamily: 'inherit',
}
