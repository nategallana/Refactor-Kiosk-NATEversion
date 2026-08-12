import { z } from 'zod'
import type { AdminUser } from './admin-store'

const apiBase = import.meta.env.VITE_API_BASE_URL || `${window.location.protocol}//${window.location.hostname}:8000/api/v1`

const userSchema = z.object({ id: z.number(), name: z.string(), email: z.string(), role: z.string() })
const orderSchema = z.object({
  id: z.number(), order_number: z.string(), terminal_id: z.string(), dining_type: z.string(),
  subtotal_minor: z.number(), tax_minor: z.number(), total_minor: z.number(), payment_status: z.string(),
  fulfillment_status: z.string(), placed_at: z.string(),
})
const productSchema = z.object({
  id: z.number(), category_id: z.number(), category_name: z.string(), sku: z.string(), name: z.string(),
  description: z.string().nullable(), price_minor: z.number(), emoji: z.string().nullable(), accent: z.string(),
  active: z.coerce.boolean(), available: z.coerce.boolean(),
})

export type AdminOrder = z.infer<typeof orderSchema>
export type AdminProduct = z.infer<typeof productSchema>

async function apiRequest<T>(path: string, schema: z.ZodType<T>, token?: string | null, init?: RequestInit): Promise<T> {
  const response = await fetch(`${apiBase}${path}`, {
    ...init,
    headers: { Accept: 'application/json', 'Content-Type': 'application/json', ...(token ? { Authorization: `Bearer ${token}` } : {}), ...init?.headers },
  })
  const payload: unknown = await response.json().catch(() => ({ message: 'The server returned an invalid response.' }))
  if (!response.ok) {
    const message = z.object({ message: z.string() }).safeParse(payload)
    throw new Error(message.success ? message.data.message : 'Request failed. Please try again.')
  }
  return schema.parse(payload)
}

export async function login(email: string, password: string): Promise<{ token: string; user: AdminUser }> {
  return apiRequest('/admin/auth/login', z.object({ token: z.string(), user: userSchema }), null, {
    method: 'POST', body: JSON.stringify({ email, password }),
  })
}

export const getDashboard = (token: string) => apiRequest('/admin/dashboard', z.object({
  summary: z.object({ sales_minor: z.number(), orders: z.number(), active_orders: z.number(), available_products: z.number() }),
  recent_orders: z.array(orderSchema),
}), token)

export const getCatalog = (token: string) => apiRequest('/admin/catalog', z.object({ categories: z.array(z.unknown()), products: z.array(productSchema) }), token)
export const setAvailability = (token: string, id: number, available: boolean) => apiRequest(`/admin/products/${id}/availability`, z.object({ product: z.unknown() }), token, { method: 'PATCH', body: JSON.stringify({ available }) })
export const getOrders = (token: string) => apiRequest('/admin/orders', z.object({ orders: z.array(orderSchema) }), token)
export const setOrderStatus = (token: string, id: number, status: string) => apiRequest(`/admin/orders/${id}/status`, z.object({ order: orderSchema }), token, { method: 'PATCH', body: JSON.stringify({ status }) })
export const logout = (token: string) => apiRequest('/admin/auth/logout', z.object({ message: z.string() }), token, { method: 'POST' })
