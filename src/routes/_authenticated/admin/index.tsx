import { createFileRoute } from '@tanstack/react-router'
import { useQuery } from '@tanstack/react-query'
import { PieChart, Pie, Cell, ResponsiveContainer, BarChart, Bar, XAxis, YAxis, Tooltip } from 'recharts'
import { Users, ClipboardCheck, Trophy, CalendarCheck } from 'lucide-react'
import { AppShell } from '#/components/layout/AppShell'
import { Card, CardContent, CardHeader, CardTitle } from '#/components/ui/card'
import { Skeleton } from '#/components/ui/skeleton'
import { supabase } from '#/integrations/supabase/client'
import { useCurrentEdition } from '#/lib/programa'

export const Route = createFileRoute('/_authenticated/admin/')({
  ssr: false,
  head: () => ({ meta: [{ title: 'Painel administrativo — AZVFIT' }] }),
  component: AdminIndexPage,
})

const STATUS_COLORS: Record<string, string> = {
  aprovado: 'var(--color-success)',
  em_analise: 'var(--color-warning)',
  enviado: 'var(--color-primary)',
  recusado: 'var(--color-destructive)',
  correcao_solicitada: 'var(--color-accent)',
  cancelado: 'var(--color-muted-foreground)',
}

function AdminIndexPage() {
  const { data: edition } = useCurrentEdition()

  const { data: metrics, isLoading } = useQuery({
    queryKey: ['admin-metrics', edition?.id],
    queryFn: async () => {
      const [{ count: totalParticipants }, { count: pendingCount }, { data: statusRows }, { data: categoryRows }] =
        await Promise.all([
          supabase
            .from('edition_participants')
            .select('id', { count: 'exact', head: true })
            .eq('edition_id', edition!.id),
          supabase
            .from('activity_records')
            .select('id', { count: 'exact', head: true })
            .eq('edition_id', edition!.id)
            .in('status', ['enviado', 'em_analise']),
          supabase.from('activity_records').select('status').eq('edition_id', edition!.id),
          supabase
            .from('activity_records')
            .select('status, activities(activity_categories(name))')
            .eq('edition_id', edition!.id)
            .eq('status', 'aprovado'),
        ])

      const byStatus = Object.entries(
        (statusRows ?? []).reduce<Record<string, number>>((acc, r) => {
          acc[r.status] = (acc[r.status] ?? 0) + 1
          return acc
        }, {}),
      ).map(([status, count]) => ({ status, count }))

      const byCategory = Object.entries(
        (categoryRows ?? []).reduce<Record<string, number>>((acc, r: any) => {
          const name = r.activities?.activity_categories?.name ?? 'Outros'
          acc[name] = (acc[name] ?? 0) + 1
          return acc
        }, {}),
      ).map(([name, count]) => ({ name, count }))

      return { totalParticipants: totalParticipants ?? 0, pendingCount: pendingCount ?? 0, byStatus, byCategory }
    },
    enabled: !!edition?.id,
  })

  if (isLoading || !metrics) {
    return (
      <AppShell admin>
        <Skeleton className="h-64 w-full" />
      </AppShell>
    )
  }

  return (
    <AppShell admin>
      <div className="grid gap-4">
        <h1 className="text-lg font-bold">Painel administrativo — {edition?.name}</h1>

        <div className="grid grid-cols-2 gap-3 md:grid-cols-4">
          <MetricCard icon={Users} label="Participantes" value={metrics.totalParticipants} />
          <MetricCard icon={ClipboardCheck} label="Fila de validação" value={metrics.pendingCount} />
          <MetricCard icon={Trophy} label="Edição" value={edition?.status ?? '—'} />
          <MetricCard icon={CalendarCheck} label="Encerra em" value={edition?.scoring_end_date ?? '—'} />
        </div>

        <div className="grid gap-4 md:grid-cols-2">
          <Card>
            <CardHeader>
              <CardTitle className="text-base">Registros por status</CardTitle>
            </CardHeader>
            <CardContent className="h-64">
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie data={metrics.byStatus} dataKey="count" nameKey="status" innerRadius={50} outerRadius={80}>
                    {metrics.byStatus.map((entry) => (
                      <Cell key={entry.status} fill={STATUS_COLORS[entry.status] ?? 'var(--color-muted)'} />
                    ))}
                  </Pie>
                  <Tooltip />
                </PieChart>
              </ResponsiveContainer>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle className="text-base">Aprovados por categoria</CardTitle>
            </CardHeader>
            <CardContent className="h-64">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={metrics.byCategory}>
                  <XAxis dataKey="name" fontSize={12} />
                  <YAxis fontSize={12} allowDecimals={false} />
                  <Tooltip />
                  <Bar dataKey="count" fill="var(--color-primary)" radius={[4, 4, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            </CardContent>
          </Card>
        </div>
      </div>
    </AppShell>
  )
}

function MetricCard({ icon: Icon, label, value }: { icon: typeof Users; label: string; value: string | number }) {
  return (
    <Card>
      <CardContent className="flex flex-col gap-1 p-4">
        <Icon className="size-5 text-primary" />
        <span className="text-xl font-bold">{value}</span>
        <span className="text-xs text-muted-foreground">{label}</span>
      </CardContent>
    </Card>
  )
}
