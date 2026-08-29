import { useState, useRef, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import {
  useAdminNotificationsStore,
  type NotificationCategory,
  type AdminNotification,
} from './admin-notifications-store'
import { useAdminStore } from './admin-store'
import { getOrders } from './admin-api'
import { formatMoney } from '../domain/order'

export function AdminNotificationCenter() {
  const [isOpen, setIsOpen] = useState(false)
  const [selectedCategory, setSelectedCategory] = useState<NotificationCategory>('all')
  const popoverRef = useRef<HTMLDivElement>(null)
  const navigate = useNavigate()

  const token = useAdminStore((state) => state.token)
  const notifications = useAdminNotificationsStore((state) => state.notifications)
  const addNotification = useAdminNotificationsStore((state) => state.addNotification)
  const markAsRead = useAdminNotificationsStore((state) => state.markAsRead)
  const markAllAsRead = useAdminNotificationsStore((state) => state.markAllAsRead)
  const removeNotification = useAdminNotificationsStore((state) => state.removeNotification)
  const clearAll = useAdminNotificationsStore((state) => state.clearAll)

  const unreadCount = notifications.filter((n) => !n.read).length

  // Live background polling for incoming orders from any kiosk
  useEffect(() => {
    if (!token) return
    let active = true

    const syncOrders = async () => {
      try {
        const res = await getOrders(token)
        if (!active || !res.orders) return

        const storedKnown = localStorage.getItem('kiosk_admin_known_order_ids')
        const knownIds: string[] = storedKnown ? JSON.parse(storedKnown) : []
        const isFirstRun = knownIds.length === 0

        const newIncoming = res.orders.filter((o) => !knownIds.includes(String(o.id)))
        if (newIncoming.length > 0) {
          const updated = Array.from(new Set([...knownIds, ...res.orders.map((o) => String(o.id))]))
          localStorage.setItem('kiosk_admin_known_order_ids', JSON.stringify(updated))

          if (!isFirstRun) {
            newIncoming.forEach((o) => {
              addNotification({
                title: `New Order #${o.order_number} Received`,
                message: `Terminal ${o.terminal_id} placed a ${o.dining_type} order for ${formatMoney(o.total_minor)}.`,
                category: 'orders',
                severity: 'success',
                link: '/admin/orders',
              })
            })
          }
        }
      } catch {
        // ignore polling connection errors
      }
    }

    syncOrders()
    const timer = setInterval(syncOrders, 8000)
    return () => {
      active = false
      clearInterval(timer)
    }
  }, [token, addNotification])

  // Close on outside click
  useEffect(() => {
    const handlePointerDown = (event: PointerEvent) => {
      if (popoverRef.current && !popoverRef.current.contains(event.target as Node)) {
        setIsOpen(false)
      }
    }
    if (isOpen) {
      document.addEventListener('pointerdown', handlePointerDown)
    }
    return () => document.removeEventListener('pointerdown', handlePointerDown)
  }, [isOpen])

  // Close on Escape key
  useEffect(() => {
    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') setIsOpen(false)
    }
    if (isOpen) {
      document.addEventListener('keydown', handleKeyDown)
    }
    return () => document.removeEventListener('keydown', handleKeyDown)
  }, [isOpen])

  const filtered = notifications.filter((n) => {
    if (selectedCategory === 'all') return true
    return n.category === selectedCategory
  })

  const getCategoryIcon = (category: AdminNotification['category']) => {
    switch (category) {
      case 'orders':
        return '🛎️'
      case 'system':
        return '⚡'
      case 'kiosks':
        return '🖥️'
      case 'catalog':
        return '📋'
      default:
        return '🔔'
    }
  }

  const handleItemClick = (item: AdminNotification) => {
    markAsRead(item.id)
    if (item.link) {
      setIsOpen(false)
      navigate(item.link)
    }
  }

  return (
    <div className="admin-notif-wrapper" ref={popoverRef}>
      <button
        type="button"
        className={`admin-notification-btn ${isOpen ? 'active' : ''}`}
        aria-label="Notifications"
        aria-expanded={isOpen}
        onClick={() => setIsOpen(!isOpen)}
      >
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
          <path d="M18 8A6 6 0 0 0 6 8c0 7-3 9-3 9h18s-3-2-3-9" />
          <path d="M13.73 21a2 2 0 0 1-3.46 0" />
        </svg>
        {unreadCount > 0 && (
          <span className="admin-notif-badge" aria-label={`${unreadCount} unread notifications`}>
            {unreadCount > 9 ? '9+' : unreadCount}
          </span>
        )}
      </button>

      {isOpen && (
        <div className="admin-notif-popover" role="dialog" aria-label="Notifications panel">
          {/* Header */}
          <div className="admin-notif-popover__header">
            <div className="admin-notif-popover__title">
              <strong>Notifications</strong>
              {unreadCount > 0 && <span>{unreadCount} new</span>}
            </div>
            <div className="admin-notif-popover__actions">
              {unreadCount > 0 && (
                <button type="button" onClick={markAllAsRead} title="Mark all as read">
                  ✓ Mark read
                </button>
              )}
              {notifications.length > 0 && (
                <button type="button" onClick={clearAll} title="Clear all notifications">
                  Clear
                </button>
              )}
            </div>
          </div>

          {/* Filter Tabs */}
          <div className="admin-notif-tabs">
            {(
              [
                { id: 'all', label: 'All' },
                { id: 'orders', label: '🛎️ Orders' },
                { id: 'system', label: '⚡ System' },
                { id: 'kiosks', label: '🖥️ Terminals' },
                { id: 'catalog', label: '📋 Catalog' },
              ] as const
            ).map((tab) => {
              const count =
                tab.id === 'all'
                  ? notifications.length
                  : notifications.filter((n) => n.category === tab.id).length
              return (
                <button
                  key={tab.id}
                  type="button"
                  className={`admin-notif-tab ${selectedCategory === tab.id ? 'active' : ''}`}
                  onClick={() => setSelectedCategory(tab.id)}
                >
                  {tab.label} ({count})
                </button>
              )
            })}
          </div>

          {/* List */}
          <div className="admin-notif-list">
            {filtered.length === 0 ? (
              <div className="admin-notif-empty">
                <span>🔔</span>
                <p>No notifications in this section.</p>
              </div>
            ) : (
              filtered.map((item) => (
                <div
                  key={item.id}
                  className={`admin-notif-item ${!item.read ? 'admin-notif-item--unread' : ''}`}
                  onClick={() => handleItemClick(item)}
                >
                  <div className="admin-notif-item__icon" aria-hidden="true">
                    {getCategoryIcon(item.category)}
                  </div>
                  <div className="admin-notif-item__content">
                    <div className="admin-notif-item__title">
                      <strong>{item.title}</strong>
                      <small>{item.timestamp}</small>
                    </div>
                    <p className="admin-notif-item__message">{item.message}</p>
                  </div>
                  <button
                    type="button"
                    className="admin-notif-item__del"
                    title="Dismiss"
                    aria-label="Dismiss notification"
                    onClick={(e) => {
                      e.stopPropagation()
                      removeNotification(item.id)
                    }}
                  >
                    ✕
                  </button>
                </div>
              ))
            )}
          </div>

          {/* Footer */}
          <div className="admin-notif-popover__footer">
            <span>🟢 Realtime kiosk & POS activity</span>
            <span>Refreshes automatically</span>
          </div>
        </div>
      )}
    </div>
  )
}
