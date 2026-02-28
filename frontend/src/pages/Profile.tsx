import { useAuth } from '@/contexts/AuthContext'
import { Button } from '@/components/ui/Button'
import { Input } from '@/components/ui/Input'

export function Profile() {
  const { caregiver } = useAuth()

  const onSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    // TODO: PATCH /caregivers/me
  }

  return (
    <div className="mx-auto max-w-md space-y-6">
      <h1 className="text-2xl font-semibold text-slate-900">Profile</h1>
      <form onSubmit={onSubmit} className="space-y-4">
        <Input label="Full name" defaultValue={caregiver?.full_name} />
        <Input label="Email" defaultValue={caregiver?.email} disabled />
        <Button type="submit">Save</Button>
      </form>
    </div>
  )
}
