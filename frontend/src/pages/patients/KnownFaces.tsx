import { useState, useRef, useEffect } from 'react'
import { useParams } from 'react-router-dom'
import { useQuery, useQueryClient } from '@tanstack/react-query'
import { api } from '@/lib/api'
import { postKnownFace } from '@/lib/api'
import { Button } from '@/components/ui/Button'
import { Input } from '@/components/ui/Input'
import type { KnownFace } from '@/types'
import * as faceapi from 'face-api.js'

const FACE_MODEL_URL = 'https://cdn.jsdelivr.net/gh/justadudewhohacks/face-api.js@0.22.2/weights'

export function KnownFaces() {
  const { id: patientId } = useParams<{ id: string }>()
  const queryClient = useQueryClient()
  const fileInputRef = useRef<HTMLInputElement>(null)
  const { data, isLoading } = useQuery({
    queryKey: ['known-faces', patientId],
    queryFn: () => api.get<KnownFace[]>(`/patients/${patientId}/known-faces`),
    enabled: !!patientId,
  })
  const faces = Array.isArray(data) ? data : []

  const [showAddForm, setShowAddForm] = useState(false)
  const [name, setName] = useState('')
  const [relationship, setRelationship] = useState('')
  const [photo, setPhoto] = useState<File | null>(null)
  const [photoPreview, setPhotoPreview] = useState<string | null>(null)
  const [embedding, setEmbedding] = useState<number[] | null>(null)
  const [submitError, setSubmitError] = useState<string | null>(null)
  const [submitting, setSubmitting] = useState(false)
  const [deletingId, setDeletingId] = useState<string | null>(null)
  const [faceModelsLoaded, setFaceModelsLoaded] = useState(false)

  useEffect(() => {
    if (!showAddForm) return
    let cancelled = false
    Promise.all([
      faceapi.nets.ssdMobilenetv1.loadFromUri(FACE_MODEL_URL),
      faceapi.nets.faceLandmark68Net.loadFromUri(FACE_MODEL_URL),
      faceapi.nets.faceRecognitionNet.loadFromUri(FACE_MODEL_URL),
    ]).then(() => { if (!cancelled) setFaceModelsLoaded(true) }).catch(() => {})
    return () => { cancelled = true }
  }, [showAddForm])

  const handlePhotoChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (photoPreview) URL.revokeObjectURL(photoPreview)
    setEmbedding(null)
    if (file) {
      const url = URL.createObjectURL(file)
      setPhoto(file)
      setPhotoPreview(url)
      if (faceModelsLoaded) {
        const img = new Image()
        img.crossOrigin = 'anonymous'
        await new Promise<void>((res, rej) => {
          img.onload = () => res()
          img.onerror = () => rej(new Error('Load failed'))
          img.src = url
        })
        try {
          const detection = await faceapi.detectSingleFace(img).withFaceLandmarks().withFaceDescriptor()
          if (detection?.descriptor) setEmbedding(Array.from(detection.descriptor))
        } catch {
          setEmbedding(null)
        }
      }
    } else {
      setPhoto(null)
      setPhotoPreview(null)
    }
  }

  const handleAddSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!patientId || !name.trim()) return
    setSubmitError(null)
    setSubmitting(true)
    try {
      await postKnownFace(patientId, {
        name: name.trim(),
        relationship: relationship.trim() || undefined,
        photo: photo || undefined,
        embedding: embedding ?? undefined,
      })
      queryClient.invalidateQueries({ queryKey: ['known-faces', patientId] })
      setName('')
      setRelationship('')
      setPhoto(null)
      setEmbedding(null)
      if (photoPreview) {
        URL.revokeObjectURL(photoPreview)
        setPhotoPreview(null)
      }
      if (fileInputRef.current) fileInputRef.current.value = ''
      setShowAddForm(false)
    } catch (err) {
      setSubmitError(err instanceof Error ? err.message : 'Failed to add face')
    } finally {
      setSubmitting(false)
    }
  }

  const handleCancelAdd = () => {
    setShowAddForm(false)
    setSubmitError(null)
    setName('')
    setRelationship('')
    setEmbedding(null)
    if (photoPreview) {
      URL.revokeObjectURL(photoPreview)
      setPhotoPreview(null)
    }
    setPhoto(null)
    if (fileInputRef.current) fileInputRef.current.value = ''
  }

  const handleDelete = async (faceId: string) => {
    if (!patientId || !confirm('Remove this known face?')) return
    setDeletingId(faceId)
    try {
      await api.delete(`/patients/${patientId}/known-faces/${faceId}`)
      queryClient.invalidateQueries({ queryKey: ['known-faces', patientId] })
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
        <h1 className="text-2xl font-semibold text-slate-900">Known faces</h1>
        {!showAddForm && (
          <Button size="sm" onClick={() => setShowAddForm(true)}>
            Add face
          </Button>
        )}
      </div>

      <p className="text-sm text-slate-600">
        Add a photo of each person the patient should recognize, with their name and relationship (e.g. daughter, neighbor).
      </p>

      {showAddForm && (
        <form
          onSubmit={handleAddSubmit}
          className="rounded-xl border border-slate-200 bg-white p-4 space-y-4 max-w-md"
        >
          <h2 className="text-sm font-semibold text-slate-700">New known face</h2>
          <div>
            <label className="mb-1 block text-sm font-medium text-slate-700">Photo</label>
            <input
              ref={fileInputRef}
              type="file"
              accept="image/jpeg,image/png,image/webp"
              onChange={handlePhotoChange}
              className="block w-full text-sm text-slate-600 file:mr-3 file:rounded-lg file:border-0 file:bg-slate-100 file:px-3 file:py-2 file:text-slate-700"
            />
            {photoPreview && (
              <div className="mt-2">
                <img
                  src={photoPreview}
                  alt="Preview"
                  className="h-24 w-24 rounded-lg object-cover border border-slate-200"
                />
                {embedding && (
                  <p className="mt-1 text-xs text-green-600">Face detected — will be used for recognition.</p>
                )}
              </div>
            )}
          </div>
          <Input
            label="Name"
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder="e.g. Maria"
            required
            autoFocus
          />
          <Input
            label="Relationship to patient"
            value={relationship}
            onChange={(e) => setRelationship(e.target.value)}
            placeholder="e.g. daughter, neighbor, carer"
          />
          {submitError && (
            <p className="text-sm text-red-600">{submitError}</p>
          )}
          <div className="flex gap-2">
            <Button type="submit" size="sm" disabled={submitting || !name.trim()}>
              {submitting ? 'Adding…' : 'Add face'}
            </Button>
            <Button
              type="button"
              variant="secondary"
              size="sm"
              onClick={handleCancelAdd}
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
      ) : faces.length === 0 && !showAddForm ? (
        <div className="rounded-xl border border-dashed border-slate-300 bg-slate-50 p-12 text-center">
          <p className="text-slate-600">No known faces yet.</p>
          <p className="mt-1 text-sm text-slate-500">Add a photo with name and relationship to the patient.</p>
          <Button className="mt-4" size="sm" onClick={() => setShowAddForm(true)}>
            Add face
          </Button>
        </div>
      ) : (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {faces.map((face) => (
            <div
              key={face.id}
              className="flex items-center gap-4 rounded-lg border border-slate-200 bg-white p-4"
            >
              <div className="flex h-14 w-14 shrink-0 items-center justify-center overflow-hidden rounded-full bg-slate-200 text-lg font-medium text-slate-700">
                {face.photo_url ? (
                  <img
                    src={face.photo_url}
                    alt={face.name}
                    className="h-full w-full object-cover"
                  />
                ) : (
                  face.name.charAt(0)
                )}
              </div>
              <div className="min-w-0 flex-1">
                <p className="font-medium text-slate-900">{face.name}</p>
                <p className="text-sm text-slate-600">
                  <span className="text-slate-500">Relationship:</span>{' '}
                  {face.relationship?.trim() || '—'}
                </p>
              </div>
              <div className="flex shrink-0 gap-2">
                <Button
                  variant="ghost"
                  size="sm"
                  className="text-red-600"
                  onClick={() => handleDelete(face.id)}
                  disabled={deletingId === face.id}
                >
                  {deletingId === face.id ? '…' : 'Delete'}
                </Button>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}
