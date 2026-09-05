import { useNavigate } from 'react-router-dom'
import { Brand } from '../components/brand'
import { useKioskStore } from '../store/kiosk-store'

export function WelcomeScreen() {
  const navigate = useNavigate()
  const brandName = useKioskStore((state) => state.settings?.brand_name || 'KIOSK')
  const backgroundImage = useKioskStore((state) => state.settings?.welcome_background_image)

  return (
    <main
      className={`welcome screen-enter ${backgroundImage ? 'welcome--has-bg' : ''}`}
      style={backgroundImage ? { backgroundImage: `url(${backgroundImage})` } : undefined}
    >
      {backgroundImage && <div className="welcome__backdrop" aria-hidden="true" />}
      <section className="welcome__content">
        <Brand />
        <div className="welcome__message">
          <p className="welcome__eyebrow">FRESHLY MADE FOR YOU</p>
          <h1>Welcome to<br /><em>{brandName}</em></h1>
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
        <footer className="welcome__footer">Need help? Ask one of our team members.</footer>
      </section>
    </main>
  )
}
