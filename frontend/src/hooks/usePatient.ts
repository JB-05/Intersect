import { useQuery } from '@tanstack/react-query'
import { api } from '@/lib/api'
import type { Patient, Stability } from '@/types'

export function usePatient(id: string | undefined) {
  const patientQuery = useQuery({
    queryKey: ['patient', id],
    queryFn: () => api.get<Patient>(`/patients/${id}`),
    enabled: !!id,
  })

  const stabilityQuery = useQuery({
    queryKey: ['stability', id],
    queryFn: () => api.get<Stability>(`/patients/${id}/stability`),
    enabled: !!id,
  })

  return {
    patient: patientQuery.data,
    stability: stabilityQuery.data,
    isLoading: patientQuery.isLoading,
    error: patientQuery.error,
    refetch: () => {
      patientQuery.refetch()
      stabilityQuery.refetch()
    },
  }
}
