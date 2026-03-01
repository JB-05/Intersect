import { useState, useRef } from 'react'
import { useParams } from 'react-router-dom'
import { useQuery, useQueryClient } from '@tanstack/react-query'
import { api } from '@/lib/api'
import { postRestrictedArea, patchRestrictedArea } from '@/lib/api'
import { Button } from '@/components/ui/Button'
import { Input } from '@/components/ui/Input'
import type { RestrictedArea } from '@/types'

export function RestrictedAreas() {
  const { id: patientId } = useParams<{ id: string }>()
  const queryClient = useQueryClient()
  const fileInputRef = useRef<HTMLInputElement>(null)

  const { data, isLoading } = useQuery({
    queryKey: ['restricted-areas', patientId],
    queryFn: () => api.get<RestrictedArea[]>(`/patients/${patientId}/restricted-areas`),
    enabled: !!patientId,
  })
  const areas = Array.isArray(data) ? data : []

  const [showAddForm, setShowAddForm] = useState(false)
  const [name, setName] = useState('')
  const [image, setImage] = useState<File | null>(null)
  const [submitError, setSubmitError] = useState<string | null>(null)
  const [submitting, setSubmitting] = useState(false)
  const [deletingId, setDeletingId] = useState<string | null>(null)
  const [togglingId, setTogglingId] = useState<string | null>(null)

  const handleAddSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!patientId || !name.trim()) return
    setSubmitError(null)
    setSubmitting(true)
    try {
      await postRestrictedArea(patientId, { name: name.trim(), image: image || undefined })
      queryClient.invalidateQueries({ queryKey: ['restricted-areas', patientId] })
      setName('')
      setImage(null)
      if (fileInputRef.current) fileInputRef.current.value = ''
      setShowAddForm(false)
    } catch (err) {
      setSubmitError(err instanceof Error ? err.message : 'Failed to add area')
    } finally {
      setSubmitting(false)
    }
  }

  const handleToggle = async (area: RestrictedArea, field: 'camera_enabled' | 'audio_enabled', value: boolean) => {
    if (!patientId) return
    setTogglingId(area.id)
    try {
      await patchRestrictedArea(patientId, area.id, { [field]: value })
      queryClient.invalidateQueries({ queryKey: ['restricted-areas', patientId] })
    } catch {
      setSubmitError('Failed to update')
    } finally {
      setTogglingId(null)
    }
  }

  const handleDelete = async (areaId: string) => {
    if (!patientId || !confirm('Remove this restricted area?')) return
    setDeletingId(areaId)
    try {
      await api.delete(`/patients/${patientId}/restricted-areas/${areaId}`)
      queryClient.invalidateQueries({ queryKey: ['restricted-areas', patientId] })
    } catch (err) {
      setSubmitError(err instanceof Error ? err.message : 'Failed to delete')
    } finally {
      setDeletingId(null)
    }
  }

  if (!patientId) return <p className="text-slate-600">No patient selected.</p>

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <h1 className="text-2xl font-semibold text-slate-900">Restricted areas</h1>
        {!showAddForm && (
          <Button size="sm" onClick={() => setShowAddForm(true)}>
            Add area
          </Button>
        )}
      </div>

      <p className="text-sm text-slate-600">
        Upload an image of each restricted zone and use the toggles to turn off camera or audio for that area.
      </p>

      {showAddForm && (
        <form
          onSubmit={handleAddSubmit}
          className="rounded-xl border border-slate-200 bg-white p-4 space-y-4 max-w-md"
        >
          <h2 className="text-sm font-semibold text-slate-700">New restricted area</h2>
          <div>
            <label className="mb-1 block text-sm font-medium text-slate-700">Image (optional)</label>
            <input
              ref={fileInputRef}
              type="file"
              accept="image/jpeg,image/png,image/webp"
              onChange={(e) => setImage(e.target.files?.[0] ?? null)}
              className="block w-full text-sm text-slate-600 file:mr-3 file:rounded-lg file:border-0 file:bg-slate-100 file:px-3 file:py-2 file:text-slate-700"
            />
          </div>
          <Input
            label="Area name"
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder="e.g. Kitchen, Stairs"
            required
            autoFocus
          />
          {submitError && <p className="text-sm text-red-600">{submitError}</p>}
          <div className="flex gap-2">
            <Button type="submit" size="sm" disabled={submitting || !name.trim()}>
              {submitting ? 'Adding…' : 'Add area'}
            </Button>
            <Button
              type="button"
              variant="secondary"
              size="sm"
              onClick={() => { setShowAddForm(false); setSubmitError(null); setName(''); setImage(null) }}
              disabled={submitting}
            >
              Cancel
            </Button>
          </div>
        </form>
      )}

      {isLoading ? (
        <div className="flex justify-center py-12">
          <div className="h-8 w-8 animate-spin rounded-full border-2 border-slate-300 border-t-slate-600" />
        </div>
      ) : areas.length === 0 && !showAddForm ? (
        <div className="rounded-xl border border-dashed border-slate-300 bg-slate-50 p-12 text-center">
          <p className="text-slate-600">No restricted areas yet.</p>
          <p className="mt-1 text-sm text-slate-500">Add an area with an optional image and control camera/audio.</p>
          <Button className="mt-4" size="sm" onClick={() => setShowAddForm(true)}>
            Add area
          </Button>
        </div>
      ) : (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {areas.map((area) => (
            <div
              key={area.id}
              className="rounded-lg border border-slate-200 bg-white overflow-hidden"
            >
              <div className="aspect-video bg-slate-200 flex items-center justify-center">
                {area.image_url ? (
                  <img
                    src={area.image_url}
                    alt={area.name}
                    className="w-full h-full object-cover"
                  />
                ) : (
                  <span className="text-4xl text-slate-400">🛑</span>
                )}
              </div>
              <div className="p-4 space-y-3">
                <p className="font-medium text-slate-900">{area.name}</p>
                <div className="flex items-center justify-between gap-3 text-sm">
                  <span className="text-slate-700">Turn off camera</span>
                  <button
                    type="button"
                    role="switch"
                    aria-checked={!area.camera_enabled}
                    aria-label="Turn off camera in this area"
                    disabled={togglingId === area.id}
                    onClick={() => handleToggle(area, 'camera_enabled', !area.camera_enabled)}
                    className={`relative inline-flex h-6 w-11 shrink-0 rounded-full transition-colors ${
                      !area.camera_enabled ? 'bg-green-500' : 'bg-slate-300'
                    }`}
                  >
                    <span
                      className={`inline-block h-5 w-5 transform rounded-full bg-white shadow transition-transform ${
                        !area.camera_enabled ? 'translate-x-5' : 'translate-x-0.5'
                      }`}
                      style={{ marginTop: 2 }}
                    />
                  </button>
                </div>
                <div className="flex items-center justify-between gap-3 text-sm">
                  <span className="text-slate-700">Turn off audio</span>
                  <button
                    type="button"
                    role="switch"
                    aria-checked={!area.audio_enabled}
                    aria-label="Turn off audio in this area"
                    disabled={togglingId === area.id}
                    onClick={() => handleToggle(area, 'audio_enabled', !area.audio_enabled)}
                    className={`relative inline-flex h-6 w-11 shrink-0 rounded-full transition-colors ${
                      !area.audio_enabled ? 'bg-green-500' : 'bg-slate-300'
                    }`}
                  >
                    <span
                      className={`inline-block h-5 w-5 transform rounded-full bg-white shadow transition-transform ${
                        !area.audio_enabled ? 'translate-x-5' : 'translate-x-0.5'
                      }`}
                      style={{ marginTop: 2 }}
                    />
                  </button>
                </div>
                <Button
                  variant="ghost"
                  size="sm"
                  className="text-red-600 w-full"
                  onClick={() => handleDelete(area.id)}
                  disabled={deletingId === area.id}
                >
                  {deletingId === area.id ? '…' : 'Remove'}
                </Button>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}
