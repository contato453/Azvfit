import { createFileRoute } from '@tanstack/react-router'
import { useQuery, useQueryClient } from '@tanstack/react-query'
import { toast } from 'sonner'
import { AppShell } from '#/components/layout/AppShell'
import { Card, CardContent } from '#/components/ui/card'
import { Badge, type BadgeProps } from '#/components/ui/badge'
import { Button } from '#/components/ui/button'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '#/components/ui/table'
import { supabase } from '#/integrations/supabase/client'
import { useCurrentEdition, STATUS_LABEL, STATUS_TONE, formatDateBR, type RecordStatus } from '#/lib/programa'

export const Route = createFileRoute('/_authenticated/admin/totalpass')({
  ssr: false,
  head: () => ({ meta: [{ title: 'TotalPass — Admin AZVFIT' }] }),
  component: AdminTotalPassPage,
})

function AdminTotalPassPage() {
  const { data: edition } = useCurrentEdition()
  const queryClient = useQueryClient()

  const { data: checkins, isLoading } = useQuery({
    queryKey: ['admin-totalpass', edition?.id],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('totalpass_checkins')
        .select('*, profiles(full_name)')
        .eq('edition_id', edition!.id)
        .order('checkin_date', { ascending: false })
      if (error) throw error
      return data
    },
    enabled: !!edition?.id,
  })

  async function review(id: string, action: 'aprovar' | 'recusar') {
    const reason = action === 'recusar' ? window.prompt('Motivo da recusa:') : null
    if (action === 'recusar' && !reason) return
    const { error } = await supabase.rpc('review_totalpass_checkin', {
      _checkin_id: id,
      _action: action,
      _reason: reason ?? undefined,
    })
    if (error) {
      toast.error('Ação não realizada', { description: error.message })
      return
    }
    toast.success('Check-in atualizado.')
    await queryClient.invalidateQueries({ queryKey: ['admin-totalpass'] })
  }

  return (
    <AppShell admin>
      <div className="grid gap-4">
        <h1 className="text-lg font-bold">TotalPass — todos os check-ins</h1>
        <Card>
          <CardContent className="p-0">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Colaborador</TableHead>
                  <TableHead>Data</TableHead>
                  <TableHead>Academia</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead className="text-right">Ações</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {isLoading && (
                  <TableRow>
                    <TableCell colSpan={5}>Carregando…</TableCell>
                  </TableRow>
                )}
                {checkins?.map((c: any) => (
                  <TableRow key={c.id}>
                    <TableCell className="font-medium">{c.profiles?.full_name}</TableCell>
                    <TableCell>{formatDateBR(c.checkin_date)}</TableCell>
                    <TableCell>{c.gym_name ?? '—'}</TableCell>
                    <TableCell>
                      <Badge variant={STATUS_TONE[c.status as RecordStatus] as BadgeProps['variant']}>
                        {STATUS_LABEL[c.status as RecordStatus]}
                      </Badge>
                    </TableCell>
                    <TableCell className="flex justify-end gap-1">
                      {(c.status === 'enviado' || c.status === 'em_analise') && (
                        <>
                          <Button size="sm" onClick={() => review(c.id, 'aprovar')}>
                            Aprovar
                          </Button>
                          <Button size="sm" variant="outline" onClick={() => review(c.id, 'recusar')}>
                            Recusar
                          </Button>
                        </>
                      )}
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </CardContent>
        </Card>
      </div>
    </AppShell>
  )
}
