import { Link } from 'react-router-dom'
import { useAuth } from '@/contexts/AuthContext'
import { Button } from '@/components/ui/Button'

export function Landing() {
  const { user, loading } = useAuth()

  if (loading) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-slate-100">
        <div className="h-8 w-8 animate-spin rounded-full border-2 border-slate-300 border-t-slate-600" />
      </div>
    )
  }

  if (user) {
    return (
      <div className="flex min-h-screen flex-col items-center justify-center bg-slate-100 p-4">
        <h1 className="mb-2 text-3xl font-bold text-slate-900">Caregiver Monitor</h1>
        <p className="mb-8 text-slate-600">Cognitive Stability Monitoring System</p>
        <Link to="/dashboard">
          <Button size="lg">Go to Dashboard</Button>
        </Link>
      </div>
    )
  }

  return (
    <div className="flex min-h-screen flex-col items-center justify-center bg-slate-100 p-4">
      <h1 className="mb-2 text-3xl font-bold text-slate-900">Caregiver Monitor</h1>
      <p className="mb-8 text-slate-600">Cognitive Stability Monitoring System</p>
      <div className="flex gap-4">
        <Link to="/login">
          <Button variant="secondary">Sign in</Button>
        </Link>
        <Link to="/signup">
          <Button>Sign up</Button>
        </Link>
      </div>
    </div>
  )
}
