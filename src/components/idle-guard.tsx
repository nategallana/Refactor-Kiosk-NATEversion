import { useEffect, useState, useRef } from 'react'
import { useLocation, useNavigate } from 'react-router-dom'
import { useKioskStore } from '../store/kiosk-store'

const COUNTDOWN_SECONDS = 20

export function IdleGuard() {
  const [warning, setWarning] = useState(false)
  const [countdown, setCountdown] = useState(COUNTDOWN_SECONDS)
  const location = useLocation()
  const navigate = useNavigate()
  const reset = useKioskStore((state) => state.reset)
  const idleTimeoutSeconds = useKioskStore((state) => state.settings?.idle_timeout_seconds || 240)
  const idleWarningMs = Math.max(20, idleTimeoutSeconds - COUNTDOWN_SECONDS) * 1000
  const countdownTimerRef = useRef<number | null>(null)

  // Inactivity detection
  useEffect(() => {
    if (location.pathname === '/' || location.pathname === '/ticket') {
      setWarning(false)
      return
    }

    let warningTimer = window.setTimeout(() => {
      setCountdown(COUNTDOWN_SECONDS)
      setWarning(true)
    }, idleWarningMs)

    const renew = () => {
      window.clearTimeout(warningTimer)
      if (!warning) {
        warningTimer = window.setTimeout(() => {
          setCountdown(COUNTDOWN_SECONDS)
          setWarning(true)
        }, idleWarningMs)
      }
    }

    const events = ['pointerdown', 'keydown', 'touchstart'] as const
    events.forEach((event) => window.addEventListener(event, renew))

    return () => {
      window.clearTimeout(warningTimer)
      events.forEach((event) => window.removeEventListener(event, renew))
    }
  }, [location.pathname, idleWarningMs, warning])

  // Active ticking countdown when warning modal is open
  useEffect(() => {
    if (!warning) {
      if (countdownTimerRef.current) clearInterval(countdownTimerRef.current)
      return
    }

    countdownTimerRef.current = window.setInterval(() => {
      setCountdown((prev) => {
        if (prev <= 1) {
          if (countdownTimerRef.current) clearInterval(countdownTimerRef.current)
          reset()
          navigate('/', { replace: true })
          return 0
        }
        return prev - 1
      })
    }, 1000)

    return () => {
      if (countdownTimerRef.current) clearInterval(countdownTimerRef.current)
    }
  }, [warning, navigate, reset])

  const keepOrder = () => {
    setWarning(false)
    setCountdown(COUNTDOWN_SECONDS)
  }

  const cancelOrder = () => {
    setWarning(false)
    reset()
    navigate('/', { replace: true })
  }

  if (!warning) return null

  return (
    <div
      className="modal-backdrop"
      role="dialog"
      aria-modal="true"
      aria-labelledby="idle-title"
      onClick={keepOrder}
      style={{
        background: 'rgba(15, 23, 42, 0.78)',
        backdropFilter: 'blur(8px)',
        zIndex: 9999,
      }}
    >
      <div
        className="idle-modal"
        onClick={(e) => e.stopPropagation()}
        style={{
          background: '#ffffff',
          borderRadius: '1.5rem',
          padding: '2.5rem 2rem',
          maxWidth: '28rem',
          textAlign: 'center',
          boxShadow: '0 25px 50px -12px rgba(0, 0, 0, 0.25)',
          border: '1.5px solid #fed7aa',
          animation: 'modalSlideUp 0.25s cubic-bezier(0.16, 1, 0.3, 1)',
        }}
      >
        {/* Pulsing Countdown Ring */}
        <div
          style={{
            width: '4.8rem',
            height: '4.8rem',
            borderRadius: '50%',
            background: '#fff7ed',
            border: '3px solid #ea580c',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            margin: '0 auto 1.25rem',
            boxShadow: '0 0 0 6px rgba(234, 88, 12, 0.15)',
          }}
        >
          <span style={{ fontSize: '1.8rem', fontWeight: 900, color: '#ea580c', fontFamily: 'monospace' }}>
            {countdown}
          </span>
        </div>

        <p className="eyebrow" style={{ color: '#ea580c', fontWeight: 850, fontSize: '0.72rem', letterSpacing: '0.12em', margin: '0 0 0.35rem' }}>
          INACTIVITY WARNING
        </p>
        <h2 id="idle-title" style={{ fontFamily: 'Georgia, serif', fontSize: '1.8rem', color: '#1f1816', margin: '0 0 0.6rem' }}>
          Are you still ordering?
        </h2>
        <p style={{ color: '#57534e', fontSize: '0.88rem', margin: '0 0 1.75rem', lineHeight: 1.45 }}>
          Your session will reset in <strong style={{ color: '#ea580c' }}>{countdown} seconds</strong> to protect your privacy and clear the screen for the next customer.
        </p>

        <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
          <button
            type="button"
            className="primary-button"
            autoFocus
            onClick={keepOrder}
            style={{
              padding: '1rem',
              fontSize: '1rem',
              fontWeight: 800,
              borderRadius: '0.85rem',
              background: '#ea580c',
              color: '#ffffff',
              border: 'none',
              cursor: 'pointer',
              boxShadow: '0 4px 12px rgba(234, 88, 12, 0.35)',
            }}
          >
            ✓ Continue Ordering ({countdown}s)
          </button>
          <button
            type="button"
            className="secondary-button"
            onClick={cancelOrder}
            style={{
              padding: '0.75rem',
              fontSize: '0.82rem',
              fontWeight: 700,
              borderRadius: '0.85rem',
              background: '#fafaf9',
              color: '#78716c',
              border: '1px solid #e7e5e4',
              cursor: 'pointer',
            }}
          >
            ✕ Cancel and Start Over
          </button>
        </div>
      </div>
    </div>
  )
}
