import { createFileRoute, Link } from '@tanstack/react-router'
import { useQuery } from '@tanstack/react-query'
import { Trophy, ClipboardCheck, Clock, Target, Watch, Megaphone } from 'lucide-react'
import { AppShell } from '#/components/layout/AppShell'
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '#/components/ui/card'
import { Button } from '#/components/ui/button'
import { Alert, AlertDescription, AlertTitle } from '#/components/ui/alert'
import { Skeleton } from '#/components/ui/skeleton'
import { supabase } from '#/integrations/supabase/client'
import { useAuth } from '#/lib/auth'
import { useCurrentEdition, useRegulationAcceptance, formatDateBR } from '#/lib/programa'

export const Route = createFileRoute('/_authenticated/dashboard')({
  ssr: false,
  head: () => ({ meta: [{ title: 'Início — AZVFIT' }] }),
  component: DashboardPage,
})

function DashboardPage() {
  const { user, profile } = useAuth()
  const { data: edition, isLoading: loadingEdition } = useCurrentEdition()
  const { data: acceptance, isLoading: loadingAcceptance } = useRegulationAcceptance(edition?.id)

  const { data: participant } = useQuery({
    queryKey: ['participant', edition?.id, user?.id],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('edition_participants')
        .select('*')
        .eq('edition_id', edition!.id)
        .eq('user_id', user!.id)
        .maybeSingle()
      if (error) throw error
      return data
    },
    enabled: !!edition?.id && !!user && !!acceptance,
  })

  const { data: pendingCount } = useQuery({
    queryKey: ['pending-count', edition?.id, user?.id],
    queryFn: async () => {
      const { count, error } = await supabase
        .from('activity_records')
        .select('id', { count: 'exact', head: true })
        .eq('edition_id', edition!.id)
        .eq('user_id', user!.id)
        .in('status', ['enviado', 'em_analise'])
      if (error) throw error
      return count ?? 0
    },
    enabled: !!edition?.id && !!user,
  })

  const { data: announcements } = useQuery({
    queryKey: ['announcements', edition?.id],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('announcements')
        .select('*')
        .eq('edition_id', edition!.id)
        .eq('status', 'publicado')
        .order('publish_at', { ascending: false })
        .limit(3)
      if (error) throw error
      return data
    },
    enabled: !!edition?.id,
  })

  const { data: openMissions } = useQuery({
    queryKey: ['open-missions-count', edition?.id],
    queryFn: async () => {
      const { count, error } = await supabase
        .from('missions')
        .select('id', { count: 'exact', head: true })
        .eq('edition_id', edition!.id)
        .eq('is_published', true)
      if (error) throw error
      return count ?? 0
    },
    enabled: !!edition?.id,
  })

  if (loadingEdition || loadingAcceptance) {
    return (
      <AppShell>
        <div className="grid gap-4">
          <Skeleton className="h-32 w-full" />
          <Skeleton className="h-24 w-full" />
        </div>
      </AppShell>
    )
  }

  if (!edition) {
    return (
      <AppShell>
        <Alert>
          <AlertTitle>Nenhuma edição ativa</AlertTitle>
          <AlertDescription>Ainda não há uma edição do AZVFIT em andamento. Volte em breve.</AlertDescription>
        </Alert>
      </AppShell>
    )
  }

  if (!acceptance) {
    return (
      <AppShell>
        <Card className="border-accent/40 bg-accent/10">
          <CardHeader>
            <CardTitle>Falta pouco para começar</CardTitle>
            <CardDescription>
              Para registrar atividades você precisa aceitar o regulamento, o termo de participação voluntária e a
              política de privacidade da edição {edition.name}.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <Link to="/regulamento">
              <Button>Ler e aceitar o regulamento</Button>
            </Link>
          </CardContent>
        </Card>
      </AppShell>
    )
  }

  return (
    <AppShell>
      <div className="grid gap-4">
        <div>
          <h1 className="text-xl font-bold">Olá, {profile?.full_name?.split(' ')[0] ?? 'colaborador'} 👋</h1>
          <p className="text-sm text-muted-foreground">{edition.name}</p>
        </div>

        <div className="grid grid-cols-2 gap-3 md:grid-cols-4">
          <StatCard
            icon={Trophy}
            label="Pontos oficiais"
            value={participant?.total_points ?? 0}
            tone="text-primary"
          />
          <StatCard icon={Clock} label="Em análise" value={pendingCount ?? 0} tone="text-warning-foreground" />
          <StatCard icon={Target} label="Missões abertas" value={openMissions ?? 0} tone="text-accent-foreground" />
          <StatCard icon={Watch} label="TotalPass" value="Ver" tone="text-primary" href="/totalpass" />
        </div>

        <div className="grid gap-3 md:grid-cols-2">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-base">
                <ClipboardCheck className="size-4 text-primary" /> Novo registro
              </CardTitle>
              <CardDescription>Registre uma atividade de hoje e envie a evidência.</CardDescription>
            </CardHeader>
            <CardContent>
              <Link to="/atividades">
                <Button className="w-full">Ir para atividades</Button>
              </Link>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-base">
                <Megaphone className="size-4 text-primary" /> Comunicados
              </CardTitle>
              <CardDescription>Últimas novidades da comissão organizadora.</CardDescription>
            </CardHeader>
            <CardContent className="grid gap-2">
              {!announcements?.length && <p className="text-sm text-muted-foreground">Nenhum comunicado ainda.</p>}
              {announcements?.map((a) => (
                <div key={a.id} className="rounded-md border border-border p-2 text-sm">
                  <p className="font-medium">{a.title}</p>
                  <p className="text-xs text-muted-foreground">{formatDateBR(a.publish_at?.slice(0, 10))}</p>
                </div>
              ))}
            </CardContent>
          </Card>
        </div>

        {edition.show_ranking && (
          <Card>
            <CardContent className="flex items-center justify-between p-4">
              <div className="flex items-center gap-2">
                <Trophy className="size-5 text-accent" />
                <span className="text-sm font-medium">O ranking já está publicado!</span>
              </div>
              <Link to="/ranking">
                <Button variant="outline" size="sm">
                  Ver ranking
                </Button>
              </Link>
            </CardContent>
          </Card>
        )}
      </div>
    </AppShell>
  )
}

function StatCard({
  icon: Icon,
  label,
  value,
  tone,
  href,
}: {
  icon: typeof Trophy
  label: string
  value: string | number
  tone: string
  href?: string
}) {
  const content = (
    <Card>
      <CardContent className="flex flex-col gap-1 p-4">
        <Icon className={`size-5 ${tone}`} />
        <span className="text-2xl font-bold">{value}</span>
        <span className="text-xs text-muted-foreground">{label}</span>
      </CardContent>
    </Card>
  )
  return href ? <Link to={href}>{content}</Link> : content
}
