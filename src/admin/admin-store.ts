import { create } from 'zustand'
import { persist } from 'zustand/middleware'

export interface AdminUser { id: number; name: string; email: string; role: string }

interface AdminState {
  token: string | null
  user: AdminUser | null
  signIn: (token: string, user: AdminUser) => void
  signOut: () => void
}

export const useAdminStore = create<AdminState>()(persist((set) => ({
  token: null,
  user: null,
  signIn: (token, user) => set({ token, user }),
  signOut: () => set({ token: null, user: null }),
}), { name: 'standalone-kiosk-admin' }))
