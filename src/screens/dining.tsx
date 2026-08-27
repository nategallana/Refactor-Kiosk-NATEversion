import { useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { Takeout, Utensils } from '../components/icons'
import { useKioskStore } from '../store/kiosk-store'
import type { DiningType } from '../domain/order'

export function DiningScreen() {
  const navigate = useNavigate()
  const setDiningType = useKioskStore((state) => state.setDiningType)
  const serviceMode = useKioskStore((state) => state.settings?.service_mode || 'both')

  useEffect(() => {
    // If store is strictly single-mode, bypass dining screen directly to menu
    if (serviceMode === 'dine-in') {
      setDiningType('dine-in')
      navigate('/menu', { replace: true })
    } else if (serviceMode === 'takeout') {
      setDiningType('takeout')
      navigate('/menu', { replace: true })
    }
  }, [serviceMode, setDiningType, navigate])

  const select = (value: DiningType) => { setDiningType(value); navigate('/menu') }

  const showDineIn = serviceMode === 'both' || serviceMode === 'dine-in'
  const showTakeout = serviceMode === 'both' || serviceMode === 'takeout'

  return <main className="dining screen-enter">
    <section className="choice-content">
      <div className="dining-heading">
        <h1>Welcome! Let&rsquo;s get started</h1>
        <p>How would you like to enjoy your meal today?</p>
      </div>
      <div className="dining-grid">
        {showDineIn && (
          <button className="dining-card" onClick={() => select('dine-in')}>
            <span className="dining-card__icon"><Utensils /></span>
            <strong>Dine In</strong>
            <small>Relax and enjoy your meal in our<br />comfortable seating area</small>
          </button>
        )}
        {showTakeout && (
          <button className="dining-card" onClick={() => select('takeout')}>
            <span className="dining-card__icon"><Takeout /></span>
            <strong>Take away</strong>
            <small>On the go? We&rsquo;ll have your meal ready<br />for you to take away</small>
          </button>
        )}
      </div>
      <button className="dining-back" onClick={() => navigate('/')}>Back</button>
    </section>
  </main>
}

