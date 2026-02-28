import type { StabilityLevel } from '@/types'

interface StabilityBadgeProps {
  level: StabilityLevel
  size?: 'sm' | 'md'
}

const levelConfig: Record<StabilityLevel, { label: string; className: string }> = {
  informational: { label: 'Stable', className: 'bg-green-100 text-green-800' },
  attention_required: { label: 'Attention', className: 'bg-amber-100 text-amber-800' },
  teleconsult_recommended: { label: 'Teleconsult', className: 'bg-red-100 text-red-800' },
}

export function StabilityBadge({ level, size = 'md' }: StabilityBadgeProps) {
  const config = levelConfig[level] ?? levelConfig.informational
  const sizeClass = size === 'sm' ? 'text-xs px-2 py-0.5' : 'text-sm px-3 py-1'
  return (
    <span className={`inline-flex rounded-full font-medium ${config.className} ${sizeClass}`}>
      {config.label}
    </span>
  )
}
