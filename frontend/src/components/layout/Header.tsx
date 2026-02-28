import { useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { useAuth } from '@/contexts/AuthContext'

interface HeaderProps {
  onMenuClick?: () => void
}

export function Header({ onMenuClick }: HeaderProps) {
  const { caregiver, signOut } = useAuth()
  const navigate = useNavigate()
  const [menuOpen, setMenuOpen] = useState(false)

  const handleSignOut = async () => {
    await signOut()
    navigate('/login')
    setMenuOpen(false)
  }

  return (
    <header className="sticky top-0 z-40 flex h-14 items-center justify-between border-b border-slate-200 bg-white px-4">
      <div className="flex items-center gap-4">
        {onMenuClick && (
          <button
            onClick={onMenuClick}
            className="flex h-10 w-10 items-center justify-center rounded-lg hover:bg-slate-100 lg:hidden"
            aria-label="Open menu"
          >
            <svg className="h-6 w-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16M4 18h16" />
            </svg>
          </button>
        )}
        <Link to="/dashboard" className="text-lg font-semibold text-slate-800">
          Caregiver Monitor
        </Link>
        <nav className="hidden gap-2 lg:flex">
          <Link to="/dashboard" className="rounded-lg px-3 py-2 text-slate-600 hover:bg-slate-100 hover:text-slate-900">
            Dashboard
          </Link>
          <Link to="/patients" className="rounded-lg px-3 py-2 text-slate-600 hover:bg-slate-100 hover:text-slate-900">
            Patients
          </Link>
        </nav>
      </div>

      <div className="relative">
        <button
          onClick={() => setMenuOpen(!menuOpen)}
          className="flex items-center gap-2 rounded-lg px-3 py-2 hover:bg-slate-100"
        >
          <div className="h-8 w-8 rounded-full bg-slate-300 flex items-center justify-center text-sm font-medium text-slate-700">
            {caregiver?.full_name?.charAt(0) ?? '?'}
          </div>
          <span className="hidden text-sm text-slate-700 sm:inline">{caregiver?.full_name}</span>
          <svg className={`h-4 w-4 transition ${menuOpen ? 'rotate-180' : ''}`} fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
          </svg>
        </button>
        {menuOpen && (
          <>
            <div className="fixed inset-0 z-10" onClick={() => setMenuOpen(false)} />
            <div className="absolute right-0 top-full z-20 mt-1 w-48 rounded-lg border border-slate-200 bg-white py-1 shadow-lg">
              <Link
                to="/profile"
                className="block px-4 py-2 text-sm text-slate-700 hover:bg-slate-50"
                onClick={() => setMenuOpen(false)}
              >
                Profile
              </Link>
              <button
                onClick={handleSignOut}
                className="w-full px-4 py-2 text-left text-sm text-slate-700 hover:bg-slate-50"
              >
                Sign out
              </button>
            </div>
          </>
        )}
      </div>
    </header>
  )
}
