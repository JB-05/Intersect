import { Link, useParams } from 'react-router-dom'

const patientNav = [
  { to: '', label: 'Overview' },
  { to: 'medications', label: 'Medications' },
  { to: 'appointments', label: 'Appointments' },
  { to: 'surveys', label: 'Surveys' },
  { to: 'known-faces', label: 'Known faces' },
  { to: 'face-recognition', label: 'Face recognition' },
  { to: 'events', label: 'Events' },
  { to: 'voice', label: 'Voice assistant' },
  { to: 'settings', label: 'Settings' },
]

interface SidebarProps {
  open: boolean
  onClose: () => void
}

export function Sidebar({ open, onClose }: SidebarProps) {
  const { id } = useParams()

  const content = (
    <aside className="flex w-56 flex-col border-r border-slate-200 bg-white">
      <div className="flex flex-col gap-1 p-2">
        <Link to="/dashboard" className="rounded-lg px-3 py-2 text-slate-600 hover:bg-slate-100" onClick={onClose}>
          Dashboard
        </Link>
        <Link to="/patients" className="rounded-lg px-3 py-2 text-slate-600 hover:bg-slate-100" onClick={onClose}>
          Patients
        </Link>
        {id && (
          <>
            <div className="my-2 border-t border-slate-200" />
            <p className="px-3 py-1 text-xs font-medium uppercase text-slate-400">Patient</p>
            {patientNav.map(({ to, label }) => (
              <Link
                key={to}
                to={to ? `/patients/${id}/${to}` : `/patients/${id}`}
                onClick={onClose}
                className="rounded-lg px-3 py-2 text-slate-600 hover:bg-slate-100"
              >
                {label}
              </Link>
            ))}
          </>
        )}
      </div>
    </aside>
  )

  if (open) {
    return (
      <>
        <div className="fixed inset-0 z-40 bg-black/50 lg:hidden" onClick={onClose} />
        <div className="fixed left-0 top-14 z-50 h-[calc(100vh-3.5rem)] w-56 bg-white lg:static lg:top-0 lg:z-0 lg:block">
          {content}
        </div>
      </>
    )
  }

  return <div className="hidden lg:block">{content}</div>
}
