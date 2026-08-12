export function Brand({ compact = false }: { compact?: boolean }) {
  return <div className={`brand ${compact ? 'brand--compact' : ''}`} aria-label="Table and Company">
    <span className="brand__mark">T<span>&</span></span>
    <span className="brand__words"><strong>TABLE</strong><small>& COMPANY</small></span>
  </div>
}
