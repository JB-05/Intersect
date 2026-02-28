import { useParams } from 'react-router-dom'
import { useQuery } from '@tanstack/react-query'
import { api } from '@/lib/api'

interface CameraEvent {
  id: string
  event_type: 'recognized_person' | 'unknown_person' | 'inactivity'
  detected_at: string
  confidence?: number
  duration_seconds?: number
}

export function Events() {
  const { id: patientId } = useParams<{ id: string }>()
  const { data, isLoading } = useQuery({
    queryKey: ['camera-events', patientId],
    queryFn: () => api.get<{ items: CameraEvent[] }>(`/patients/${patientId}/camera-events`).catch(() => ({ items: [] })),
    enabled: !!patientId,
  })
  const events = data?.items ?? []

  if (!patientId) return <p className="text-slate-600">No patient selected.</p>

  const eventLabel: Record<string, string> = {
    recognized_person: 'Recognized',
    unknown_person: 'Unknown person',
    inactivity: 'Inactivity',
  }

  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-semibold text-slate-900">Events</h1>

      {isLoading ? (
        <div className="flex justify-center py-12">
          <div className="h-8 w-8 animate-spin rounded-full border-2 border-slate-300 border-t-slate-600" />
        </div>
      ) : events.length === 0 ? (
        <div className="rounded-xl border border-dashed border-slate-300 bg-slate-50 p-12 text-center">
          <p className="text-slate-600">No events yet.</p>
          <p className="mt-1 text-sm text-slate-500">Camera and location events will appear here.</p>
        </div>
      ) : (
        <div className="space-y-2">
          {events.map((e) => (
            <div
              key={e.id}
              className="flex items-center justify-between rounded-lg border border-slate-200 bg-white p-4"
            >
              <div>
                <span className={`inline-block rounded px-2 py-0.5 text-xs font-medium ${
                  e.event_type === 'recognized_person' ? 'bg-green-100 text-green-800' :
                  e.event_type === 'unknown_person' ? 'bg-amber-100 text-amber-800' :
                  'bg-slate-100 text-slate-700'
                }`}>
                  {eventLabel[e.event_type] ?? e.event_type}
                </span>
                <p className="mt-1 text-sm text-slate-600">
                  {new Date(e.detected_at).toLocaleString()}
                  {e.confidence != null && ` • ${(e.confidence * 100).toFixed(0)}% confidence`}
                  {e.duration_seconds != null && ` • ${e.duration_seconds}s`}
                </p>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}
