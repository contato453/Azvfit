import { createFileRoute, Outlet, redirect } from '@tanstack/react-router'
import { supabase } from '#/integrations/supabase/client'

// Gate de comissão/admin: além da sessão (já garantida por _authenticated),
// confere o papel diretamente no banco via is_staff() — nunca confiar em
// estado do client para decidir acesso a área sensível.
export const Route = createFileRoute('/_authenticated/admin')({
  ssr: false,
  beforeLoad: async () => {
    const { data, error } = await supabase.rpc('is_staff')
    if (error || !data) {
      throw redirect({ to: '/dashboard' })
    }
  },
  component: () => <Outlet />,
})
