import axios, { AxiosError } from 'axios'

const TOKEN_KEY = 'csvs.token'

export const tokenStore = {
  get: () => localStorage.getItem(TOKEN_KEY),
  set: (token: string) => localStorage.setItem(TOKEN_KEY, token),
  clear: () => localStorage.removeItem(TOKEN_KEY),
}

export const http = axios.create({
  baseURL: import.meta.env.VITE_API_BASE_URL ?? '/api',
  timeout: 20000,
})

http.interceptors.request.use((config) => {
  const token = tokenStore.get()
  if (token) config.headers.Authorization = `Bearer ${token}`
  return config
})

/** Called when the session expires; the auth provider wires this to a logout. */
let onUnauthorized: () => void = () => {}
export function setUnauthorizedHandler(handler: () => void) {
  onUnauthorized = handler
}

http.interceptors.response.use(
  (response) => response,
  (error: AxiosError) => {
    const isLogin = error.config?.url?.includes('/auth/login')
    if (error.response?.status === 401 && !isLogin) {
      tokenStore.clear()
      onUnauthorized()
    }
    return Promise.reject(error)
  },
)

interface ProblemDetail {
  detail?: string
  title?: string
  errors?: Record<string, string>
}

/** Field-level validation errors returned by the backend (400). */
export function getFieldErrors(error: unknown): Record<string, string> {
  if (axios.isAxiosError<ProblemDetail>(error)) return error.response?.data?.errors ?? {}
  return {}
}

/** Human-readable message for any API failure. */
export function getErrorMessage(error: unknown, fallback = 'Something went wrong. Please try again.'): string {
  if (axios.isAxiosError<ProblemDetail>(error)) {
    if (!error.response) return 'Cannot reach the server. Check that the backend is running.'
    return error.response.data?.detail ?? error.response.data?.title ?? fallback
  }
  return error instanceof Error ? error.message : fallback
}
