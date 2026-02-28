import { useParams, useNavigate } from 'react-router-dom'
import { useMutation, useQueryClient } from '@tanstack/react-query'
import { useForm } from 'react-hook-form'
import { usePatient } from '@/hooks/usePatient'
import { api } from '@/lib/api'
import { Button } from '@/components/ui/Button'
import { Input } from '@/components/ui/Input'
import { Select } from '@/components/ui/Select'
import { Textarea } from '@/components/ui/Textarea'
import { useState, useEffect } from 'react'
import type { Patient } from '@/types'

const diagnosisTypes = [
  { value: "alzheimer", label: "Alzheimer's disease" },
  { value: "vascular", label: "Vascular dementia" },
  { value: "lewy_body", label: "Lewy body dementia" },
  { value: "frontotemporal", label: "Frontotemporal dementia" },
  { value: "mixed", label: "Mixed dementia" },
  { value: "other", label: "Other / Not yet diagnosed" },
]

const severityLevels = [
  { value: "mild", label: "Mild" },
  { value: "moderate", label: "Moderate" },
  { value: "severe", label: "Severe" },
]

const diagnosisStages = [
  { value: "early", label: "Early stage" },
  { value: "mild", label: "Mild" },
  { value: "moderate", label: "Moderate" },
  { value: "severe", label: "Severe" },
]

type FormData = {
  full_name: string
  date_of_birth: string
  address: string
  home_latitude: number | ''
  home_longitude: number | ''
  geofence_radius_km: number | ''
  severity: string
  personal_history: string
  diagnosis_type: string
  diagnosis_date: string
  diagnosing_physician: string
  diagnosis_stage: string
  diagnosis_symptoms: string
  diagnosis_treatment_plan: string
  mmse_score_at_diagnosis: number | ''
  emergency_contact_name: string
  emergency_contact_phone: string
  primary_care_physician: string
  baseline_start_date: string
  baseline_notes: string
  notes: string
}

function FormSection({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <section className="space-y-4 rounded-xl border border-slate-200 bg-slate-50/50 p-5">
      <h2 className="text-sm font-semibold uppercase tracking-wide text-slate-500">{title}</h2>
      <div className="space-y-4">{children}</div>
    </section>
  )
}

function patientToDefaultValues(p: Patient): FormData {
  return {
    full_name: p.full_name ?? '',
    date_of_birth: p.date_of_birth ?? '',
    address: p.address ?? '',
    home_latitude: p.home_latitude ?? '',
    home_longitude: p.home_longitude ?? '',
    geofence_radius_km: p.geofence_radius_km ?? '',
    severity: p.severity ?? '',
    personal_history: p.personal_history ?? '',
    diagnosis_type: p.diagnosis_type ?? '',
    diagnosis_date: p.diagnosis_date ?? '',
    diagnosing_physician: p.diagnosing_physician ?? '',
    diagnosis_stage: p.diagnosis_stage ?? '',
    diagnosis_symptoms: p.diagnosis_symptoms ?? '',
    diagnosis_treatment_plan: p.diagnosis_treatment_plan ?? '',
    mmse_score_at_diagnosis: p.mmse_score_at_diagnosis ?? '',
    emergency_contact_name: p.emergency_contact_name ?? '',
    emergency_contact_phone: p.emergency_contact_phone ?? '',
    primary_care_physician: p.primary_care_physician ?? '',
    baseline_start_date: p.baseline_start_date ?? '',
    baseline_notes: p.baseline_notes ?? '',
    notes: p.notes ?? '',
  }
}

export function Settings() {
  const { id: patientId } = useParams<{ id: string }>()
  const navigate = useNavigate()
  const queryClient = useQueryClient()
  const { patient, isLoading, refetch } = usePatient(patientId)
  const [showRemoveConfirm, setShowRemoveConfirm] = useState(false)
  const [removeError, setRemoveError] = useState('')

  const { register, handleSubmit, formState: { errors, isSubmitting }, setValue, reset } = useForm<FormData>({
    defaultValues: patient ? patientToDefaultValues(patient) : undefined,
  })

  useEffect(() => {
    if (patient) reset(patientToDefaultValues(patient))
  }, [patient, reset])

  const updateMutation = useMutation({
    mutationFn: (data: FormData) =>
      api.patch(`/patients/${patientId}`, {
        full_name: data.full_name || undefined,
        date_of_birth: data.date_of_birth || undefined,
        address: data.address || undefined,
        home_latitude: data.home_latitude === '' ? undefined : data.home_latitude,
        home_longitude: data.home_longitude === '' ? undefined : data.home_longitude,
        geofence_radius_km: data.geofence_radius_km === '' ? undefined : data.geofence_radius_km,
        severity: data.severity || undefined,
        personal_history: data.personal_history || undefined,
        diagnosis_type: data.diagnosis_type || undefined,
        diagnosis_date: data.diagnosis_date || undefined,
        diagnosing_physician: data.diagnosing_physician || undefined,
        diagnosis_stage: data.diagnosis_stage || undefined,
        diagnosis_symptoms: data.diagnosis_symptoms || undefined,
        diagnosis_treatment_plan: data.diagnosis_treatment_plan || undefined,
        mmse_score_at_diagnosis: data.mmse_score_at_diagnosis === '' ? undefined : data.mmse_score_at_diagnosis,
        emergency_contact_name: data.emergency_contact_name || undefined,
        emergency_contact_phone: data.emergency_contact_phone || undefined,
        primary_care_physician: data.primary_care_physician || undefined,
        baseline_start_date: data.baseline_start_date || undefined,
        baseline_notes: data.baseline_notes || undefined,
        notes: data.notes || undefined,
      }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['patient', patientId] })
      queryClient.invalidateQueries({ queryKey: ['patients'] })
      refetch()
    },
  })

  const deleteMutation = useMutation({
    mutationFn: () => api.delete(`/patients/${patientId}`),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['patients'] })
      navigate('/patients')
    },
    onError: (e: Error) => {
      setRemoveError(e.message || 'Failed to remove patient')
    },
  })

  const useCurrentLocation = () => {
    if (!navigator.geolocation) {
      alert('Geolocation is not supported by your browser')
      return
    }
    navigator.geolocation.getCurrentPosition(
      (pos) => {
        setValue('home_latitude', pos.coords.latitude)
        setValue('home_longitude', pos.coords.longitude)
      },
      () => alert('Could not get your location.'),
    )
  }

  const onSave = (data: FormData) => {
    updateMutation.mutate(data)
  }

  const handleRemoveClick = () => {
    setRemoveError('')
    setShowRemoveConfirm(true)
  }

  const handleConfirmRemove = () => deleteMutation.mutate()
  const handleCancelRemove = () => {
    setShowRemoveConfirm(false)
    setRemoveError('')
  }

  if (isLoading || !patient) {
    return (
      <div className="flex justify-center py-12">
        <div className="h-8 w-8 animate-spin rounded-full border-2 border-slate-300 border-t-slate-600" />
      </div>
    )
  }

  return (
    <div className="mx-auto max-w-2xl space-y-8">
      <div>
        <h1 className="text-2xl font-semibold text-slate-900">Patient settings</h1>
        <p className="mt-1 text-sm text-slate-500">Edit patient details and history. Manage medications from the Medications tab.</p>
      </div>

      <form onSubmit={handleSubmit(onSave)} className="space-y-6">
        <FormSection title="Personal information">
          <Input label="Full name *" error={errors.full_name?.message} {...register('full_name', { required: 'Required' })} />
          <Input label="Date of birth" type="date" {...register('date_of_birth')} />
          <Select label="Severity (current level)" options={severityLevels} {...register('severity')} />
          <Textarea
            label="Personal history"
            {...register('personal_history')}
            placeholder="Medical history, family history of dementia, comorbidities, allergies, etc."
          />
        </FormSection>

        <FormSection title="Address & location">
          <Input label="Address" {...register('address')} placeholder="Street, city, postal code" />
          <div className="grid grid-cols-2 gap-4">
            <Input label="Home latitude" type="number" step="any" {...register('home_latitude')} />
            <Input label="Home longitude" type="number" step="any" {...register('home_longitude')} />
          </div>
          <div className="flex items-end gap-2">
            <Input label="Geofence radius (km)" type="number" step="0.1" min={0} {...register('geofence_radius_km')} className="max-w-[140px]" />
            <Button type="button" variant="secondary" onClick={useCurrentLocation}>Use current location</Button>
          </div>
        </FormSection>

        <FormSection title="Diagnosis details">
          <Select label="Diagnosis type" options={diagnosisTypes} {...register('diagnosis_type')} />
          <Input label="Diagnosis date" type="date" {...register('diagnosis_date')} />
          <Input label="Diagnosing physician" {...register('diagnosing_physician')} placeholder="Dr. name or clinic" />
          <Select label="Stage at diagnosis" options={diagnosisStages} {...register('diagnosis_stage')} />
          <Input label="MMSE score at diagnosis (0–30)" type="number" min={0} max={30} {...register('mmse_score_at_diagnosis')} />
          <Textarea
            label="Key symptoms at diagnosis"
            {...register('diagnosis_symptoms')}
            placeholder="Memory loss, confusion, behavioral changes, etc."
          />
          <Textarea
            label="Treatment plan"
            {...register('diagnosis_treatment_plan')}
            placeholder="Prescribed medications, therapies, follow-up schedule."
          />
        </FormSection>

        <FormSection title="Emergency contact">
          <Input label="Contact name" {...register('emergency_contact_name')} />
          <Input label="Contact phone" type="tel" {...register('emergency_contact_phone')} />
        </FormSection>

        <FormSection title="Care team">
          <Input label="Primary care physician" {...register('primary_care_physician')} />
        </FormSection>

        <FormSection title="Baseline (for stability monitoring)">
          <Input label="Baseline start date *" type="date" error={errors.baseline_start_date?.message} {...register('baseline_start_date', { required: 'Required' })} />
          <Textarea
            label="Baseline description"
            {...register('baseline_notes')}
            placeholder="Typical/normal state: routines, mood, what 'good' looks like."
          />
        </FormSection>

        <FormSection title="Additional notes">
          <Textarea label="Other notes" {...register('notes')} />
        </FormSection>

        {updateMutation.isError && (
          <p className="text-sm text-red-600">{(updateMutation.error as Error).message}</p>
        )}
        {updateMutation.isSuccess && (
          <p className="text-sm text-green-600">Saved.</p>
        )}
        <div className="flex gap-2">
          <Button type="submit" disabled={isSubmitting || updateMutation.isPending}>
            {updateMutation.isPending ? 'Saving...' : 'Save changes'}
          </Button>
          <Button type="button" variant="secondary" onClick={() => reset(patientToDefaultValues(patient))}>
            Reset
          </Button>
        </div>
      </form>

      <section className="rounded-xl border border-red-200 bg-red-50 p-6">
        <h2 className="font-medium text-red-800">Danger zone</h2>
        <p className="mt-2 text-sm text-red-700">Removing a patient will soft-delete their record. This action can be reversed by support.</p>
        {!showRemoveConfirm ? (
          <Button variant="danger" className="mt-4" onClick={handleRemoveClick}>
            Remove patient
          </Button>
        ) : (
          <div className="mt-4 space-y-3">
            <p className="text-sm font-medium text-red-800">Are you sure you want to remove this patient? They will no longer appear in your list.</p>
            {removeError && <p className="text-sm text-red-600">{removeError}</p>}
            <div className="flex gap-2">
              <Button variant="danger" onClick={handleConfirmRemove} disabled={deleteMutation.isPending}>
                {deleteMutation.isPending ? 'Removing...' : 'Yes, remove patient'}
              </Button>
              <Button variant="secondary" onClick={handleCancelRemove} disabled={deleteMutation.isPending}>
                Cancel
              </Button>
            </div>
          </div>
        )}
      </section>
    </div>
  )
}
