import { supabase } from './supabase'

// Use proxy (same-origin) so auth headers are preserved. Proxy: /api -> localhost:8000
const API_URL = import.meta.env.VITE_API_URL || ''

async function getAuthHeaders(): Promise<HeadersInit> {
  const { data: { session } } = await supabase.auth.getSession()
  const headers: Record<string, string> = {
    'Content-Type': 'application/json',
  }
  if (session?.access_token) {
    headers['Authorization'] = `Bearer ${session.access_token}`
  } else {
    console.warn('[API] No Supabase session - requests will fail with 401')
  }
  return headers
}

async function fetcher<T>(path: string, options?: RequestInit): Promise<T> {
  const base = API_URL || '/api/v1'
  const url = path.startsWith('http') ? path : `${base}${path}`
  const headers = await getAuthHeaders()
  const res = await fetch(url, {
    ...options,
    headers: { ...headers, ...options?.headers } as HeadersInit,
  })
  if (res.status === 401) {
    const err = new Error('UNAUTHORIZED') as Error & { status: number }
    err.status = 401
    throw err
  }
  if (!res.ok) {
    const err = await res.json().catch(() => ({ detail: res.statusText }))
    throw new Error(err.detail ?? 'Request failed')
  }
  if (res.status === 204 || res.headers.get('content-length') === '0') {
    return {} as T
  }
  return res.json()
}

export const api = {
  get: <T>(path: string) => fetcher<T>(path),
  post: <T>(path: string, body: unknown) =>
    fetcher<T>(path, { method: 'POST', body: JSON.stringify(body) }),
  patch: <T>(path: string, body: unknown) =>
    fetcher<T>(path, { method: 'PATCH', body: JSON.stringify(body) }),
  delete: (path: string) => fetcher<void>(path, { method: 'DELETE' }),
}
