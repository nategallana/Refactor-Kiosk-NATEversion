import type { Product } from './catalog'

export type DiningType = 'dine-in' | 'takeout'
export type PaymentMethod = 'counter' | 'card'

export interface CartSelection {
  groupId: string
  groupName: string
  valueId: string
  valueName: string
  priceDelta: number
}

export interface CartItem {
  id: string
  productId: string
  sku: string
  name: string
  unitPrice: number
  quantity: number
  selections: CartSelection[]
  note: string
}

export interface OrderReceipt {
  id: string
  orderNumber: string
  createdAt: string
  diningType: DiningType
  paymentMethod: PaymentMethod
  items: CartItem[]
  subtotal: number
  tax: number
  total: number
}

export const selectedUnitPrice = (product: Product, selections: CartSelection[]) =>
  product.basePrice + selections.reduce((sum, item) => sum + item.priceDelta, 0)

export const lineTotal = (item: CartItem) => item.unitPrice * item.quantity

export const cartSubtotal = (items: CartItem[]) => items.reduce((sum, item) => sum + lineTotal(item), 0)

export const calculateTotals = (items: CartItem[]) => {
  const subtotal = cartSubtotal(items)
  const tax = Math.round(subtotal * 0.12)
  return { subtotal, tax, total: subtotal + tax }
}

export const formatMoney = (amount: number) => new Intl.NumberFormat('en-PH', {
  style: 'currency', currency: 'PHP', minimumFractionDigits: 2,
}).format(amount / 100)
