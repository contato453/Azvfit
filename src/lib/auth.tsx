import * as React from 'react'
import type { Session, User } from '@supabase/supabase-js'
import { supabase } from '#/integrations/supabase/client'

export type AppRole = 'admin' | 'comissao' | 'colaborador'

export interface Profile {
  id: string
  full_name: string
  email: string
  phone: string | null
  department: string | null
  unit: string | null
  job_title: string | null
  avatar_url: string | null
  is_active: boolean
}

interface AuthContextValue {
  session: Session | null
  user: User | null
  profile: Profile | null
  roles: AppRole[]
  isAdmin: boolean
  isComissao: boolean
  isStaff: boolean
  loading: boolean
  refresh: () => Promise<void>
  signOut: () => Promise<void>
}

const AuthContext = React.createContext<AuthContextValue | null>(null)

async function loadProfileAndRoles(userId: string) {
  const [{ data: profile }, { data: rolesRows }] = await Promise.all([
    supabase.from('profiles').select('*').eq('id', userId).maybeSingle(),
    supabase.from('user_roles').select('role').eq('user_id', userId),
  ])
  return {
    profile: (profile as Profile) ?? null,
    roles: (rolesRows ?? []).map((r) => r.role as AppRole),
  }
}

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [session, setSession] = React.useState<Session | null>(null)
  const [profile, setProfile] = React.useState<Profile | null>(null)
  const [roles, setRoles] = React.useState<AppRole[]>([])
  const [loading, setLoading] = React.useState(true)

  const applySession = React.useCallback(async (nextSession: Session | null) => {
    setSession(nextSession)
    if (!nextSession?.user) {
      setProfile(null)
      setRoles([])
      return
    }
    const { profile: p, roles: r } = await loadProfileAndRoles(nextSession.user.id)
    setProfile(p)
    setRoles(r)
  }, [])

  const refresh = React.useCallback(async () => {
    const { data } = await supabase.auth.getSession()
    await applySession(data.session)
  }, [applySession])

  React.useEffect(() => {
    let mounted = true

    supabase.auth.getSession().then(async ({ data }) => {
      if (!mounted) return
      await applySession(data.session)
      if (mounted) setLoading(false)
    })

    const { data: sub } = supabase.auth.onAuthStateChange((_event, nextSession) => {
      // Nunca chamar código async do Supabase direto dentro do callback —
      // setTimeout(0) evita deadlock do client (armadilha clássica documentada).
      setTimeout(() => {
        if (mounted) applySession(nextSession)
      }, 0)
    })

    return () => {
      mounted = false
      sub.subscription.unsubscribe()
    }
  }, [applySession])

  const signOut = React.useCallback(async () => {
    await supabase.auth.signOut()
    setSession(null)
    setProfile(null)
    setRoles([])
  }, [])

  const value = React.useMemo<AuthContextValue>(
    () => ({
      session,
      user: session?.user ?? null,
      profile,
      roles,
      isAdmin: roles.includes('admin'),
      isComissao: roles.includes('admin') || roles.includes('comissao'),
      isStaff: roles.includes('admin') || roles.includes('comissao'),
      loading,
      refresh,
      signOut,
    }),
    [session, profile, roles, loading, refresh, signOut],
  )

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>
}

export function useAuth() {
  const ctx = React.useContext(AuthContext)
  if (!ctx) throw new Error('useAuth precisa estar dentro de <AuthProvider>.')
  return ctx
}
