import { z } from 'zod'
import { useAdminStore, type AdminUser } from './admin-store'

const rawApiBase = import.meta.env.VITE_API_BASE_URL || import.meta.env.VITE_API_BASE || 'http://localhost:8000/api/v1'
const apiBase = rawApiBase.endsWith('/v1') ? rawApiBase : `${rawApiBase.replace(/\/+$/, '')}/v1`

const userSchema = z.object({ id: z.number(), name: z.string(), email: z.string(), role: z.string() })
const orderSchema = z.object({
  id: z.number(), order_number: z.string(), terminal_id: z.string(), dining_type: z.string(),
  subtotal_minor: z.number(), tax_minor: z.number(), total_minor: z.number(), payment_status: z.string(),
  fulfillment_status: z.string(), placed_at: z.string(),
  items_json: z.string().nullable().optional(),
})
const productSchema = z.object({
  id: z.number(), category_id: z.number(), category_name: z.string(), sku: z.string(), name: z.string(),
  description: z.string().nullable(), price_minor: z.number(), emoji: z.string().nullable(), accent: z.string(),
  active: z.coerce.boolean(), available: z.coerce.boolean(),
})
const settingsSchema = z.object({
  id: z.coerce.number(),
  brand_name: z.string(),
  tax_rate_basis_points: z.coerce.number().int(),
  service_mode: z.enum(['dine-in', 'takeout', 'both']),
  currency: z.literal('PHP'),
  counter_payment_enabled: z.coerce.boolean(),
  card_payment_enabled: z.coerce.boolean(),
  idle_timeout_seconds: z.coerce.number().int(),
  auto_reset_seconds: z.coerce.number().int(),
  receipt_header: z.string().nullish(),
  receipt_footer: z.string().nullish(),
  welcome_background_url: z.string().nullish(),
  welcome_background_image: z.string().nullish(),
  timezone: z.string().nullish(),
  wbox_enabled: z.coerce.boolean().nullish().transform((v) => Boolean(v)),
  wbox_request_path: z.string().nullish().transform((v) => v ?? null),
  wbox_response_path: z.string().nullish().transform((v) => v ?? null),
  wbox_kiosk_number: z.string().nullish().transform((v) => v || 'KIOSK-01'),
  wbox_version: z.string().nullish().transform((v) => v || '1.0'),
  wbox_pdaver: z.string().nullish().transform((v) => v || '1.0'),
  wbox_server: z.string().nullish().transform((v) => v || '127.0.0.1'),
  wbox_device: z.string().nullish().transform((v) => v || 'POS-01'),
  wbox_product: z.string().nullish().transform((v) => v || 'RETAIL'),
  wbox_response_filename: z.string().nullish().transform((v) => v || 'response.json'),
  wbox_retry_seconds: z.coerce.number().nullish().transform((v) => v ?? 60),
  wbox_auth_token_configured: z.coerce.boolean().nullish().transform((v) => Boolean(v)),
  created_at: z.string().nullish(),
  updated_at: z.string().nullish(),
})

export type AdminOrder = z.infer<typeof orderSchema>
export type AdminProduct = z.infer<typeof productSchema>
export type AdminSettings = z.infer<typeof settingsSchema>
export type AdminSettingsUpdate = Omit<
  AdminSettings,
  | 'id'
  | 'created_at'
  | 'updated_at'
  | 'wbox_version'
  | 'wbox_pdaver'
  | 'wbox_server'
  | 'wbox_device'
  | 'wbox_product'
  | 'wbox_response_filename'
  | 'wbox_retry_seconds'
  | 'wbox_auth_token_configured'
> & {
  wbox_version?: string
  wbox_pdaver?: string
  wbox_server?: string
  wbox_device?: string
  wbox_product?: string
  wbox_response_filename?: string
  wbox_retry_seconds?: number
  wbox_auth_token_configured?: boolean
  wbox_auth_token?: string
}

export class RateLimitError extends Error {
  retryAfterSeconds: number

  constructor(retryAfterSeconds: number) {
    super('Too many login attempts. Try again in ' + retryAfterSeconds + ' seconds.')
    this.name = 'RateLimitError'
    this.retryAfterSeconds = retryAfterSeconds
  }
}

async function apiRequest<T>(path: string, schema: z.ZodType<T>, token?: string | null, init?: RequestInit): Promise<T> {
  const response = await fetch(`${apiBase}${path}`, {
    ...init,
    headers: { Accept: 'application/json', 'Content-Type': 'application/json', ...(token ? { Authorization: `Bearer ${token}` } : {}), ...init?.headers },
  })
  const payload: unknown = await response.json().catch(() => ({ message: 'The server returned an invalid response.' }))
  if (!response.ok) {
    if (response.status === 429) {
      const retryAfter = Number.parseInt(response.headers.get('Retry-After') ?? '60', 10)
      throw new RateLimitError(Number.isFinite(retryAfter) && retryAfter > 0 ? retryAfter : 60)
    }
    if (response.status === 401) {
      useAdminStore.getState().signOut()
      window.dispatchEvent(new CustomEvent('admin:session-expired'))
      throw new Error('Your session expired. Please sign in again.')
    }
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
export const getSettings = (token: string) => apiRequest('/admin/settings', z.object({ settings: settingsSchema }), token)
export const updateSettings = (token: string, settings: AdminSettingsUpdate) =>
  apiRequest('/admin/settings', z.object({ settings: settingsSchema }), token, { method: 'PUT', body: JSON.stringify(settings) })

// Terminal Management
const authHeaders = (token: string) => ({ Authorization: `Bearer ${token}` })

export async function getTerminals(token: string) {
  const res = await fetch(`${apiBase}/admin/terminals`, { headers: authHeaders(token) })
  if (!res.ok) throw new Error('Failed to load terminals')
  return res.json()
}

export async function createTerminal(token: string, data: { terminal_id: string; name: string; location?: string; service_mode?: string }) {
  const res = await fetch(`${apiBase}/admin/terminals`, {
    method: 'POST',
    headers: { ...authHeaders(token), 'Content-Type': 'application/json' },
    body: JSON.stringify(data),
  })
  if (!res.ok) throw new Error('Failed to create terminal')
  return res.json()
}

export async function updateTerminal(token: string, terminalId: string, data: Record<string, unknown>) {
  const res = await fetch(`${apiBase}/admin/terminals/${terminalId}`, {
    method: 'PATCH',
    headers: { ...authHeaders(token), 'Content-Type': 'application/json' },
    body: JSON.stringify(data),
  })
  if (!res.ok) throw new Error('Failed to update terminal')
  return res.json()
}

export async function deleteTerminal(token: string, terminalId: string) {
  const res = await fetch(`${apiBase}/admin/terminals/${terminalId}`, {
    method: 'DELETE',
    headers: authHeaders(token),
  })
  if (!res.ok) throw new Error('Failed to delete terminal')
  return res.json()
}

export async function sendTerminalCommand(token: string, terminalId: string, command: string) {
  const res = await fetch(`${apiBase}/admin/terminals/${terminalId}/command`, {
    method: 'POST',
    headers: { ...authHeaders(token), 'Content-Type': 'application/json' },
    body: JSON.stringify({ command }),
  })
  if (!res.ok) throw new Error('Failed to send command')
  return res.json()
}

export async function uploadWelcomeBackground(token: string, file: File): Promise<{ url: string }> {
  const formData = new FormData()
  formData.append('image', file)
  const res = await fetch(`${apiBase}/admin/settings/upload-background`, {
    method: 'POST',
    headers: {
      Accept: 'application/json',
      Authorization: `Bearer ${token}`,
    },
    body: formData,
  })
  if (!res.ok) {
    const errorData = await res.json().catch(() => ({ message: 'Failed to upload background image' }))
    throw new Error(errorData.message || 'Failed to upload background image')
  }
  return res.json()
}

export async function createActivationCode(token: string): Promise<{ activation_code: string; expires_at: string }> {
  return apiRequest('/admin/terminals/activation-codes', z.object({ activation_code: z.string(), expires_at: z.string() }), token, { method: 'POST' })
}

export async function getWboxStatus(token: string): Promise<{
  connection: {
    request_path: { exists: boolean; writable: boolean }
    response_path: { exists: boolean; readable: boolean }
    credentials_configured: boolean
  }
}> {
  return apiRequest(
    '/admin/settings/wbox/status',
    z.object({
      connection: z.object({
        request_path: z.object({ exists: z.boolean(), writable: z.boolean() }),
        response_path: z.object({ exists: z.boolean(), readable: z.boolean() }),
        credentials_configured: z.boolean(),
      }),
    }),
    token
  )
}

export async function retryWboxExport(token: string, orderId: number): Promise<{ success: boolean; message: string }> {
  return apiRequest(`/admin/orders/${orderId}/wbox-retry`, z.object({ success: z.boolean(), message: z.string() }), token, { method: 'POST' })
}

export async function setWboxMapping(token: string, productId: number, menukey: string): Promise<{ success: boolean }> {
  return apiRequest(`/admin/products/${productId}/wbox-mapping`, z.object({ success: z.boolean() }), token, { method: 'PUT', body: JSON.stringify({ menukey }) })
}

export type WboxSyncResult = {
  success: boolean
  pending?: boolean
  inquiry_sent?: boolean
  source_file?: string | null
  updated?: number
  created?: number
  total?: number
  message: string
}

export async function syncWboxCatalog(
  token: string,
  items?: Array<{ menukey: string; name: string; price: number; category?: string; available?: boolean }>
): Promise<WboxSyncResult> {
  const schema = z.object({
    success: z.boolean(),
    pending: z.boolean().optional(),
    inquiry_sent: z.boolean().optional(),
    source_file: z.string().nullish(),
    updated: z.number().optional(),
    created: z.number().optional(),
    total: z.number().optional(),
    message: z.string(),
  })
  return apiRequest('/admin/catalog/wbox-sync', schema, token, {
    method: 'POST',
    body: items ? JSON.stringify({ items }) : undefined,
  })
}

