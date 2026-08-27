import { useAdminStore } from '../admin/admin-store'

const apiBase = import.meta.env.VITE_API_BASE_URL || `${window.location.protocol}//${window.location.hostname}:8000/api/v1`

const authHeaders = (token: string, storeId?: number | null) => ({
  Accept: 'application/json',
  'Content-Type': 'application/json',
  Authorization: `Bearer ${token}`,
  ...(storeId ? { 'X-Store-Id': String(storeId) } : {}),
})

async function platformFetch<T>(path: string, token: string, options?: RequestInit, storeId?: number | null): Promise<T> {
  const response = await fetch(`${apiBase}${path}`, {
    ...options,
    headers: { ...authHeaders(token, storeId), ...options?.headers },
  })
  if (!response.ok) {
    if (response.status === 401) {
      useAdminStore.getState().signOut()
      window.dispatchEvent(new CustomEvent('admin:session-expired'))
      throw new Error('Session expired.')
    }
    const err = await response.json().catch(() => ({ message: 'Platform request failed.' }))
    throw new Error(err.message || 'Platform request failed.')
  }
  return response.json()
}

export interface PlatformStore {
  id: number
  name: string
  code: string
  timezone: string
  active: boolean
  created_at: string
}

export interface PlatformUser {
  id: number
  name: string
  email: string
  role: string
  store_id: number | null
  store_name: string | null
  store_role: string | null
  created_at: string
}

export interface PlatformTerminal {
  id: string
  store_id: number
  store_name?: string
  name: string
  location: string | null
  wbox_kiosk_number: string
  status: string
  is_online: boolean
  last_heartbeat_at: string | null
}

export interface SalesSummary {
  orders_count: number
  sales_minor: number
}

export interface StoreSales {
  id: number
  name: string
  orders_count: number
  sales_minor: number
}

export interface AuditLogItem {
  id: number
  actor_id: number | null
  actor_name?: string
  actor_email?: string
  action: string
  entity_type: string
  entity_id: string
  before: string | null
  after: string | null
  created_at: string
}

export const getStores = (token: string) => platformFetch<{ stores: PlatformStore[] }>('/platform/stores', token)
export const createStore = (token: string, data: { name: string; code: string; timezone?: string }) =>
  platformFetch<{ store: PlatformStore }>('/platform/stores', token, { method: 'POST', body: JSON.stringify(data) })
export const updateStore = (token: string, id: number, data: Partial<PlatformStore>) =>
  platformFetch<{ store: PlatformStore }>(`/platform/stores/${id}`, token, { method: 'PATCH', body: JSON.stringify(data) })

export const getUsers = (token: string) => platformFetch<{ users: PlatformUser[] }>('/platform/users', token)
export const updateUser = (token: string, id: number, data: { name?: string; role?: string; store_id?: number | null }) =>
  platformFetch<{ user: PlatformUser }>(`/platform/users/${id}`, token, { method: 'PATCH', body: JSON.stringify(data) })

export const getPlatformTerminals = (token: string, storeId?: number) =>
  platformFetch<{ terminals: PlatformTerminal[] }>(`/platform/terminals${storeId ? `?store_id=${storeId}` : ''}`, token)

export const getSalesReport = (token: string, from?: string, to?: string) =>
  platformFetch<{ summary: SalesSummary; by_store: StoreSales[] }>(
    `/platform/reports/sales?${from ? `from=${from}&` : ''}${to ? `to=${to}` : ''}`,
    token
  )

export const getAuditLogs = (token: string, action?: string, page = 1) =>
  platformFetch<{ data: AuditLogItem[]; current_page: number; last_page: number; total: number }>(
    `/platform/audit-logs?page=${page}${action ? `&action=${encodeURIComponent(action)}` : ''}`,
    token
  )

export const startImpersonation = (token: string, userId: number, storeId: number, reason: string) =>
  platformFetch<{ session_id: number; token: string; expires_at: string; user: PlatformUser }>(
    `/platform/impersonation/${userId}`,
    token,
    { method: 'POST', body: JSON.stringify({ store_id: storeId, reason }) }
  )

export const endImpersonation = (token: string, sessionId: number) =>
  platformFetch<{ message: string }>(`/platform/impersonation/${sessionId}`, token, { method: 'DELETE' })
