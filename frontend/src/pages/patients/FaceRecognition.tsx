import { useState, useRef, useEffect, useCallback } from 'react'
import { useParams } from 'react-router-dom'
import { usePatient } from '@/hooks/usePatient'
import { recognizeFace, getPatientTtsAudio } from '@/lib/api'
import { Button } from '@/components/ui/Button'
import * as faceapi from 'face-api.js'

const MODEL_URL = 'https://cdn.jsdelivr.net/gh/justadudewhohacks/face-api.js@0.22.2/weights'
const INTERVAL_MS = 2000
const ANNOUNCE_COOLDOWN_MS = 15000

/** Hardcoded Malayalam words for relationship (used for TTS announcement). */
const RELATIONSHIP_TO_MALAYALAM: Record<string, string> = {
  daughter: 'മകൾ',
  son: 'മകൻ',
  wife: 'ഭാര്യ',
  husband: 'ഭർത്താവ്',
  mother: 'അമ്മ',
  father: 'അച്ഛൻ',
  sister: 'സഹോദരി',
  brother: 'സഹോദരൻ',
  grandmother: 'മുത്തശ്ശി',
  grandfather: 'മുത്തശ്ശൻ',
  granddaughter: 'മകളുടെ മകൾ',
  grandson: 'മകളുടെ മകൻ',
  niece: 'സഹോദരിയുടെ മകൾ',
  nephew: 'സഹോദരിയുടെ മകൻ',
  aunt: 'അമ്മായി',
  uncle: 'മാമൻ',
  cousin: 'സഹോദരപുത്രൻ',
  neighbor: 'യാത്രാസുഹൃത്ത്',
  neighbour: 'യാത്രാസുഹൃത്ത്',
  carer: 'പരിചാരകൻ',
  caregiver: 'പരിചാരകൻ',
  nurse: 'നഴ്സ്',
  doctor: 'ഡോക്ടർ',
  friend: 'സുഹൃത്ത്',
  helper: 'സഹായി',
}

function relationshipForTts(relationship: string): string {
  const key = (relationship || '').trim().toLowerCase()
  if (!key) return ''
  return RELATIONSHIP_TO_MALAYALAM[key] ?? key
}

export function FaceRecognition() {
  const { id: patientId } = useParams<{ id: string }>()
  usePatient(patientId)
  const videoRef = useRef<HTMLVideoElement>(null)
  const streamRef = useRef<MediaStream | null>(null)
  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null)
  const lastAnnouncedRef = useRef<string | null>(null)
  const lastAnnouncedAtRef = useRef<number>(0)

  const [modelsLoaded, setModelsLoaded] = useState(false)
  const [modelsError, setModelsError] = useState<string | null>(null)
  const [active, setActive] = useState(false)
  const [status, setStatus] = useState<string>('')
  const [recognized, setRecognized] = useState<{ name: string; relationship: string } | null>(null)
  const [playing, setPlaying] = useState(false)

  const playTts = useCallback(async (text: string) => {
    if (playing) return
    setPlaying(true)
    try {
      const blob = await getPatientTtsAudio(text)
      const url = URL.createObjectURL(blob)
      const audio = new Audio(url)
      audio.onended = () => {
        setPlaying(false)
        URL.revokeObjectURL(url)
      }
      audio.onerror = () => setPlaying(false)
      await audio.play()
    } catch {
      setPlaying(false)
    }
  }, [playing])

  useEffect(() => {
    let cancelled = false
    const load = async () => {
      try {
        await Promise.all([
          faceapi.nets.ssdMobilenetv1.loadFromUri(MODEL_URL),
          faceapi.nets.faceLandmark68Net.loadFromUri(MODEL_URL),
          faceapi.nets.faceRecognitionNet.loadFromUri(MODEL_URL),
        ])
        if (!cancelled) {
          setModelsLoaded(true)
          setModelsError(null)
        }
      } catch (e) {
        if (!cancelled) {
          setModelsError(e instanceof Error ? e.message : 'Failed to load face models')
        }
      }
    }
    load()
    return () => { cancelled = true }
  }, [])

  const startCamera = useCallback(async () => {
    if (!patientId || !videoRef.current) return
    setModelsError(null)
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ video: { width: 640, height: 480 } })
      streamRef.current = stream
      videoRef.current.srcObject = stream
      await new Promise<void>((res, rej) => {
        if (!videoRef.current) return rej()
        videoRef.current.onloadedmetadata = () => res()
        videoRef.current.onerror = () => rej(new Error('Video failed'))
      })
      if (videoRef.current) await videoRef.current.play()
      setActive(true)
      setStatus('Camera on. Looking for faces…')
    } catch (e) {
      setModelsError(e instanceof Error ? e.message : 'Camera access denied')
    }
  }, [patientId])

  const stopCamera = useCallback(() => {
    if (intervalRef.current) {
      clearInterval(intervalRef.current)
      intervalRef.current = null
    }
    streamRef.current?.getTracks().forEach((t) => t.stop())
    streamRef.current = null
    if (videoRef.current) videoRef.current.srcObject = null
    setActive(false)
    setRecognized(null)
    setStatus('')
  }, [])

  useEffect(() => {
    if (!active || !patientId || !modelsLoaded || !videoRef.current) return

    const runRecognition = async () => {
      const video = videoRef.current
      if (!video || video.readyState < 2) return
      try {
        const result = await faceapi.detectSingleFace(video).withFaceLandmarks().withFaceDescriptor()
        if (!result || !result.descriptor) return

        const embedding = Array.from(result.descriptor)
        const match = await recognizeFace(patientId, embedding)
        if (match.matched && match.name) {
          setRecognized({ name: match.name, relationship: match.relationship || '' })
          const key = match.name
          const now = Date.now()
          if (lastAnnouncedRef.current !== key || now - lastAnnouncedAtRef.current > ANNOUNCE_COOLDOWN_MS) {
            lastAnnouncedRef.current = key
            lastAnnouncedAtRef.current = now
            const relMalayalam = relationshipForTts(match.relationship || '')
            const text = relMalayalam ? `ഇത് ${match.name}, ${relMalayalam}.` : `ഇത് ${match.name}.`
            await playTts(text)
          }
        } else {
          setRecognized(null)
        }
      } catch {
        setRecognized(null)
      }
    }

    intervalRef.current = setInterval(runRecognition, INTERVAL_MS)
    return () => {
      if (intervalRef.current) clearInterval(intervalRef.current)
    }
  }, [active, patientId, modelsLoaded, playTts])

  useEffect(() => {
    return stopCamera
  }, [stopCamera])

  if (!patientId) return <p className="text-slate-600">No patient selected.</p>

  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-semibold text-slate-900">Face recognition</h1>
      <p className="text-sm text-slate-600">
        Use the camera to detect faces. When a known face is recognized, the app will say in Malayalam: &quot;ഇത് [Name], [Relationship].&quot;
      </p>

      {!modelsLoaded && !modelsError && (
        <p className="text-slate-500">Loading face detection models…</p>
      )}
      {modelsError && (
        <div className="rounded-xl border border-amber-200 bg-amber-50 p-4">
          <p className="text-sm text-amber-800">{modelsError}</p>
          <p className="mt-1 text-xs text-amber-700">Ensure known faces have photos with embeddings (add from Known faces).</p>
        </div>
      )}

      <div className="flex flex-col items-start gap-4">
        <div className="relative rounded-xl overflow-hidden border border-slate-200 bg-slate-900 aspect-video max-w-lg">
          <video
            ref={videoRef}
            className="w-full h-full object-cover"
            playsInline
            muted
          />
          {!active && (
            <div className="absolute inset-0 flex items-center justify-center bg-slate-800/80 text-white">
              <span>Camera off</span>
            </div>
          )}
          {active && recognized && (
            <div className="absolute bottom-2 left-2 right-2 rounded-lg bg-black/70 text-white px-3 py-2 text-sm">
              Recognized: <strong>{recognized.name}</strong>
              {recognized.relationship && ` (${recognized.relationship})`}
            </div>
          )}
        </div>
        <div className="flex gap-2">
          {!active ? (
            <Button size="sm" onClick={startCamera} disabled={!modelsLoaded}>
              Start camera
            </Button>
          ) : (
            <Button size="sm" variant="danger" onClick={stopCamera}>
              Stop camera
            </Button>
          )}
        </div>
        {status && <p className="text-sm text-slate-600">{status}</p>}
      </div>
    </div>
  )
}
