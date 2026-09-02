import axios from "axios"

export const API_URL = import.meta.env.VITE_API_URL ?? "http://localhost:5215/api"

export const api = axios.create({ baseURL: API_URL })

const TOKEN_KEY = "t3ventureos_token"

export function getToken() {
  return localStorage.getItem(TOKEN_KEY)
}

export function setToken(token: string | null) {
  if (token) localStorage.setItem(TOKEN_KEY, token)
  else localStorage.removeItem(TOKEN_KEY)
}

api.interceptors.request.use((config) => {
  const token = getToken()
  if (token) config.headers.Authorization = `Bearer ${token}`
  return config
})

export function extractErrorMessage(error: unknown, fallback = "Bir hata oluştu."): string {
  if (axios.isAxiosError(error)) {
    const data = error.response?.data as { error?: string; message?: string } | undefined
    return data?.error ?? data?.message ?? fallback
  }
  return fallback
}
