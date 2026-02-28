import { Link } from 'react-router-dom'
import type { Alert } from '@/types'
import { StabilityBadge } from './StabilityBadge'

interface AlertCardProps {
  alert: Alert
  patientName?: string
}

export function AlertCard({ alert, patientName }: AlertCardProps) {
  const isLevel2Or3 =
    alert.level === 'attention_required' || alert.level === 'teleconsult_recommended'

  return (
    <Link
      to={`/patients/${alert.patient_id}`}
      className={`block rounded-lg border p-3 transition ${
        isLevel2Or3
          ? 'border-amber-200 bg-amber-50 hover:bg-amber-100'
          : 'border-slate-200 bg-white hover:bg-slate-50'
      }`}
    >
      <div className="flex items-start justify-between gap-2">
        <div>
          <div className="flex items-center gap-2">
            <StabilityBadge level={alert.level} size="sm" />
            {patientName && (
              <span className="text-sm text-slate-500">{patientName}</span>
            )}
          </div>
          <h4 className="mt-1 font-medium text-slate-900">{alert.title}</h4>
          {alert.message && (
            <p className="mt-0.5 text-sm text-slate-600 line-clamp-2">{alert.message}</p>
          )}
        </div>
        <span className="text-xs text-slate-400 whitespace-nowrap">
          {new Date(alert.created_at).toLocaleDateString()}
        </span>
      </div>
    </Link>
  )
}
