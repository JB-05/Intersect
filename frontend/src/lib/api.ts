import { supabase } from './supabase'
import type { KnownFace } from '@/types'

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

/** POST known face with optional photo and optional 128-d embedding (multipart). */
export async function postKnownFace(
  patientId: string,
  payload: { name: string; relationship?: string; photo?: File; embedding?: number[] }
): Promise<KnownFace> {
  const base = API_URL || '/api/v1'
  const url = `${base}/patients/${patientId}/known-faces`
  const { data: { session } } = await supabase.auth.getSession()
  const form = new FormData()
  form.append('name', payload.name.trim())
  if (payload.relationship?.trim()) form.append('relationship', payload.relationship.trim())
  if (payload.photo) form.append('photo', payload.photo, payload.photo.name || 'photo.jpg')
  if (payload.embedding && payload.embedding.length === 128) {
    form.append('embedding', JSON.stringify(payload.embedding))
  }
  const headers: Record<string, string> = {}
  if (session?.access_token) {
    headers['Authorization'] = `Bearer ${session.access_token}`
  }
  const res = await fetch(url, {
    method: 'POST',
    headers,
    body: form,
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
  return res.json()
}

/** Recognize face from 128-d descriptor. Returns { matched, name?, relationship? }. */
export async function recognizeFace(
  patientId: string,
  embedding: number[]
): Promise<{ matched: boolean; name?: string; relationship?: string }> {
  const base = API_URL || '/api/v1'
  const url = `${base}/patients/${patientId}/recognize-face`
  const headers: Record<string, string> = { 'Content-Type': 'application/json' }
  const { data: { session } } = await supabase.auth.getSession()
  if (session?.access_token) headers['Authorization'] = `Bearer ${session.access_token}`
  const res = await fetch(url, {
    method: 'POST',
    headers,
    body: JSON.stringify({ embedding }),
  })
  if (!res.ok) {
    const err = await res.json().catch(() => ({ detail: res.statusText }))
    throw new Error(err.detail ?? 'Recognition failed')
  }
  return res.json()
}

/** Response from POST /patient/interact (voice assistant) */
export interface PatientInteractResponse {
  transcript: string
  intent: string
  response: string
  /** Present when request used with_tts=true */
  response_audio_base64?: string
  response_audio_media_type?: string
}

/** Multipart form POST for patient voice interaction. withTts=true returns response as TTS audio (base64) for one-click demo. */
export async function postPatientInteract(
  patientId: string,
  audioBlob: Blob,
  options?: { withTts?: boolean }
): Promise<PatientInteractResponse> {
  const base = API_URL || '/api/v1'
  const url = `${base}/patient/interact`
  const { data: { session } } = await supabase.auth.getSession()
  const form = new FormData()
  form.append('audio', audioBlob, 'audio.webm')
  form.append('patient_id', patientId)
  if (options?.withTts) form.append('with_tts', 'true')
  const headers: Record<string, string> = {}
  if (session?.access_token) {
    headers['Authorization'] = `Bearer ${session.access_token}`
  }
  const res = await fetch(url, {
    method: 'POST',
    headers,
    body: form,
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
  return res.json()
}

/** Fetch TTS audio for text (e.g. assistant response). Returns blob for playback. */
export async function getPatientTtsAudio(text: string): Promise<Blob> {
  const base = API_URL || '/api/v1'
  const url = `${base}/patient/tts`
  const { data: { session } } = await supabase.auth.getSession()
  const form = new FormData()
  form.append('text', text)
  const headers: Record<string, string> = {}
  if (session?.access_token) {
    headers['Authorization'] = `Bearer ${session.access_token}`
  }
  const res = await fetch(url, {
    method: 'POST',
    headers,
    body: form,
  })
  if (!res.ok) {
    const err = await res.json().catch(() => ({ detail: res.statusText }))
    throw new Error(err.detail ?? 'TTS failed')
  }
  return res.blob()
}

/** List notifications (alerts, appointments, medicine reminders). Optionally filter by patient. */
export async function getNotifications(patientId?: string): Promise<import('@/types').Notification[]> {
  const base = API_URL || '/api/v1'
  const url = patientId ? `${base}/notifications?patient_id=${encodeURIComponent(patientId)}` : `${base}/notifications`
  const headers = await getAuthHeaders()
  const res = await fetch(url, { headers })
  if (res.status === 401) throw new Error('UNAUTHORIZED')
  if (!res.ok) {
    const err = await res.json().catch(() => ({ detail: res.statusText }))
    throw new Error(err.detail ?? 'Failed to load notifications')
  }
  return res.json()
}

/** POST restricted area with optional image (multipart). */
export async function postRestrictedArea(
  patientId: string,
  payload: { name: string; image?: File }
): Promise<import('@/types').RestrictedArea> {
  const base = API_URL || '/api/v1'
  const url = `${base}/patients/${patientId}/restricted-areas`
  const { data: { session } } = await supabase.auth.getSession()
  const form = new FormData()
  form.append('name', payload.name.trim())
  if (payload.image) form.append('image', payload.image, payload.image.name || 'image.jpg')
  const headers: Record<string, string> = {}
  if (session?.access_token) headers['Authorization'] = `Bearer ${session.access_token}`
  const res = await fetch(url, { method: 'POST', headers, body: form })
  if (res.status === 401) throw new Error('UNAUTHORIZED')
  if (!res.ok) {
    const err = await res.json().catch(() => ({ detail: res.statusText }))
    throw new Error(err.detail ?? 'Failed to add restricted area')
  }
  return res.json()
}

/** PATCH restricted area (name, camera_enabled, audio_enabled). */
export async function patchRestrictedArea(
  patientId: string,
  areaId: string,
  body: { name?: string; camera_enabled?: boolean; audio_enabled?: boolean }
): Promise<import('@/types').RestrictedArea> {
  return api.patch(`/patients/${patientId}/restricted-areas/${areaId}`, body)
}

export const api = {
  get: <T>(path: string) => fetcher<T>(path),
  post: <T>(path: string, body: unknown) =>
    fetcher<T>(path, { method: 'POST', body: JSON.stringify(body) }),
  patch: <T>(path: string, body: unknown) =>
    fetcher<T>(path, { method: 'PATCH', body: JSON.stringify(body) }),
  delete: (path: string) => fetcher<void>(path, { method: 'DELETE' }),
}
