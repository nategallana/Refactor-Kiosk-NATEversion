import { useKioskStore } from '../store/kiosk-store'

export function Brand({ compact = false }: { compact?: boolean }) {
  const brandName = useKioskStore((state) => state.settings?.brand_name || 'KIOSK')
  const initial = brandName.charAt(0).toUpperCase() || 'K'

  return (
    <div className={`brand ${compact ? 'brand--compact' : ''}`} aria-label={brandName}>
      <span className="brand__mark" style={{ letterSpacing: 'normal', paddingRight: 0 }}>{initial}</span>
      <span className="brand__words"><strong>{brandName}</strong></span>
    </div>
  )
}


