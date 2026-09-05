import { useKioskStore } from '../store/kiosk-store'

export function MaintenanceScreen() {
  const brandName = useKioskStore((s) => s.settings.brand_name)

  return (
    <div style={{
      display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center',
      minHeight: '100vh', background: '#0c0a09',
      color: '#fafaf9', fontFamily: 'system-ui, -apple-system, sans-serif', textAlign: 'center',
      padding: '2rem',
    }}>
      <div style={{
        display: 'inline-block',
        fontSize: '0.8rem', fontWeight: 700, letterSpacing: '0.08em',
        textTransform: 'uppercase', color: '#f59e0b',
        background: 'rgba(245, 158, 11, 0.12)', border: '1px solid rgba(245, 158, 11, 0.25)',
        borderRadius: '999px', padding: '0.35rem 0.85rem', marginBottom: '1.5rem',
      }}>
        Notice
      </div>
      <h1 style={{ fontSize: '2rem', fontWeight: 700, marginBottom: '0.75rem', letterSpacing: '-0.02em' }}>
        Terminal Under Maintenance
      </h1>
      <p style={{ color: '#a8a29e', fontSize: '1.1rem', maxWidth: '420px', lineHeight: 1.5, margin: 0 }}>
        This kiosk is currently undergoing routine maintenance. Please visit the counter to place your order.
      </p>
      {brandName && (
        <p style={{ color: '#57534e', fontSize: '0.9rem', marginTop: '2.5rem', letterSpacing: '0.05em', textTransform: 'uppercase', fontWeight: 600 }}>
          {brandName}
        </p>
      )}
    </div>
  )
}
