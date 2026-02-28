import { Link } from 'react-router-dom'
import { usePatients } from '@/hooks/usePatients'
import { Button } from '@/components/ui/Button'
import { PatientCard } from '@/components/patients/PatientCard'

export function PatientList() {
  const { data, isLoading } = usePatients()
  const patients = data?.items ?? []

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <h1 className="text-2xl font-semibold text-slate-900">Patients</h1>
        <Link to="/patients/new">
          <Button>Add patient</Button>
        </Link>
      </div>

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
    </div>
  )
}
