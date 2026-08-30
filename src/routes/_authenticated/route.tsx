import { createFileRoute, Outlet, redirect } from '@tanstack/react-router'
import { supabase } from '#/integrations/supabase/client'

// Gate de autenticação. ssr:false + beforeLoad chamando supabase.auth.getUser()
// é o único jeito seguro em TanStack Start: a sessão vive em localStorage, então
// um gate em rota SSR de topo cai em loop de redirect no hard refresh.
export const Route = createFileRoute('/_authenticated')({
  ssr: false,
  beforeLoad: async ({ location }) => {
    const { data, error } = await supabase.auth.getUser()
    if (error || !data.user) {
      throw redirect({ to: '/login', search: { redirect: location.href } as any })
    }
  },
  component: () => <Outlet />,
})
