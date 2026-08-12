import { create } from 'zustand'
import { persist } from 'zustand/middleware'
import type { CartItem, DiningType, OrderReceipt } from '../domain/order'

interface KioskState {
  diningType: DiningType | null
  items: CartItem[]
  receipt: OrderReceipt | null
  setDiningType: (value: DiningType) => void
  addItem: (item: CartItem) => void
  updateQuantity: (id: string, quantity: number) => void
  removeItem: (id: string) => void
  setReceipt: (receipt: OrderReceipt) => void
  reset: () => void
}

const initialState = { diningType: null, items: [], receipt: null }

export const useKioskStore = create<KioskState>()(persist((set) => ({
  ...initialState,
  setDiningType: (diningType) => set({ diningType }),
  addItem: (item) => set((state) => ({ items: [...state.items, item] })),
  updateQuantity: (id, quantity) => set((state) => ({
    items: quantity < 1 ? state.items.filter((item) => item.id !== id) : state.items.map((item) => item.id === id ? { ...item, quantity } : item),
  })),
  removeItem: (id) => set((state) => ({ items: state.items.filter((item) => item.id !== id) })),
  setReceipt: (receipt) => set({ receipt, items: [] }),
  reset: () => set(initialState),
}), { name: 'standalone-kiosk-cart', partialize: ({ diningType, items, receipt }) => ({ diningType, items, receipt }) }))
