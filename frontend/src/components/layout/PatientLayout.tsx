import { Link, Outlet, useParams } from 'react-router-dom'
import { usePatient } from '@/hooks/usePatient'

export function PatientLayout() {
  const { id } = useParams<{ id: string }>()
  const { patient, isLoading, error } = usePatient(id)

  if (isLoading || !patient) {
    return (
      <div className="flex flex-col items-center justify-center py-12">
        {error && (
          <p className="mb-4 text-sm text-red-600">{(error as Error).message}</p>
        )}
        <div className="h-8 w-8 animate-spin rounded-full border-2 border-slate-300 border-t-slate-600" />
      </div>
    )
  }

  return (
    <div className="space-y-6">
      <div className="border-b border-slate-200 pb-4">
        <Link to={`/patients/${id}`} className="text-sm text-slate-500 hover:text-slate-700">
          ← Patients
        </Link>
        <h1 className="mt-1 text-2xl font-semibold text-slate-900">{patient.full_name}</h1>
      </div>
      <Outlet />
    </div>
  )
}
