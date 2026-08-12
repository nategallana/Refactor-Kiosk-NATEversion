import { useNavigate } from 'react-router-dom'
import { Takeout, Utensils } from '../components/icons'
import { useKioskStore } from '../store/kiosk-store'
import type { DiningType } from '../domain/order'

export function DiningScreen() {
  const navigate = useNavigate()
  const setDiningType = useKioskStore((state) => state.setDiningType)
  const select = (value: DiningType) => { setDiningType(value); navigate('/menu') }

  return <main className="dining screen-enter">
    <section className="choice-content">
      <div className="dining-heading">
        <h1>Welcome! Let&rsquo;s get started</h1>
        <p>How would you like to enjoy your meal today?</p>
      </div>
      <div className="dining-grid">
        <button className="dining-card" onClick={() => select('dine-in')}>
          <span className="dining-card__icon"><Utensils /></span>
          <strong>Dine In</strong>
          <small>Relax and enjoy your meal in our<br />comfortable seating area</small>
        </button>
        <button className="dining-card" onClick={() => select('takeout')}>
          <span className="dining-card__icon"><Takeout /></span>
          <strong>Take away</strong>
          <small>On the go? We&rsquo;ll have your meal ready<br />for you to take away</small>
        </button>
      </div>
      <button className="dining-back" onClick={() => navigate('/')}>Back</button>
    </section>
  </main>
}
