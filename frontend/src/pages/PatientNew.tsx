import { useNavigate } from 'react-router-dom'
import { useForm, useFieldArray } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import { useState } from 'react'
import { api } from '@/lib/api'
import { Button } from '@/components/ui/Button'
import { Input } from '@/components/ui/Input'
import { Select } from '@/components/ui/Select'
import { Textarea } from '@/components/ui/Textarea'

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

const frequencyOptions = [
  { value: "daily", label: "Daily" },
  { value: "twice_daily", label: "Twice daily" },
  { value: "three_times_daily", label: "Three times daily" },
  { value: "weekly", label: "Weekly" },
  { value: "as_needed", label: "As needed" },
  { value: "other", label: "Other" },
]

const medicationSchema = z.object({
  name: z.string(),
  dosage: z.string().optional(),
  frequency: z.string(),
  times: z.string().optional(),
  notes: z.string().optional(),
})

const schema = z.object({
  full_name: z.string().min(2, 'At least 2 characters'),
  date_of_birth: z.string().optional(),
  address: z.string().optional(),
  home_latitude: z.union([z.string(), z.number()]).optional().transform((v) => (v === '' || v === undefined ? undefined : Number(v))),
  home_longitude: z.union([z.string(), z.number()]).optional().transform((v) => (v === '' || v === undefined ? undefined : Number(v))),
  geofence_radius_km: z.union([z.string(), z.number()]).optional().transform((v) => (v === '' || v === undefined ? undefined : Number(v))),

  severity: z.string().optional(),
  personal_history: z.string().optional(),

  diagnosis_type: z.string().optional(),
  diagnosis_date: z.string().optional(),
  diagnosing_physician: z.string().optional(),
  diagnosis_stage: z.string().optional(),
  diagnosis_symptoms: z.string().optional(),
  diagnosis_treatment_plan: z.string().optional(),
  mmse_score_at_diagnosis: z.union([z.string(), z.number()]).optional().transform((v) => (v === '' || v === undefined ? undefined : Number(v))),

  emergency_contact_name: z.string().optional(),
  emergency_contact_phone: z.string().optional(),
  primary_care_physician: z.string().optional(),

  baseline_start_date: z.string().min(1, 'Required for monitoring baseline'),
  baseline_notes: z.string().optional(),
  notes: z.string().optional(),

  medications: z.array(medicationSchema).optional(),
})

type FormData = z.infer<typeof schema>

function FormSection({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <section className="space-y-4 rounded-xl border border-slate-200 bg-slate-50/50 p-5">
      <h2 className="text-sm font-semibold uppercase tracking-wide text-slate-500">{title}</h2>
      <div className="space-y-4">{children}</div>
    </section>
  )
}

export function PatientNew() {
  const navigate = useNavigate()
  const [error, setError] = useState('')
  const { register, handleSubmit, formState: { errors, isSubmitting }, setValue, control } = useForm<FormData>({
    resolver: zodResolver(schema),
    defaultValues: {
      baseline_start_date: new Date().toISOString().split('T')[0],
      geofence_radius_km: 0.5,
      medications: [],
    },
  })

  const { fields, append, remove } = useFieldArray({ control, name: 'medications' })

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
      () => alert('Could not get your location. Check permissions or try again.'),
    )
  }

  const onSubmit = async (data: FormData) => {
    setError('')
    const payload = {
      full_name: data.full_name,
      date_of_birth: data.date_of_birth || undefined,
      address: data.address || undefined,
      home_latitude: data.home_latitude,
      home_longitude: data.home_longitude,
      geofence_radius_km: data.geofence_radius_km,
      severity: data.severity || undefined,
      personal_history: data.personal_history || undefined,
      diagnosis_type: data.diagnosis_type || undefined,
      diagnosis_date: data.diagnosis_date || undefined,
      diagnosing_physician: data.diagnosing_physician || undefined,
      diagnosis_stage: data.diagnosis_stage || undefined,
      diagnosis_symptoms: data.diagnosis_symptoms || undefined,
      diagnosis_treatment_plan: data.diagnosis_treatment_plan || undefined,
      mmse_score_at_diagnosis: data.mmse_score_at_diagnosis,
      emergency_contact_name: data.emergency_contact_name || undefined,
      emergency_contact_phone: data.emergency_contact_phone || undefined,
      primary_care_physician: data.primary_care_physician || undefined,
      baseline_start_date: data.baseline_start_date,
      baseline_notes: data.baseline_notes || undefined,
      notes: data.notes || undefined,
    }
    try {
      const patient = await api.post<{ id: string }>('/patients', payload)
      const validMeds = (data.medications || []).filter((m) => m.name?.trim())
      if (validMeds.length > 0) {
        for (const med of validMeds) {
          const times = med.times ? med.times.split(/[\s,]+/).filter(Boolean) : undefined
          await api.post(`/patients/${patient.id}/medications`, {
            name: med.name.trim(),
            dosage: med.dosage?.trim() || undefined,
            frequency: med.frequency?.trim() || 'daily',
            times: times?.length ? times : undefined,
            notes: med.notes || undefined,
          })
        }
      }
      navigate(`/patients/${patient.id}`)
    } catch (e) {
      if (e instanceof Error && e.message === 'UNAUTHORIZED') {
        navigate('/login', { state: { from: '/patients/new' } })
        return
      }
      setError(e instanceof Error ? e.message : 'Failed to create patient')
    }
  }

  return (
    <div className="mx-auto max-w-2xl space-y-8">
      <div>
        <h1 className="text-2xl font-semibold text-slate-900">Add patient</h1>
        <p className="mt-1 text-sm text-slate-500">Dementia care onboarding — collect key details for baseline monitoring.</p>
      </div>

      <form onSubmit={handleSubmit(onSubmit)} className="space-y-6">
        <FormSection title="Personal information">
          <Input label="Full name *" error={errors.full_name?.message} {...register('full_name')} placeholder="e.g. John Doe" />
          <Input label="Date of birth" type="date" {...register('date_of_birth')} />
          <Select label="Severity (current level)" options={severityLevels} {...register('severity')} />
          <Textarea
            label="Personal history"
            {...register('personal_history')}
            placeholder="Medical history, family history of dementia, comorbidities, previous conditions, allergies, etc."
          />
        </FormSection>

        <FormSection title="Address & location">
          <Input label="Address" {...register('address')} placeholder="Street, city, postal code" />
          <div className="grid grid-cols-2 gap-4">
            <Input label="Home latitude" type="number" step="any" {...register('home_latitude')} placeholder="e.g. 37.7749" />
            <Input label="Home longitude" type="number" step="any" {...register('home_longitude')} placeholder="e.g. -122.4194" />
          </div>
          <div className="flex items-end gap-2">
            <Input label="Geofence radius (km)" type="number" step="0.1" min="0" {...register('geofence_radius_km')} className="max-w-[140px]" />
            <Button type="button" variant="secondary" onClick={useCurrentLocation}>Use current location</Button>
          </div>
        </FormSection>

        <FormSection title="Diagnosis details">
          <Select label="Diagnosis type" options={diagnosisTypes} {...register('diagnosis_type')} />
          <Input label="Diagnosis date" type="date" {...register('diagnosis_date')} />
          <Input label="Diagnosing physician" {...register('diagnosing_physician')} placeholder="Dr. name or clinic that made the diagnosis" />
          <Select label="Stage at diagnosis" options={diagnosisStages} {...register('diagnosis_stage')} />
          <Input label="MMSE score at diagnosis (0–30)" type="number" min={0} max={30} {...register('mmse_score_at_diagnosis')} />
          <Textarea
            label="Key symptoms at diagnosis"
            {...register('diagnosis_symptoms')}
            placeholder="Memory loss, confusion, behavioral changes, disorientation, language difficulties, etc."
          />
          <Textarea
            label="Treatment plan"
            {...register('diagnosis_treatment_plan')}
            placeholder="Prescribed medications, therapies, follow-up schedule, care recommendations from diagnosing physician."
          />
        </FormSection>

        <FormSection title="Emergency contact">
          <Input label="Contact name" {...register('emergency_contact_name')} placeholder="e.g. Family member, neighbor" />
          <Input label="Contact phone" type="tel" {...register('emergency_contact_phone')} placeholder="e.g. +1 555 123 4567" />
        </FormSection>

        <FormSection title="Care team">
          <Input label="Primary care physician" {...register('primary_care_physician')} placeholder="Dr. name or clinic" />
        </FormSection>

        <FormSection title="Medications">
          <p className="text-sm text-slate-600">Add current medications. You can add more later from the patient page.</p>
          {fields.map((field, i) => (
            <div key={field.id} className="space-y-3 rounded-lg border border-slate-200 bg-white p-4">
              <div className="flex justify-between">
                <span className="text-sm font-medium text-slate-600">Medication {i + 1}</span>
                <Button type="button" variant="ghost" size="sm" onClick={() => remove(i)}>Remove</Button>
              </div>
              <div className="grid grid-cols-2 gap-3">
                <Input label="Name *" {...register(`medications.${i}.name`)} placeholder="e.g. Donepezil" />
                <Input label="Dosage" {...register(`medications.${i}.dosage`)} placeholder="e.g. 10mg" />
              </div>
              <div className="grid grid-cols-2 gap-3">
                <Select label="Frequency *" options={frequencyOptions} {...register(`medications.${i}.frequency`)} />
                <Input label="Times (e.g. 08:00, 20:00)" {...register(`medications.${i}.times`)} placeholder="Comma or space separated" />
              </div>
              <Input label="Notes" {...register(`medications.${i}.notes`)} placeholder="Take with food, etc." />
            </div>
          ))}
          <Button type="button" variant="secondary" onClick={() => append({ name: '', dosage: '', frequency: 'daily', times: '', notes: '' })}>
            + Add medication
          </Button>
        </FormSection>

        <FormSection title="Baseline (for stability monitoring)">
          <Input label="Baseline start date *" type="date" error={errors.baseline_start_date?.message} {...register('baseline_start_date')} />
          <Textarea
            label="Baseline description"
            {...register('baseline_notes')}
            placeholder="Describe the patient's typical/normal state: daily routines, usual mood, typical behaviors, what 'good' looks like for this person. This helps detect deviations."
          />
        </FormSection>

        <FormSection title="Additional notes">
          <Textarea label="Other notes" {...register('notes')} placeholder="Any other relevant information..." />
        </FormSection>

        {error && <p className="text-sm text-red-600">{error}</p>}
        <div className="flex gap-2">
          <Button type="submit" disabled={isSubmitting}>
            {isSubmitting ? 'Creating...' : 'Create patient'}
          </Button>
          <Button type="button" variant="secondary" onClick={() => navigate(-1)}>
            Cancel
          </Button>
        </div>
      </form>
    </div>
  )
}
