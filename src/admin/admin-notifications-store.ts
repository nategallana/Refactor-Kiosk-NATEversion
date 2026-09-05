import { create } from 'zustand'
import { persist } from 'zustand/middleware'
import { formatPhTime } from '../domain/datetime'

export type NotificationCategory = 'all' | 'orders' | 'system' | 'kiosks' | 'catalog'
export type NotificationSeverity = 'info' | 'success' | 'warning' | 'error'

export interface AdminNotification {
  id: string
  title: string
  message: string
  timestamp: string
  category: 'orders' | 'system' | 'kiosks' | 'catalog'
  severity: NotificationSeverity
  read: boolean
  link?: string
}

const DEFAULT_NOTIFICATIONS: AdminNotification[] = [
  {
    id: 'notif-1',
    title: 'New Order #1042 Placed',
    message: 'Terminal KIOSK-01 received a Dine-In order (2 items) · ₱420.00',
    timestamp: 'Just now',
    category: 'orders',
    severity: 'success',
    read: false,
    link: '/admin/orders',
  },
  {
    id: 'notif-2',
    title: 'WBOX POS Service Active',
    message: 'Local order export bridge is operational and monitored.',
    timestamp: '15 mins ago',
    category: 'system',
    severity: 'info',
    read: false,
    link: '/admin/settings',
  },
  {
    id: 'notif-3',
    title: 'Terminal KIOSK-01 Online',
    message: 'Self-order kiosk (1080 × 1920 Portrait) connected and active.',
    timestamp: '1 hour ago',
    category: 'kiosks',
    severity: 'info',
    read: false,
    link: '/admin/kiosks',
  },
  {
    id: 'notif-4',
    title: 'Menu Catalog Synced',
    message: 'All fast-food items and combo builder options available for ordering.',
    timestamp: '2 hours ago',
    category: 'catalog',
    severity: 'info',
    read: true,
    link: '/admin/catalog',
  },
]

interface NotificationsState {
  notifications: AdminNotification[]
  addNotification: (item: Omit<AdminNotification, 'id' | 'timestamp' | 'read'>) => void
  markAsRead: (id: string) => void
  markAllAsRead: () => void
  removeNotification: (id: string) => void
  clearAll: () => void
}

export const useAdminNotificationsStore = create<NotificationsState>()(
  persist(
    (set) => ({
      notifications: DEFAULT_NOTIFICATIONS,

      addNotification: (item) =>
        set((state) => ({
          notifications: [
            {
              ...item,
              id: 'notif-' + Date.now() + '-' + Math.random().toString(36).slice(2, 6),
              timestamp: formatPhTime(new Date()),
              read: false,
            },
            ...state.notifications,
          ].slice(0, 50), // keep last 50
        })),

      markAsRead: (id) =>
        set((state) => ({
          notifications: state.notifications.map((n) =>
            n.id === id ? { ...n, read: true } : n
          ),
        })),

      markAllAsRead: () =>
        set((state) => ({
          notifications: state.notifications.map((n) => ({ ...n, read: true })),
        })),

      removeNotification: (id) =>
        set((state) => ({
          notifications: state.notifications.filter((n) => n.id !== id),
        })),

      clearAll: () => set({ notifications: [] }),
    }),
    { name: 'standalone-kiosk-admin-notifications' }
  )
)
