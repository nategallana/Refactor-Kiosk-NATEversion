import { useEffect, useState } from 'react'
import { useLocation, useNavigate } from 'react-router-dom'
import { useKioskStore } from '../store/kiosk-store'

const IDLE_WARNING_MS = 4 * 60 * 1000
const RESET_MS = 30 * 1000

export function IdleGuard() {
  const [warning, setWarning] = useState(false)
  const location = useLocation()
  const navigate = useNavigate()
  const reset = useKioskStore((state) => state.reset)
  useEffect(() => {
    if (location.pathname === '/' || location.pathname === '/ticket') return
    let warningTimer = window.setTimeout(() => setWarning(true), IDLE_WARNING_MS)
    const renew = () => { window.clearTimeout(warningTimer); setWarning(false); warningTimer = window.setTimeout(() => setWarning(true), IDLE_WARNING_MS) }
    const events = ['pointerdown', 'keydown'] as const
    events.forEach((event) => window.addEventListener(event, renew))
    return () => { window.clearTimeout(warningTimer); events.forEach((event) => window.removeEventListener(event, renew)) }
  }, [location.pathname])
  useEffect(() => {
    if (!warning) return
    const timer = window.setTimeout(() => { reset(); navigate('/', { replace: true }) }, RESET_MS)
    return () => window.clearTimeout(timer)
  }, [warning, navigate, reset])
  if (!warning) return null
  return <div className="modal-backdrop" role="dialog" aria-modal="true" aria-labelledby="idle-title"><div className="idle-modal"><p className="eyebrow">ARE YOU STILL THERE?</p><h2 id="idle-title">Your order is waiting.</h2><p>Tap below within 30 seconds to keep your order.</p><button className="primary-button" autoFocus onClick={() => setWarning(false)}>Keep my order</button><button className="secondary-button" onClick={() => { reset(); navigate('/', { replace: true }) }}>Clear and start over</button></div></div>
}
