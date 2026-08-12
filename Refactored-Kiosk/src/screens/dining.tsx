import { useNavigate } from 'react-router-dom'
import { ArrowLeft, Takeout, Utensils } from '../components/icons'
import { Brand } from '../components/brand'
import { useKioskStore } from '../store/kiosk-store'
import type { DiningType } from '../domain/order'

export function DiningScreen() {
  const navigate = useNavigate()
  const setDiningType = useKioskStore((state) => state.setDiningType)
  const select = (value: DiningType) => { setDiningType(value); navigate('/menu') }
  return <main className="dining screen-enter">
    <header className="simple-header"><button className="icon-button" onClick={() => navigate('/')} aria-label="Back"><ArrowLeft /></button><Brand compact /><span className="header-spacer" /></header>
    <section className="choice-content">
      <p className="eyebrow">ONE QUICK QUESTION</p>
      <h1>Where will you<br /><em>enjoy your meal?</em></h1>
      <div className="dining-grid">
        <button className="dining-card" onClick={() => select('dine-in')}><span className="dining-card__icon"><Utensils /></span><strong>Dine in</strong><small>Enjoy your meal with us</small><span className="text-link">Choose dine in →</span></button>
        <button className="dining-card dining-card--dark" onClick={() => select('takeout')}><span className="dining-card__icon"><Takeout /></span><strong>Take out</strong><small>We'll pack it up for you</small><span className="text-link">Choose take out →</span></button>
      </div>
    </section>
  </main>
}
