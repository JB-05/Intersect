import { useQuery } from '@tanstack/react-query'
import { api } from '@/lib/api'
import type { Patient } from '@/types'

export function usePatients() {
  return useQuery({
    queryKey: ['patients'],
    queryFn: async () => {
      try {
        const res = await api.get<{ items: Patient[]; total: number } | Patient[]>('/patients')
        if (Array.isArray(res)) return { items: res, total: res.length }
        return res ?? { items: [], total: 0 }
      } catch {
        return { items: [], total: 0 }
      }
    },
  })
}
