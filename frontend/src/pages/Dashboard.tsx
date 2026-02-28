import { Link } from 'react-router-dom'
import { usePatients } from '@/hooks/usePatients'
import { Button } from '@/components/ui/Button'
import { PatientCard } from '@/components/patients/PatientCard'
import { AlertCard } from '@/components/patients/AlertCard'
import type { Alert } from '@/types'

export function Dashboard() {
  const { data, isLoading } = usePatients()
  const patients = data?.items ?? []
  const alerts: Alert[] = [] // TODO: fetch from GET /patients/:id/alerts or aggregated

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <h1 className="text-2xl font-semibold text-slate-900">Dashboard</h1>
        <Link to="/patients/new">
          <Button>Add patient</Button>
        </Link>
      </div>

      {alerts.length > 0 && (
        <section>
          <h2 className="mb-3 text-lg font-medium text-slate-800">Recent alerts</h2>
          <div className="space-y-2">
            {alerts.slice(0, 5).map((alert) => (
              <AlertCard key={alert.id} alert={alert} />
            ))}
          </div>
        </section>
      )}

      <section>
        <h2 className="mb-3 text-lg font-medium text-slate-800">Patients</h2>
        {isLoading ? (
          <div className="flex justify-center py-12">
            <div className="h-8 w-8 animate-spin rounded-full border-2 border-slate-300 border-t-slate-600" />
          </div>
        ) : patients.length === 0 ? (
          <div className="rounded-xl border border-dashed border-slate-300 bg-slate-50 p-12 text-center">
            <p className="text-slate-600">No patients yet.</p>
            <Link to="/patients/new" className="mt-4 inline-block">
              <Button>Add your first patient</Button>
            </Link>
          </div>
        ) : (
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {patients.map((patient) => (
              <PatientCard key={patient.id} patient={patient} />
            ))}
          </div>
        )}
      </section>
    </div>
  )
}
