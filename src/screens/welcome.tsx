import { useNavigate } from 'react-router-dom'
import { Brand } from '../components/brand'
import { useKioskStore } from '../store/kiosk-store'
import { isVideoUrl } from '../domain/media'

export function WelcomeScreen() {
  const navigate = useNavigate()
  const brandName = useKioskStore((state) => state.settings?.brand_name ?? 'our restaurant')
  const backgroundUrl = useKioskStore((state) => state.settings?.welcome_background_url) || (typeof window !== 'undefined' ? localStorage.getItem('kiosk_welcome_background') : null)

  const isVideo = isVideoUrl(backgroundUrl)
  const containerStyle: React.CSSProperties = backgroundUrl && !isVideo
    ? { backgroundImage: `url("${backgroundUrl}")` }
    : {}

  return <main className={`welcome screen-enter ${backgroundUrl ? 'welcome--custom-bg' : ''}`} style={containerStyle}>
    {isVideo && backgroundUrl && (
      <video
        className="welcome__video-bg"
        src={backgroundUrl}
        autoPlay
        loop
        muted
        playsInline
        aria-hidden="true"
      />
    )}
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
    </section>
    <footer className="welcome__footer">Need help? Ask one of our team members.</footer>
  </main>
}
