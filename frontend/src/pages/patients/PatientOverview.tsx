import { Link, useParams } from 'react-router-dom'
import { usePatient } from '@/hooks/usePatient'
import { StabilityBadge } from '@/components/patients/StabilityBadge'
import { Button } from '@/components/ui/Button'
import type { StabilityLevel } from '@/types'

const navLinks = [
  { to: 'medications', label: 'Medications', icon: '💊' },
  { to: 'appointments', label: 'Appointments', icon: '📅' },
  { to: 'surveys', label: 'Surveys', icon: '📋' },
  { to: 'contacts', label: 'Contacts', icon: '👤' },
  { to: 'events', label: 'Events', icon: '📡' },
  { to: 'settings', label: 'Settings', icon: '⚙️' },
]

export function PatientOverview() {
  const { id } = useParams<{ id: string }>()
  const { patient, stability, isLoading } = usePatient(id)

  if (isLoading || !patient) {
    return (
      <div className="flex justify-center py-12">
        <div className="h-8 w-8 animate-spin rounded-full border-2 border-slate-300 border-t-slate-600" />
      </div>
    )
  }

  const level: StabilityLevel = stability?.current_level ?? 'informational'

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
        <div>
          <h2 className="text-xl font-semibold text-slate-900">{patient.full_name}</h2>
          <p className="text-slate-600">Baseline since {new Date(patient.baseline_start_date).toLocaleDateString()}</p>
          <div className="mt-2">
            <StabilityBadge level={level} size="md" />
          </div>
        </div>
        <div className="flex gap-2">
          <Button variant="ghost" size="sm">
            {patient.monitoring_paused ? 'Resume monitoring' : 'Pause monitoring'}
          </Button>
          <Link to={`/patients/${id}/settings`}>
            <Button variant="secondary" size="sm">
              Settings
            </Button>
          </Link>
        </div>
      </div>

      {stability && (
        <section className="rounded-xl border border-slate-200 bg-white p-4">
          <h3 className="mb-3 font-medium text-slate-800">Stability domains</h3>
          <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
            {Object.entries(stability.domains ?? {}).map(([key, val]) => (
              <div key={key} className="rounded-lg bg-slate-50 p-3">
                <p className="text-sm font-medium text-slate-700">
                  {key.replace(/_/g, ' ')}
                </p>
                <p className="text-slate-600">
                  {val.score !== undefined && `Score: ${(val.score * 100).toFixed(0)}%`}
                  {val.trend && ` • ${val.trend}`}
                  {val.anomaly_count !== undefined && ` • ${val.anomaly_count} anomalies`}
                  {val.breach_count !== undefined && ` • ${val.breach_count} breaches`}
                </p>
              </div>
            ))}
          </div>
        </section>
      )}

      <section>
        <h3 className="mb-3 font-medium text-slate-800">Quick links</h3>
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
          {navLinks.map(({ to, label, icon }) => (
            <Link
              key={to}
              to={`/patients/${id}/${to}`}
              className="flex items-center gap-3 rounded-xl border border-slate-200 bg-white p-4 transition hover:border-slate-300 hover:shadow"
            >
              <span className="text-2xl">{icon}</span>
              <span className="font-medium text-slate-800">{label}</span>
            </Link>
          ))}
        </div>
      </section>
    </div>
  )
}
