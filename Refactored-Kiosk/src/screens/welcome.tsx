import { useNavigate } from 'react-router-dom'
import { Brand } from '../components/brand'

export function WelcomeScreen() {
  const navigate = useNavigate()

  return <main className="welcome screen-enter">
    <section className="welcome__content">
      <Brand />
      <div className="welcome__message">
        <p className="welcome__eyebrow">FRESHLY MADE FOR YOU</p>
        <h1>Welcome to<br /><em>KIOSK</em></h1>
        <p className="welcome__lead">Order your favorites in just a few simple steps.</p>
      </div>
      <div className="welcome__visual" aria-hidden="true">
        <span className="welcome__visual-ring" />
        <img src="/menu/burger-bundle.png" alt="" />
      </div>
      <button className="welcome__start" onClick={() => navigate('/dining')}>
        <span>Start your order</span><strong aria-hidden="true">&rarr;</strong>
      </button>
      <p className="welcome__hint">Tap the button to begin</p>
    </section>
    <footer className="welcome__footer">Need help? Ask one of our team members.</footer>
  </main>
}
