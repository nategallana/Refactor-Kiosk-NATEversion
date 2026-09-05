import { useEffect, useState } from 'react'

export type ToastType = 'success' | 'error' | 'info'

export interface ToastProps {
  message: string | null
  type?: ToastType
  duration?: number
  onClose: () => void
}

export function Toast({ message, type = 'success', duration = 3500, onClose }: ToastProps) {
  const [isExiting, setIsExiting] = useState(false)

  useEffect(() => {
    if (!message) return

    setIsExiting(false)
    const exitTimer = window.setTimeout(() => {
      setIsExiting(true)
    }, Math.max(0, duration - 300))

    const closeTimer = window.setTimeout(() => {
      onClose()
    }, duration)

    return () => {
      window.clearTimeout(exitTimer)
      window.clearTimeout(closeTimer)
    }
  }, [message, duration, onClose])

  if (!message) return null

  const getIcon = () => {
    switch (type) {
      case 'error':
        return (
          <span className="toast-icon toast-icon--error" aria-hidden="true">
            ✕
          </span>
        )
      case 'info':
        return (
          <span className="toast-icon toast-icon--info" aria-hidden="true">
            ℹ
          </span>
        )
      case 'success':
      default:
        return (
          <span className="toast-icon toast-icon--success" aria-hidden="true">
            ✓
          </span>
        )
    }
  }

  return (
    <div
      className={`toast-notification toast-notification--${type} ${isExiting ? 'toast-notification--exit' : ''}`}
      role="status"
      aria-live="polite"
    >
      <div className="toast-notification__content">
        {getIcon()}
        <span className="toast-notification__message">{message}</span>
        <button
          type="button"
          className="toast-notification__close"
          onClick={() => {
            setIsExiting(true)
            setTimeout(onClose, 200)
          }}
          aria-label="Close notification"
        >
          ✕
        </button>
      </div>
      {/* Animated loading line on the bottom border */}
      <div className="toast-notification__progress-track" aria-hidden="true">
        <div
          className="toast-notification__progress-bar"
          style={{ animationDuration: `${duration}ms` }}
        />
      </div>
    </div>
  )
}
