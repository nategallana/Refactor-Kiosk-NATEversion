export function Brand({ compact = false }: { compact?: boolean }) {
  return <div className={`brand ${compact ? 'brand--compact' : ''}`} aria-label="KIOSK">
    <span className="brand__mark" style={{ letterSpacing: 'normal', paddingRight: 0 }}>K</span>
    <span className="brand__words"><strong>KIOSK</strong></span>
  </div>
}

