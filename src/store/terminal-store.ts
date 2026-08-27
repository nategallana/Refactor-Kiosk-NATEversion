import { create } from 'zustand'
import { persist } from 'zustand/middleware'

const apiBase = (import.meta as unknown as Record<string, Record<string, string>>).env?.VITE_API_BASE ?? '/api/v1'

export interface TerminalState {
  terminalId: string | null
  apiToken: string | null
  registered: boolean
  status: 'online' | 'maintenance' | 'offline'
  lastHeartbeat: string | null

  register: (terminalId: string, name: string, storeId: number, location?: string) => Promise<void>
  sendHeartbeat: (appVersion?: string) => Promise<void>
  clearRegistration: () => void
}

export const useTerminalStore = create<TerminalState>()(
  persist(
    (set, get) => ({
      terminalId: null,
      apiToken: null,
      registered: false,
      status: 'offline',
      lastHeartbeat: null,

      register: async (terminalId, name, storeId, location) => {
        const response = await fetch(`${apiBase}/terminals/register`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json', Accept: 'application/json' },
          body: JSON.stringify({ terminal_id: terminalId, name, store_id: storeId, location: location || null }),
        })
        if (!response.ok) {
          const body = await response.json().catch(() => ({ message: 'Registration failed.' }))
          const validationMessage = body.errors && typeof body.errors === 'object'
            ? Object.values(body.errors).flat().find((message) => typeof message === 'string')
            : null
          throw new Error(validationMessage ?? body.message ?? 'Registration failed.')
        }
        const data = await response.json()
        set({
          terminalId: data.terminal_id,
          apiToken: data.api_token,
          registered: true,
          status: 'online',
        })
      },

      sendHeartbeat: async (appVersion) => {
        const { apiToken, terminalId } = get()
        if (!apiToken || !terminalId) return

        try {
          const response = await fetch(`${apiBase}/terminals/heartbeat`, {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
              Accept: 'application/json',
              Authorization: `Bearer ${apiToken}`,
            },
            body: JSON.stringify({ app_version: appVersion ?? '1.0.0' }),
          })

          if (response.status === 401) {
            get().clearRegistration()
            return
          }

          if (!response.ok) {
            set({ status: 'offline' })
            return
          }

          const data = await response.json()
          set({
            status: data.terminal?.status === 'maintenance' ? 'maintenance' : 'online',
            lastHeartbeat: new Date().toISOString(),
          })
        } catch {
          set({ status: 'offline' })
        }
      },

      clearRegistration: () => {
        set({
          terminalId: null,
          apiToken: null,
          registered: false,
          status: 'offline',
          lastHeartbeat: null,
        })
      },
    }),
    { name: 'kiosk-terminal' },
  ),
)
