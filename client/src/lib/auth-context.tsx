import { createContext, useContext, useEffect, useState, type ReactNode } from "react"
import { api, extractErrorMessage, getToken, setToken } from "@/lib/api-client"
import type { AuthResponse, RegisterRequest, UserDto } from "@/lib/types"

interface AuthContextValue {
  user: UserDto | null
  isLoading: boolean
  isAuthenticated: boolean
  login: (email: string, password: string) => Promise<UserDto>
  register: (data: RegisterRequest) => Promise<UserDto>
  refreshUser: () => Promise<void>
  logout: () => void
}

const AuthContext = createContext<AuthContextValue | undefined>(undefined)

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<UserDto | null>(null)
  const [isLoading, setIsLoading] = useState(true)

  useEffect(() => {
    const token = getToken()
    if (!token) {
      setIsLoading(false)
      return
    }
    api
      .get<UserDto>("/auth/me")
      .then((res) => setUser(res.data))
      .catch(() => {
        setToken(null)
        setUser(null)
      })
      .finally(() => setIsLoading(false))
  }, [])

  async function login(email: string, password: string) {
    try {
      const res = await api.post<AuthResponse>("/auth/login", { email, password })
      setToken(res.data.accessToken)
      setUser(res.data.user)
      return res.data.user
    } catch (error) {
      throw new Error(extractErrorMessage(error, "Giriş başarısız."))
    }
  }

  async function register(data: RegisterRequest) {
    try {
      const res = await api.post<AuthResponse>("/auth/register", data)
      setToken(res.data.accessToken)
      setUser(res.data.user)
      return res.data.user
    } catch (error) {
      throw new Error(extractErrorMessage(error, "Kayıt başarısız."))
    }
  }

  async function refreshUser() {
    if (!getToken()) return
    const res = await api.get<UserDto>("/auth/me")
    setUser(res.data)
  }

  function logout() {
    setToken(null)
    setUser(null)
  }

  return (
    <AuthContext.Provider value={{ user, isLoading, isAuthenticated: !!user, login, register, refreshUser, logout }}>
      {children}
    </AuthContext.Provider>
  )
}

export function useAuth() {
  const ctx = useContext(AuthContext)
  if (!ctx) throw new Error("useAuth must be used within an AuthProvider")
  return ctx
}
