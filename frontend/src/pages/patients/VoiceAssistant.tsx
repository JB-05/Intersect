import { useState, useRef, useCallback, useEffect } from 'react'
import { useParams } from 'react-router-dom'
import { usePatient } from '@/hooks/usePatient'
import { postPatientInteract, getPatientTtsAudio, type PatientInteractResponse } from '@/lib/api'
import { Button } from '@/components/ui/Button'

export function VoiceAssistant() {
  const { id: patientId } = useParams<{ id: string }>()
  usePatient(patientId)
  const [result, setResult] = useState<PatientInteractResponse | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [loading, setLoading] = useState(false)
  const [recording, setRecording] = useState(false)
  const [mode, setMode] = useState<'push' | 'live'>('live')
  const [recordSeconds, setRecordSeconds] = useState(0)
  const [playing, setPlaying] = useState(false)
  const [ttsLoading, setTtsLoading] = useState(false)
  const mediaRecorderRef = useRef<MediaRecorder | null>(null)
  const streamRef = useRef<MediaStream | null>(null)
  const chunksRef = useRef<Blob[]>([])
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null)
  const audioRef = useRef<HTMLAudioElement | null>(null)
  const objectUrlRef = useRef<string | null>(null)

  const sendBlob = useCallback(async (blob: Blob) => {
    if (!patientId || blob.size < 100) {
      setError(blob.size < 100 ? 'Recording too short. Try again.' : 'No patient.')
      setLoading(false)
      return
    }
    try {
      const data = await postPatientInteract(patientId, blob, { withTts: true })
      setResult(data)
      // Auto-play in same user gesture chain (right after response) so browsers allow it
      if (data.response_audio_base64 && data.response) {
        try {
          audioRef.current?.pause()
          audioRef.current = null
          if (objectUrlRef.current) {
            URL.revokeObjectURL(objectUrlRef.current)
            objectUrlRef.current = null
          }
          const binary = atob(data.response_audio_base64)
          const bytes = new Uint8Array(binary.length)
          for (let i = 0; i < binary.length; i++) bytes[i] = binary.charCodeAt(i)
          const audioBlob = new Blob([bytes], { type: data.response_audio_media_type || 'audio/mpeg' })
          const url = URL.createObjectURL(audioBlob)
          objectUrlRef.current = url
          setPlaying(true)
          const audio = new Audio(url)
          audioRef.current = audio
          audio.onended = () => {
            setPlaying(false)
            audioRef.current = null
          }
          audio.onerror = () => setPlaying(false)
          await audio.play()
        } catch {
          setPlaying(false)
          // Autoplay blocked by browser; user can click "Play response"
        }
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Request failed')
    } finally {
      setLoading(false)
    }
  }, [patientId])

  const playResponse = useCallback(async () => {
    if (!result?.response) return
    if (objectUrlRef.current) {
      URL.revokeObjectURL(objectUrlRef.current)
      objectUrlRef.current = null
    }
    if (audioRef.current) {
      audioRef.current.pause()
      audioRef.current = null
    }
    try {
      setPlaying(true)
      let url: string
      if (result.response_audio_base64) {
        const binary = atob(result.response_audio_base64)
        const bytes = new Uint8Array(binary.length)
        for (let i = 0; i < binary.length; i++) bytes[i] = binary.charCodeAt(i)
        const blob = new Blob([bytes], { type: result.response_audio_media_type || 'audio/mpeg' })
        url = URL.createObjectURL(blob)
        objectUrlRef.current = url
      } else {
        setTtsLoading(true)
        const blob = await getPatientTtsAudio(result.response)
        url = URL.createObjectURL(blob)
        objectUrlRef.current = url
      }
      const audio = new Audio(url)
      audioRef.current = audio
      audio.onended = () => {
        setPlaying(false)
        audioRef.current = null
      }
      audio.onerror = () => {
        setPlaying(false)
        setTtsLoading(false)
      }
      await audio.play()
    } catch (e) {
      setPlaying(false)
      setError(e instanceof Error ? e.message : 'Playback failed')
    } finally {
      setTtsLoading(false)
    }
  }, [result])

  useEffect(() => {
    return () => {
      if (objectUrlRef.current) URL.revokeObjectURL(objectUrlRef.current)
      audioRef.current?.pause()
    }
  }, [])

  const startRecording = useCallback(async () => {
    if (!patientId) return
    setError(null)
    setRecordSeconds(0)
    try {
      // Prefer mono + noise suppression for better Whisper ASR (sampleRate 16k preferred but often not supported; backend resamples)
      let stream: MediaStream
      try {
        stream = await navigator.mediaDevices.getUserMedia({
          audio: {
            channelCount: 1,
            echoCancellation: true,
            noiseSuppression: true,
          },
        })
      } catch {
        stream = await navigator.mediaDevices.getUserMedia({ audio: true })
      }
      streamRef.current = stream
      const mr = new MediaRecorder(stream)
      mediaRecorderRef.current = mr
      chunksRef.current = []
      mr.ondataavailable = (e) => {
        if (e.data.size > 0) chunksRef.current.push(e.data)
      }
      mr.onstop = async () => {
        stream.getTracks().forEach((t) => t.stop())
        streamRef.current = null
        if (timerRef.current) {
          clearInterval(timerRef.current)
          timerRef.current = null
        }
        const blob = new Blob(chunksRef.current, { type: 'audio/webm' })
        await sendBlob(blob)
      }
      mr.start(200)
      setRecording(true)
      setLoading(true)
      if (mode === 'live') {
        timerRef.current = setInterval(() => setRecordSeconds((s) => s + 1), 1000)
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Microphone access denied')
      setLoading(false)
    }
  }, [patientId, mode, sendBlob])

  const stopRecording = useCallback(() => {
    if (mediaRecorderRef.current && mediaRecorderRef.current.state !== 'inactive') {
      mediaRecorderRef.current.stop()
      setRecording(false)
    }
  }, [])

  useEffect(() => {
    return () => {
      if (timerRef.current) clearInterval(timerRef.current)
      streamRef.current?.getTracks().forEach((t) => t.stop())
    }
  }, [])

  if (!patientId) {
    return <p className="text-slate-600">No patient selected.</p>
  }

  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-semibold text-slate-900">Voice assistant</h1>
      <p className="text-slate-600">
        {mode === 'live'
          ? 'Start recording, speak in English or Malayalam; the assistant will reply in Malayalam. Ask about medications, appointments, or the date.'
          : 'Hold the button and speak (English or Malayalam), then release to send. Replies are in Malayalam.'}
      </p>

      <div className="flex gap-2">
        <Button
          variant={mode === 'live' ? 'primary' : 'secondary'}
          size="sm"
          onClick={() => setMode('live')}
        >
          Live test
        </Button>
        <Button
          variant={mode === 'push' ? 'primary' : 'secondary'}
          size="sm"
          onClick={() => setMode('push')}
        >
          Push to talk
        </Button>
      </div>

      <div className="flex flex-col items-center gap-6">
        {mode === 'live' ? (
          <>
            {!recording ? (
              <Button
                size="lg"
                onClick={startRecording}
                disabled={loading}
                className="rounded-full h-24 w-24"
              >
                Start
              </Button>
            ) : (
              <>
                <div className="flex flex-col items-center gap-3">
                  <span className="text-2xl font-medium text-red-600">Recording… {recordSeconds}s</span>
                  <Button variant="danger" size="lg" onClick={stopRecording} className="rounded-full h-24 w-24">
                    Stop & send
                  </Button>
                </div>
              </>
            )}
          </>
        ) : (
          <button
            type="button"
            onMouseDown={startRecording}
            onMouseUp={stopRecording}
            onMouseLeave={stopRecording}
            onTouchStart={(e) => { e.preventDefault(); startRecording() }}
            onTouchEnd={(e) => { e.preventDefault(); stopRecording() }}
            disabled={loading}
            className={`h-24 w-24 rounded-full font-medium transition-all ${
              recording
                ? 'scale-110 bg-red-500 text-white shadow-lg'
                : 'bg-slate-200 text-slate-800 hover:bg-slate-300'
            } ${loading && !recording ? 'opacity-70' : ''}`}
            aria-label={recording ? 'Recording… release to send' : 'Hold to talk'}
          >
            {recording ? '…' : '🎤'}
          </button>
        )}
        {loading && !recording && (
          <p className="text-sm text-slate-500">Processing…</p>
        )}
      </div>

      {error && (
        <div className="rounded-xl border border-red-200 bg-red-50 p-4">
          <p className="text-sm text-red-700">{error}</p>
          <Button variant="secondary" size="sm" className="mt-2" onClick={() => setError(null)}>
            Dismiss
          </Button>
        </div>
      )}

      {result && (
        <section className="rounded-xl border border-slate-200 bg-white p-4 space-y-3">
          <h2 className="text-sm font-semibold uppercase tracking-wide text-slate-500">Last response</h2>
          {result.transcript && (
            <p className="text-slate-700"><span className="font-medium">You said:</span> {result.transcript}</p>
          )}
          <p className="text-slate-600"><span className="font-medium">Intent:</span> {result.intent}</p>
          <p className="text-slate-900"><span className="font-medium">Assistant:</span> {result.response}</p>
          <div className="pt-2">
            <Button
              size="sm"
              variant="secondary"
              onClick={playResponse}
              disabled={playing || ttsLoading || !result.response}
            >
              {ttsLoading ? 'Loading…' : playing ? 'Playing…' : '🔊 Play response'}
            </Button>
          </div>
        </section>
      )}
    </div>
  )
}
