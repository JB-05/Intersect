import { Link } from 'react-router-dom'
import type { Patient } from '@/types'
import { StabilityBadge } from './StabilityBadge'
import type { StabilityLevel } from '@/types'

interface PatientCardProps {
  patient: Patient
  stabilityLevel?: StabilityLevel
}

export function PatientCard({ patient, stabilityLevel = 'informational' }: PatientCardProps) {
  return (
    <Link
      to={`/patients/${patient.id}`}
      className="block rounded-xl border border-slate-200 bg-white p-4 shadow-sm transition hover:border-slate-300 hover:shadow"
    >
      <div className="flex items-start justify-between">
        <div className="flex items-center gap-3">
          <div className="flex h-12 w-12 items-center justify-center rounded-full bg-slate-200 text-lg font-medium text-slate-700">
            {patient.full_name.charAt(0)}
          </div>
          <div>
            <h3 className="font-medium text-slate-900">{patient.full_name}</h3>
            <p className="text-sm text-slate-500">
              Baseline: {new Date(patient.baseline_start_date).toLocaleDateString()}
            </p>
          </div>
        </div>
        <StabilityBadge level={stabilityLevel} size="sm" />
      </div>
    </Link>
  )
}
