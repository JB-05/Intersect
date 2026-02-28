import { useParams } from 'react-router-dom'
import { useQuery } from '@tanstack/react-query'
import { api } from '@/lib/api'
import { Button } from '@/components/ui/Button'
import type { KnownFace } from '@/types'

export function Contacts() {
  const { id: patientId } = useParams<{ id: string }>()
  const { data, isLoading } = useQuery({
    queryKey: ['known-faces', patientId],
    queryFn: () => api.get<KnownFace[]>(`/patients/${patientId}/known-faces`).catch(() => []),
    enabled: !!patientId,
  })
  const contacts = Array.isArray(data) ? data : []

  if (!patientId) return <p className="text-slate-600">No patient selected.</p>

  return (
    <div className="space-y-6">
      <div className="flex justify-between">
        <h1 className="text-2xl font-semibold text-slate-900">Known contacts</h1>
        <Button size="sm">Add contact</Button>
      </div>

      {isLoading ? (
        <div className="flex justify-center py-12">
          <div className="h-8 w-8 animate-spin rounded-full border-2 border-slate-300 border-t-slate-600" />
        </div>
      ) : contacts.length === 0 ? (
        <div className="rounded-xl border border-dashed border-slate-300 bg-slate-50 p-12 text-center">
          <p className="text-slate-600">No known contacts yet.</p>
          <p className="mt-1 text-sm text-slate-500">Add photos of people the patient should recognize.</p>
          <Button className="mt-4" size="sm">Add contact</Button>
        </div>
      ) : (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {contacts.map((c) => (
            <div
              key={c.id}
              className="flex items-center gap-4 rounded-lg border border-slate-200 bg-white p-4"
            >
              <div className="flex h-12 w-12 items-center justify-center rounded-full bg-slate-200 text-lg font-medium text-slate-700">
                {c.name.charAt(0)}
              </div>
              <div className="flex-1">
                <p className="font-medium text-slate-900">{c.name}</p>
                <p className="text-sm text-slate-600">{c.relationship ?? '—'}</p>
              </div>
              <div className="flex gap-2">
                <Button variant="ghost" size="sm">Edit</Button>
                <Button variant="ghost" size="sm" className="text-red-600">Delete</Button>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}
