import { create } from 'zustand'
import { persist } from 'zustand/middleware'
import type { UserProfile } from '../types'

type AuthState = {
  accessToken: string | null
  refreshToken: string | null
  user: UserProfile | null
  setAuth: (payload: {
    accessToken: string
    refreshToken: string
    user: UserProfile
  }) => void
  setAccessToken: (accessToken: string) => void
  logout: () => void
}

export const useAuthStore = create<AuthState>()(
  persist(
    (set) => ({
      accessToken: null,
      refreshToken: null,
      user: null,
      setAuth: ({ accessToken, refreshToken, user }) => {
        set({ accessToken, refreshToken, user })
      },
      setAccessToken: (accessToken) => {
        set({ accessToken })
      },
      logout: () => {
        set({ accessToken: null, refreshToken: null, user: null })
      },
    }),
    {
      name: 'docufy-auth',
      partialize: (state) => ({
        accessToken: state.accessToken,
        refreshToken: state.refreshToken,
        user: state.user,
      }),
    },
  ),
)
