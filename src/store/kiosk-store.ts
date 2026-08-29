import { create } from 'zustand'
import { persist } from 'zustand/middleware'
import type { CartItem, DiningType, OrderReceipt } from '../domain/order'

export interface PublicSettings {
  brand_name: string
  service_mode: 'both' | 'dine-in' | 'takeout'
  counter_payment_enabled: boolean
  card_payment_enabled: boolean
  idle_timeout_seconds: number
  auto_reset_seconds: number
  receipt_header: string | null
  receipt_footer: string | null
  tax_rate_basis_points: number
<<<<<<< Updated upstream
  welcome_background_image: string | null
=======
  welcome_background_url: string | null
>>>>>>> Stashed changes
}

export const defaultSettings: PublicSettings = {
  brand_name: 'KIOSK',
  service_mode: 'both',
  counter_payment_enabled: true,
  card_payment_enabled: true,
  idle_timeout_seconds: 240,
  auto_reset_seconds: 10,
  receipt_header: null,
  receipt_footer: 'Thank you for dining with us.',
  tax_rate_basis_points: 1200,
<<<<<<< Updated upstream
  welcome_background_image: null,
=======
  welcome_background_url: null,
>>>>>>> Stashed changes
}

interface CheckoutAttempt {
  key: string
  requestFingerprint: string
}

interface KioskState {
  diningType: DiningType | null
  items: CartItem[]
  receipt: OrderReceipt | null
  checkoutAttempt: CheckoutAttempt | null
  settings: PublicSettings
  setDiningType: (value: DiningType) => void
  addItem: (item: CartItem) => void
  updateQuantity: (id: string, quantity: number) => void
  removeItem: (id: string) => void
  getCheckoutIdempotencyKey: (requestFingerprint: string) => string
  setReceipt: (receipt: OrderReceipt) => void
  setSettings: (settings: PublicSettings) => void
  fetchSettings: () => Promise<void>
  reset: () => void
}

const initialState = { diningType: null, items: [], receipt: null, checkoutAttempt: null }
const rawApiBase = import.meta.env.VITE_API_BASE_URL || import.meta.env.VITE_API_BASE || '/api/v1'
const apiBase = rawApiBase.endsWith('/v1') ? rawApiBase : `${rawApiBase.replace(/\/+$/, '')}/v1`

export const useKioskStore = create<KioskState>()(persist((set, get) => ({
  ...initialState,
  settings: defaultSettings,
  setDiningType: (diningType) => set((state) => ({
    diningType,
    checkoutAttempt: state.diningType === diningType ? state.checkoutAttempt : null,
  })),
  addItem: (item) => set((state) => ({ items: [...state.items, item], checkoutAttempt: null })),
  updateQuantity: (id, quantity) => set((state) => ({
    items: quantity < 1 ? state.items.filter((item) => item.id !== id) : state.items.map((item) => item.id === id ? { ...item, quantity } : item),
    checkoutAttempt: null,
  })),
  removeItem: (id) => set((state) => ({ items: state.items.filter((item) => item.id !== id), checkoutAttempt: null })),
  getCheckoutIdempotencyKey: (requestFingerprint) => {
    const existing = get().checkoutAttempt
    if (existing?.requestFingerprint === requestFingerprint) return existing.key

    const key = crypto.randomUUID()
    set({ checkoutAttempt: { key, requestFingerprint } })

    return key
  },
  setReceipt: (receipt) => set({ receipt, items: [], checkoutAttempt: null }),
  setSettings: (settings) => set({ settings }),
  fetchSettings: async () => {
    try {
      const res = await fetch(`${apiBase}/settings`, { headers: { Accept: 'application/json' } })
      if (res.ok) {
        const data = await res.json()
        if (data?.settings) {
          set({
            settings: {
              brand_name: data.settings.brand_name || 'KIOSK',
              service_mode: data.settings.service_mode || 'both',
              counter_payment_enabled: Boolean(data.settings.counter_payment_enabled),
              card_payment_enabled: Boolean(data.settings.card_payment_enabled),
              idle_timeout_seconds: Number(data.settings.idle_timeout_seconds) || 240,
              auto_reset_seconds: Number(data.settings.auto_reset_seconds) || 10,
              receipt_header: data.settings.receipt_header || null,
              receipt_footer: data.settings.receipt_footer || 'Thank you for dining with us.',
              tax_rate_basis_points: Number(data.settings.tax_rate_basis_points) || 1200,
<<<<<<< Updated upstream
              welcome_background_image: data.settings.welcome_background_image || null,
=======
              welcome_background_url: data.settings.welcome_background_url || null,
>>>>>>> Stashed changes
            },
          })
        }
      }
    } catch {
      // offline fallback maintains existing or default settings
    }
  },
  reset: () => set((state) => ({ ...initialState, settings: state.settings })),
}), { name: 'standalone-kiosk-cart', partialize: ({ diningType, items, receipt, checkoutAttempt, settings }) => ({ diningType, items, receipt, checkoutAttempt, settings }) }))
