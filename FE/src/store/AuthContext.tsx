import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from 'react'
import { api, type AuthUser, AUTH_STORAGE_KEYS, getStoredItem, setStoredItem, removeStoredItem } from '@/lib/api'
import type { UserRole } from '@/types'

interface AuthContextValue {
  user: AuthUser | null
  token: string | null
  loading: boolean
  isAuthenticated: boolean
  login: (email: string, password: string, rememberMe?: boolean) => Promise<UserRole>
  register: (email: string, password: string, fullName: string, rememberMe?: boolean) => Promise<UserRole>
  logout: () => void
  error: string | null
}

const AuthContext = createContext<AuthContextValue | null>(null)

function readStoredUser(): AuthUser | null {
  const raw = getStoredItem(AUTH_STORAGE_KEYS.user)
  if (!raw) return null
  try {
    return JSON.parse(raw) as AuthUser
  } catch {
    removeStoredItem(AUTH_STORAGE_KEYS.user)
    return null
  }
}

export function AuthProvider({ children }: { children: ReactNode }) {
  const [token, setToken] = useState<string | null>(() => getStoredItem(AUTH_STORAGE_KEYS.token))
  const [user, setUser] = useState<AuthUser | null>(() => readStoredUser())
  const [loading, setLoading] = useState(!!token)
  const [error, setError] = useState<string | null>(null)

  // Verify token on mount and on token change
  useEffect(() => {
    if (!token) {
      setLoading(false)
      setUser(null)
      removeStoredItem(AUTH_STORAGE_KEYS.user)
      return
    }

    setLoading(true)
    api.me()
      .then((u) => {
        if (u.role) u.role = u.role.toLowerCase() as any
        setUser(u)
        const remember = !!localStorage.getItem(AUTH_STORAGE_KEYS.token)
        setStoredItem(AUTH_STORAGE_KEYS.user, JSON.stringify(u), remember)
        setError(null)
      })
      .catch((err) => {
        console.error('Token verification failed:', err)
        removeStoredItem(AUTH_STORAGE_KEYS.token)
        removeStoredItem(AUTH_STORAGE_KEYS.refreshToken)
        removeStoredItem(AUTH_STORAGE_KEYS.user)
        setToken(null)
        setUser(null)
        setError(err instanceof Error ? err.message : 'Session expired')
      })
      .finally(() => setLoading(false))
  }, [token])

  const login = useCallback(async (email: string, password: string, rememberMe = false) => {
    setError(null)
    setLoading(true)
    try {
      const response = await api.login(email, password)
      const userRole = response.user.role.toLowerCase() as UserRole
      response.user.role = userRole as any

      setToken(response.token)
      setUser(response.user)
      setStoredItem(AUTH_STORAGE_KEYS.token, response.token, rememberMe)
      setStoredItem(AUTH_STORAGE_KEYS.refreshToken, response.refreshToken, rememberMe)
      setStoredItem(AUTH_STORAGE_KEYS.user, JSON.stringify(response.user), rememberMe)

      return userRole
    } catch (err) {
      const msg = err instanceof Error ? err.message : 'Login failed'
      setError(msg)
      throw err
    } finally {
      setLoading(false)
    }
  }, [])

  const register = useCallback(async (email: string, password: string, fullName: string, rememberMe = true) => {
    setError(null)
    setLoading(true)
    try {
      const response = await api.register({ email, password, fullName })
      const userRole = response.user.role.toLowerCase() as UserRole
      response.user.role = userRole as any

      setToken(response.token)
      setUser(response.user)
      setStoredItem(AUTH_STORAGE_KEYS.token, response.token, rememberMe)
      setStoredItem(AUTH_STORAGE_KEYS.refreshToken, response.refreshToken, rememberMe)
      setStoredItem(AUTH_STORAGE_KEYS.user, JSON.stringify(response.user), rememberMe)

      return userRole
    } catch (err) {
      const msg = err instanceof Error ? err.message : 'Registration failed'
      setError(msg)
      throw err
    } finally {
      setLoading(false)
    }
  }, [])

  const logout = useCallback(() => {
    removeStoredItem(AUTH_STORAGE_KEYS.token)
    removeStoredItem(AUTH_STORAGE_KEYS.refreshToken)
    removeStoredItem(AUTH_STORAGE_KEYS.user)
    setToken(null)
    setUser(null)
    setError(null)
  }, [])

  const value = useMemo(
    () => ({
      user,
      token,
      loading,
      isAuthenticated: !!token && !!user,
      login,
      register,
      logout,
      error,
    }),
    [user, token, loading, login, register, logout, error],
  )

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>
}

export function useAuth() {
  const ctx = useContext(AuthContext)
  if (!ctx) throw new Error('useAuth must be used within AuthProvider')
  return ctx
}
