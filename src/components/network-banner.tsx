import { useState, useEffect } from 'react'

export function NetworkBanner() {
  const [isOnline, setIsOnline] = useState(typeof navigator !== 'undefined' ? navigator.onLine : true)
  const [isReconnecting, setIsReconnecting] = useState(false)

  useEffect(() => {
    const handleOnline = () => setIsOnline(true)
    const handleOffline = () => setIsOnline(false)

    window.addEventListener('online', handleOnline)
    window.addEventListener('offline', handleOffline)

    return () => {
      window.removeEventListener('online', handleOnline)
      window.removeEventListener('offline', handleOffline)
    }
  }, [])

  if (isOnline) return null

  const handleRetry = () => {
    setIsReconnecting(true)
    setTimeout(() => {
      setIsOnline(navigator.onLine)
      setIsReconnecting(false)
    }, 1200)
  }

  return (
    <div style={{
      position: 'fixed',
      top: 0,
      left: 0,
      right: 0,
      zIndex: 99999,
      backgroundColor: '#b91c1c',
      color: '#ffffff',
      padding: '0.6rem 1rem',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      gap: '1rem',
      fontSize: '0.9rem',
      fontWeight: 600,
      boxShadow: '0 4px 6px -1px rgba(0, 0, 0, 0.3)',
    }}>
      <span>⚠️ Network connection lost. The kiosk will automatically reconnect.</span>
      <button
        onClick={handleRetry}
        disabled={isReconnecting}
        style={{
          background: '#ffffff',
          color: '#b91c1c',
          border: 'none',
          padding: '0.3rem 0.75rem',
          borderRadius: '0.375rem',
          fontWeight: 700,
          cursor: 'pointer',
        }}
      >
        {isReconnecting ? 'Checking...' : 'Retry Now'}
      </button>
    </div>
  )
}
