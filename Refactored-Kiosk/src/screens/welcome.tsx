import { useNavigate } from 'react-router-dom'
import { Brand } from '../components/brand'

export function WelcomeScreen() {
  const navigate = useNavigate()
  return <main className="welcome screen-enter">
    <div className="welcome__halo welcome__halo--one" />
    <div className="welcome__halo welcome__halo--two" />
    <section className="welcome__content">
      <Brand />
      <p className="eyebrow">GOOD FOOD · GOOD COMPANY</p>
      <h1>Made for the<br /><em>moment.</em></h1>
      <p className="welcome__lead">Freshly prepared favorites, ordered just the way you like them.</p>
      <button className="primary-button primary-button--wide" onClick={() => navigate('/dining')}>Start your order <span>→</span></button>
      <p className="welcome__hint">Tap anywhere to begin</p>
    </section>
    <div className="welcome__art" aria-hidden="true">
      <div className="plate"><div className="plate__food">🍗</div><i className="leaf leaf--one">●</i><i className="leaf leaf--two">●</i><i className="leaf leaf--three">●</i></div>
      <span className="scribble">made<br />fresh</span>
    </div>
    <footer className="welcome__footer"><span>Need help? Ask one of our team members.</span><span>English · ₱ PHP</span></footer>
  </main>
}
