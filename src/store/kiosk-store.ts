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
  welcome_background_url: string | null
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
  welcome_background_url: null,
}

interface CheckoutAttempt {
  key: string
  requestFingerprint: string
}

export function checkIsTerminalMaintenance(terminalId = 'KIOSK-01'): boolean {
  if (typeof window === 'undefined') return false
  const direct = localStorage.getItem(`kiosk_terminal_${terminalId}_status`)
  if (direct) return direct === 'maintenance'
  const fleetStr = localStorage.getItem('kiosk_terminals_fleet')
  if (fleetStr) {
    try {
      const fleet = JSON.parse(fleetStr)
      const found = Array.isArray(fleet) ? fleet.find((t: { id: string }) => t.id === terminalId) : null
      if (found) return found.status === 'maintenance'
    } catch {
      // fallback
    }
  }
  return localStorage.getItem('kiosk_is_maintenance') === 'true'
}

interface KioskState {
  diningType: DiningType | null
  items: CartItem[]
  receipt: OrderReceipt | null
  checkoutAttempt: CheckoutAttempt | null
  settings: PublicSettings
  terminalId: string
  isMaintenance: boolean
  setDiningType: (value: DiningType) => void
  addItem: (item: CartItem) => void
  updateQuantity: (id: string, quantity: number) => void
  removeItem: (id: string) => void
  getCheckoutIdempotencyKey: (requestFingerprint: string) => string
  setReceipt: (receipt: OrderReceipt) => void
  setSettings: (settings: PublicSettings) => void
  setTerminalId: (id: string) => void
  setMaintenance: (isMaintenance: boolean) => void
  fetchSettings: () => Promise<void>
  reset: () => void
}

const initialState = {
  diningType: null,
  items: [],
  receipt: null,
  checkoutAttempt: null,
  terminalId: 'KIOSK-01',
  isMaintenance: typeof window !== 'undefined' ? checkIsTerminalMaintenance('KIOSK-01') : false,
}
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
  setTerminalId: (terminalId: string) => set({ terminalId, isMaintenance: checkIsTerminalMaintenance(terminalId) }),
  setMaintenance: (isMaintenance: boolean) => {
    const termId = get().terminalId || 'KIOSK-01'
    if (typeof window !== 'undefined') {
      localStorage.setItem(`kiosk_terminal_${termId}_status`, isMaintenance ? 'maintenance' : 'online')
      localStorage.setItem('kiosk_is_maintenance', isMaintenance ? 'true' : 'false')
    }
    set({ isMaintenance })
  },
  fetchSettings: async () => {
    const termId = get().terminalId || 'KIOSK-01'
    set({ isMaintenance: checkIsTerminalMaintenance(termId) })
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
              welcome_background_url: data.settings.welcome_background_url || null,
            },
          })
        }
      }
    } catch {
      // offline fallback maintains existing or default settings
    }
  },
  reset: () => set((state) => ({ ...initialState, settings: state.settings, isMaintenance: checkIsTerminalMaintenance(state.terminalId) })),
}), { name: 'standalone-kiosk-cart', partialize: ({ diningType, items, receipt, checkoutAttempt, settings, terminalId, isMaintenance }) => ({ diningType, items, receipt, checkoutAttempt, settings, terminalId, isMaintenance }) }))
