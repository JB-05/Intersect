import { useState } from 'react'
import { useParams } from 'react-router-dom'
import { useForm } from 'react-hook-form'
import { useMutation, useQueryClient } from '@tanstack/react-query'
import { useQuery } from '@tanstack/react-query'
import { api } from '@/lib/api'
import { Button } from '@/components/ui/Button'
import type { CaregiverSurvey } from '@/types'

type FormData = {
  confusion_increased: boolean
  safety_concern_increased: boolean
  stress_level: number
}

function getWeekEnding(date: Date): string {
  const d = new Date(date)
  const day = d.getDay()
  const diff = day === 0 ? 0 : 7 - day
  d.setDate(d.getDate() + diff)
  return d.toISOString().split('T')[0]
}

export function Surveys() {
  const { id: patientId } = useParams<{ id: string }>()
  const queryClient = useQueryClient()
  const [submitError, setSubmitError] = useState('')

  const { data: surveys = [], isLoading, isError, error, refetch } = useQuery({
    queryKey: ['surveys', patientId],
    queryFn: () => api.get<CaregiverSurvey[]>(`/patients/${patientId}/surveys`),
    enabled: !!patientId,
  })

  const submitMutation = useMutation({
    mutationFn: (data: FormData) => {
      const weekEnding = getWeekEnding(new Date())
      return api.post(`/patients/${patientId}/surveys`, {
        week_ending: weekEnding,
        confusion_increased: data.confusion_increased,
        safety_concern_increased: data.safety_concern_increased,
        stress_level: data.stress_level,
      })
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['surveys', patientId] })
      setSubmitError('')
    },
    onError: (e: Error) => {
      setSubmitError(e.message || 'Failed to submit survey')
    },
  })

  const { register, handleSubmit } = useForm<FormData>({
    defaultValues: {
      confusion_increased: false,
      safety_concern_increased: false,
      stress_level: 3,
    },
  })

  const onSubmit = (data: FormData) => {
    submitMutation.mutate(data)
  }

  const weekEnding = getWeekEnding(new Date())

  if (!patientId) {
    return <p className="text-slate-600">No patient selected.</p>
  }

  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-semibold text-slate-900">Weekly Survey</h1>

      {submitMutation.isSuccess ? (
        <div className="rounded-xl border border-green-200 bg-green-50 p-6 text-center">
          <p className="font-medium text-green-800">Survey submitted.</p>
          <p className="text-sm text-green-700">Thank you for your input.</p>
          <Button className="mt-4" variant="secondary" size="sm" onClick={() => submitMutation.reset()}>
            Submit another
          </Button>
        </div>
      ) : (
        <form onSubmit={handleSubmit(onSubmit)} className="space-y-6">
          <div className="rounded-xl border border-slate-200 bg-white p-6">
            <p className="mb-4 text-sm text-slate-600">Week ending: {weekEnding}</p>
            <div className="space-y-4">
              <div>
                <p className="mb-2 text-sm font-medium text-slate-700">Has confusion increased?</p>
                <label className="mr-4 inline-flex items-center gap-2">
                  <input type="radio" value="false" {...register('confusion_increased', { setValueAs: (v) => v === 'true' })} />
                  No
                </label>
                <label className="inline-flex items-center gap-2">
                  <input type="radio" value="true" {...register('confusion_increased', { setValueAs: (v) => v === 'true' })} />
                  Yes
                </label>
              </div>
              <div>
                <p className="mb-2 text-sm font-medium text-slate-700">Has safety concern increased?</p>
                <label className="mr-4 inline-flex items-center gap-2">
                  <input type="radio" value="false" {...register('safety_concern_increased', { setValueAs: (v) => v === 'true' })} />
                  No
                </label>
                <label className="inline-flex items-center gap-2">
                  <input type="radio" value="true" {...register('safety_concern_increased', { setValueAs: (v) => v === 'true' })} />
                  Yes
                </label>
              </div>
              <div>
                <p className="mb-2 text-sm font-medium text-slate-700">Stress level (1–5)</p>
                <div className="flex gap-2">
                  {[1, 2, 3, 4, 5].map((n) => (
                    <label key={n} className="flex items-center gap-1">
                      <input type="radio" value={n} {...register('stress_level', { valueAsNumber: true })} />
                      <span className="text-sm">{n}</span>
                    </label>
                  ))}
                </div>
                <p className="mt-1 text-xs text-slate-500">1 = low, 5 = high</p>
              </div>
            </div>
          </div>
          {submitError && <p className="text-sm text-red-600">{submitError}</p>}
          <Button type="submit" disabled={submitMutation.isPending}>
            {submitMutation.isPending ? 'Submitting...' : 'Submit survey'}
          </Button>
        </form>
      )}

      <section>
        <h2 className="mb-3 font-medium text-slate-800">Past surveys</h2>
        {isError && (
          <div className="mb-4 rounded-lg border border-red-200 bg-red-50 p-4">
            <p className="text-sm text-red-700">{(error as Error)?.message ?? 'Failed to load surveys.'}</p>
            <button type="button" className="mt-2 text-sm font-medium text-red-700 underline" onClick={() => refetch()}>Try again</button>
          </div>
        )}
        {isLoading ? (
          <div className="flex justify-center py-8">
            <div className="h-6 w-6 animate-spin rounded-full border-2 border-slate-300 border-t-slate-600" />
          </div>
        ) : surveys.length === 0 ? (
          <p className="text-sm text-slate-500">No surveys submitted yet.</p>
        ) : (
          <div className="space-y-2">
            {surveys.map((s) => (
              <div key={s.id} className="rounded-lg border border-slate-200 bg-white p-3">
                <p className="text-sm text-slate-600">
                  {s.week_ending} • Stress: {s.stress_level} • Confusion ↑: {s.confusion_increased ? 'Yes' : 'No'} • Safety ↑: {s.safety_concern_increased ? 'Yes' : 'No'}
                </p>
              </div>
            ))}
          </div>
        )}
      </section>
    </div>
  )
}
