import { create } from 'zustand'
import { persist } from 'zustand/middleware'
import type { PlatformStore } from './platform-api'

interface ImpersonationState {
  active: boolean
  sessionId: number | null
  targetUserName: string | null
  targetStoreId: number | null
  expiresAt: string | null
  originalToken: string | null
}

interface PlatformState {
  activeStoreId: number | null
  stores: PlatformStore[]
  impersonation: ImpersonationState
  setActiveStoreId: (storeId: number | null) => void
  setStores: (stores: PlatformStore[]) => void
  setImpersonation: (data: Partial<ImpersonationState>) => void
  clearImpersonation: () => void
}

export const usePlatformStore = create<PlatformState>()(
  persist(
    (set) => ({
      activeStoreId: null,
      stores: [],
      impersonation: {
        active: false,
        sessionId: null,
        targetUserName: null,
        targetStoreId: null,
        expiresAt: null,
        originalToken: null,
      },
      setActiveStoreId: (activeStoreId) => set({ activeStoreId }),
      setStores: (stores) => set({ stores }),
      setImpersonation: (data) =>
        set((state) => ({ impersonation: { ...state.impersonation, ...data, active: true } })),
      clearImpersonation: () =>
        set({
          impersonation: {
            active: false,
            sessionId: null,
            targetUserName: null,
            targetStoreId: null,
            expiresAt: null,
            originalToken: null,
          },
        }),
    }),
    { name: 'super-admin-platform' }
  )
)
