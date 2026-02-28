import { useState } from 'react'
import { useParams } from 'react-router-dom'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { useForm } from 'react-hook-form'
import { usePatient } from '@/hooks/usePatient'
import { api } from '@/lib/api'
import { Button } from '@/components/ui/Button'
import { Input } from '@/components/ui/Input'
import type { Appointment } from '@/types'

type AddAppointmentForm = {
  title: string
  scheduled_at: string
  location: string
  notes: string
}

export function Appointments() {
  const { id: patientId } = useParams<{ id: string }>()
  const queryClient = useQueryClient()
  usePatient(patientId)
  const [showAddForm, setShowAddForm] = useState(false)

  const { data, isLoading, isError, error, refetch } = useQuery({
    queryKey: ['appointments', patientId],
    queryFn: () => api.get<Appointment[]>(`/patients/${patientId}/appointments`),
    enabled: !!patientId,
  })
  const appointments = Array.isArray(data) ? data : []

  const addMutation = useMutation({
    mutationFn: (body: AddAppointmentForm) =>
      api.post(`/patients/${patientId}/appointments`, {
        title: body.title.trim(),
        scheduled_at: new Date(body.scheduled_at).toISOString(),
        location: body.location.trim() || undefined,
        notes: body.notes.trim() || undefined,
      }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['appointments', patientId] })
      setShowAddForm(false)
      reset()
    },
  })

  const { register, handleSubmit, reset } = useForm<AddAppointmentForm>({
    defaultValues: {
      scheduled_at: new Date(Date.now() + 86400000).toISOString().slice(0, 16),
    },
  })

  const onAdd = (data: AddAppointmentForm) => {
    if (!data.title.trim()) return
    addMutation.mutate(data)
  }

  if (!patientId) {
    return <p className="text-slate-600">No patient selected.</p>
  }

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <h1 className="text-2xl font-semibold text-slate-900">Appointments</h1>
        <Button size="sm" onClick={() => setShowAddForm((v) => !v)}>
          {showAddForm ? 'Cancel' : 'Add appointment'}
        </Button>
      </div>

      {isError && (
        <div className="mb-4 rounded-lg border border-red-200 bg-red-50 p-4">
          <p className="text-sm text-red-700">{(error as Error)?.message ?? 'Failed to load appointments.'}</p>
          <Button variant="secondary" size="sm" className="mt-2" onClick={() => refetch()}>Try again</Button>
        </div>
      )}
      {showAddForm && (
        <form onSubmit={handleSubmit(onAdd)} className="rounded-xl border border-slate-200 bg-slate-50/50 p-5 space-y-4">
          <h2 className="text-sm font-semibold uppercase tracking-wide text-slate-500">New appointment</h2>
          <Input label="Title *" {...register('title', { required: true })} placeholder="e.g. Neurologist follow-up" />
          <Input label="Date & time *" type="datetime-local" {...register('scheduled_at', { required: true })} />
          <Input label="Location" {...register('location')} placeholder="Clinic name or address" />
          <Input label="Notes" {...register('notes')} placeholder="Optional notes" />
          {addMutation.isError && <p className="text-sm text-red-600">{(addMutation.error as Error).message}</p>}
          <Button type="submit" disabled={addMutation.isPending}>{addMutation.isPending ? 'Adding...' : 'Add appointment'}</Button>
        </form>
      )}

      {isLoading ? (
        <div className="flex justify-center py-12">
          <div className="h-8 w-8 animate-spin rounded-full border-2 border-slate-300 border-t-slate-600" />
        </div>
      ) : appointments.length === 0 ? (
        <div className="rounded-xl border border-dashed border-slate-300 bg-slate-50 p-12 text-center">
          <p className="text-slate-600">No appointments yet.</p>
          <p className="mt-1 text-sm text-slate-500">Add one using the button above.</p>
        </div>
      ) : (
        <div className="space-y-3">
          {appointments.map((apt) => (
            <div
              key={apt.id}
              className="flex items-center justify-between rounded-lg border border-slate-200 bg-white p-4"
            >
              <div>
                <p className="font-medium text-slate-900">{apt.title}</p>
                <p className="text-sm text-slate-600">
                  {new Date(apt.scheduled_at).toLocaleString()} {apt.location ? `• ${apt.location}` : ''}
                </p>
                {apt.notes && <p className="mt-1 text-sm text-slate-500">{apt.notes}</p>}
                <span
                  className={`mt-1 inline-block rounded px-2 py-0.5 text-xs ${
                    apt.status === 'completed'
                      ? 'bg-green-100 text-green-800'
                      : apt.status === 'missed'
                        ? 'bg-red-100 text-red-800'
                        : apt.status === 'cancelled'
                          ? 'bg-slate-100 text-slate-500'
                          : 'bg-slate-100 text-slate-700'
                  }`}
                >
                  {apt.status}
                </span>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}
