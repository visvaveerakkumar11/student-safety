import { createContext, useCallback, useContext, useEffect, useMemo, useState, type ReactNode } from 'react'

import { authApi } from '@/services/api'
import { setUnauthorizedHandler, tokenStore } from '@/services/http'
import type { Admin } from '@/types/api'

interface AuthState {
  admin: Admin | null
  /** True while an existing token is being verified on startup. */
  initializing: boolean
  login: (email: string, password: string) => Promise<void>
  logout: () => void
}

const AuthContext = createContext<AuthState | null>(null)

export function AuthProvider({ children }: { children: ReactNode }) {
  const [admin, setAdmin] = useState<Admin | null>(null)
  const [initializing, setInitializing] = useState(() => tokenStore.get() !== null)

  const logout = useCallback(() => {
    tokenStore.clear()
    setAdmin(null)
  }, [])

  useEffect(() => {
    setUnauthorizedHandler(() => setAdmin(null))
    if (!tokenStore.get()) return
    authApi.me()
      .then(setAdmin)
      .catch(() => tokenStore.clear())
      .finally(() => setInitializing(false))
  }, [])

  const login = useCallback(async (email: string, password: string) => {
    const response = await authApi.login(email, password)
    tokenStore.set(response.token)
    setAdmin(response.admin)
  }, [])

  const value = useMemo(() => ({ admin, initializing, login, logout }), [admin, initializing, login, logout])
  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>
}

// eslint-disable-next-line react-refresh/only-export-components
export function useAuth() {
  const ctx = useContext(AuthContext)
  if (!ctx) throw new Error('useAuth must be used inside AuthProvider')
  return ctx
}
