import { createContext, useContext, useEffect, useState, type ReactNode } from 'react'
import { type User } from '@supabase/supabase-js'
import { supabase } from '@/lib/supabase'
import type { Caregiver } from '@/types'

interface AuthContextType {
  user: User | null
  caregiver: Caregiver | null
  loading: boolean
  signOut: () => Promise<void>
}

const AuthContext = createContext<AuthContextType | undefined>(undefined)

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null)
  const [caregiver, setCaregiver] = useState<Caregiver | null>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    supabase.auth.getSession()
      .then(({ data: { session } }) => {
        setUser(session?.user ?? null)
        if (session?.user) {
          setCaregiver({
            id: session.user.id,
            full_name: (session.user.user_metadata?.full_name as string) ?? session.user.email ?? 'Caregiver',
            email: session.user.email,
          })
        } else {
          setCaregiver(null)
        }
      })
      .catch(() => setUser(null))
      .finally(() => setLoading(false))

    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      setUser(session?.user ?? null)
      if (session?.user) {
        setCaregiver({
          id: session.user.id,
          full_name: (session.user.user_metadata?.full_name as string) ?? session.user.email ?? 'Caregiver',
          email: session.user.email,
        })
      } else {
        setCaregiver(null)
      }
    })

    return () => subscription.unsubscribe()
  }, [])

  const signOut = async () => {
    await supabase.auth.signOut()
    setUser(null)
    setCaregiver(null)
  }

  return (
    <AuthContext.Provider value={{ user, caregiver, loading, signOut }}>
      {children}
    </AuthContext.Provider>
  )
}

export function useAuth() {
  const ctx = useContext(AuthContext)
  if (ctx === undefined) {
    throw new Error('useAuth must be used within AuthProvider')
  }
  return ctx
}
