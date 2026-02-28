import { useState } from 'react'
import { useParams } from 'react-router-dom'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { useForm } from 'react-hook-form'
import { usePatient } from '@/hooks/usePatient'
import { api } from '@/lib/api'
import { Button } from '@/components/ui/Button'
import { Input } from '@/components/ui/Input'
import { Select } from '@/components/ui/Select'
import type { Medication } from '@/types'

const frequencyOptions = [
  { value: 'daily', label: 'Daily' },
  { value: 'twice_daily', label: 'Twice daily' },
  { value: 'three_times_daily', label: 'Three times daily' },
  { value: 'weekly', label: 'Weekly' },
  { value: 'as_needed', label: 'As needed' },
  { value: 'other', label: 'Other' },
]

type AddMedForm = {
  name: string
  dosage: string
  frequency: string
  times: string
  notes: string
}

function formatTimes(times: string[] | undefined): string {
  if (!times?.length) return '—'
  return times.map((t) => (typeof t === 'string' && t.length > 5 ? t.slice(0, 5) : t)).join(', ')
}

export function Medications() {
  const { id: patientId } = useParams<{ id: string }>()
  const queryClient = useQueryClient()
  usePatient(patientId)
  const [showAddForm, setShowAddForm] = useState(false)

  const { data, isLoading, isError, error, refetch } = useQuery({
    queryKey: ['medications', patientId],
    queryFn: () => api.get<Medication[]>(`/patients/${patientId}/medications`),
    enabled: !!patientId,
  })
  const medications = Array.isArray(data) ? data : []

  const addMutation = useMutation({
    mutationFn: (body: AddMedForm) => {
      const times = body.times ? body.times.split(/[\s,]+/).filter(Boolean) : undefined
      return api.post(`/patients/${patientId}/medications`, {
        name: body.name.trim(),
        dosage: body.dosage.trim() || undefined,
        frequency: body.frequency || 'daily',
        times: times?.length ? times : undefined,
        notes: body.notes.trim() || undefined,
      })
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['medications', patientId] })
      setShowAddForm(false)
      reset()
    },
  })

  const { register, handleSubmit, reset, formState: { errors } } = useForm<AddMedForm>({
    defaultValues: { frequency: 'daily' },
  })

  const onAdd = (data: AddMedForm) => {
    if (!data.name.trim()) return
    addMutation.mutate(data)
  }

  if (!patientId) {
    return <p className="text-slate-600">No patient selected.</p>
  }

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <h1 className="text-2xl font-semibold text-slate-900">Medications</h1>
        <Button size="sm" onClick={() => setShowAddForm((v) => !v)}>
          {showAddForm ? 'Cancel' : 'Add medication'}
        </Button>
      </div>

      {showAddForm && (
        <form onSubmit={handleSubmit(onAdd)} className="rounded-xl border border-slate-200 bg-slate-50/50 p-5 space-y-4">
          <h2 className="text-sm font-semibold uppercase tracking-wide text-slate-500">New medication</h2>
          <div className="grid grid-cols-2 gap-4">
            <Input label="Name *" {...register('name', { required: true })} placeholder="e.g. Donepezil" />
            <Input label="Dosage" {...register('dosage')} placeholder="e.g. 10mg" />
          </div>
          <div className="grid grid-cols-2 gap-4">
            <Select label="Frequency *" options={frequencyOptions} {...register('frequency', { required: true })} />
            <Input label="Times (e.g. 08:00, 20:00)" {...register('times')} placeholder="Comma or space separated" />
          </div>
          <Input label="Notes" {...register('notes')} placeholder="Take with food, etc." />
          {addMutation.isError && <p className="text-sm text-red-600">{(addMutation.error as Error).message}</p>}
          <Button type="submit" disabled={addMutation.isPending}>{addMutation.isPending ? 'Adding...' : 'Add medication'}</Button>
        </form>
      )}

      <section>
        <h2 className="mb-3 text-sm font-semibold uppercase tracking-wide text-slate-500">Current medications</h2>
        {isError && (
          <div className="mb-4 rounded-lg border border-red-200 bg-red-50 p-4">
            <p className="text-sm text-red-700">{(error as Error)?.message ?? 'Failed to load medications.'}</p>
            <Button variant="secondary" size="sm" className="mt-2" onClick={() => refetch()}>Try again</Button>
          </div>
        )}
        {isLoading ? (
          <div className="flex justify-center py-12">
            <div className="h-8 w-8 animate-spin rounded-full border-2 border-slate-300 border-t-slate-600" />
          </div>
        ) : medications.length === 0 ? (
          <div className="rounded-xl border border-dashed border-slate-300 bg-slate-50 p-12 text-center">
            <p className="text-slate-600">No medications yet.</p>
            <p className="mt-1 text-sm text-slate-500">Add one using the button above.</p>
          </div>
        ) : (
          <div className="space-y-3">
            {medications.map((med) => (
              <div
                key={med.id}
                className="rounded-lg border border-slate-200 bg-white p-4"
              >
                <div className="flex justify-between items-start">
                  <div>
                    <p className="font-medium text-slate-900">{med.name}</p>
                    <p className="text-sm text-slate-600">
                      {med.dosage || '—'} • {med.frequency}
                    </p>
                    {((med.times as string[] | undefined)?.length ?? 0) > 0 && (
                      <p className="mt-1 text-sm text-slate-500">Times: {formatTimes(med.times as string[])}</p>
                    )}
                    {med.notes && (
                      <p className="mt-1 text-sm text-slate-500">{med.notes}</p>
                    )}
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </section>
    </div>
  )
}
