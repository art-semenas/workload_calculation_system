import { create } from 'zustand'
import { persist } from 'zustand/middleware'

interface User {
  id: string
  email: string
  name: string
  role: 'admin' | 'editor' | 'viewer' | 'engineer'
}

interface AuthState {
  token: string | null
  user: User | null
  login: (token: string, user: User) => void
  logout: () => void
  isAuthenticated: () => boolean
}

export const useAuthStore = create<AuthState>()(
  persist(
    (set, get) => ({
      token: null,
      user: null,
      login: (token, user) => set({ token, user }),
      logout: () => set({ token: null, user: null }),
      isAuthenticated: () => get().token !== null,
    }),
    { name: 'auth' } // persists to localStorage under key 'auth'
  )
)
