import { createFileRoute } from '@tanstack/react-router'
import { useState } from 'react'
import { toast } from 'sonner'
import { useQueryClient } from '@tanstack/react-query'
import { Trash2 } from 'lucide-react'
import { AppShell } from '#/components/layout/AppShell'
import { Card, CardContent } from '#/components/ui/card'
import { Badge, type BadgeProps } from '#/components/ui/badge'
import { Skeleton } from '#/components/ui/skeleton'
import { Button } from '#/components/ui/button'
import { RecordFormDialog } from '#/components/records/RecordFormDialog'
import { supabase } from '#/integrations/supabase/client'
import { useCurrentEdition, useMyRecords, STATUS_LABEL, STATUS_TONE, formatDateBR, EDITABLE_STATUSES } from '#/lib/programa'
import type { Database } from '#/integrations/supabase/types'

export const Route = createFileRoute('/_authenticated/meus-registros')({
  ssr: false,
  head: () => ({ meta: [{ title: 'Meus registros — AZVFIT' }] }),
  component: MeusRegistrosPage,
})

type Activity = Database['public']['Tables']['activities']['Row'] & {
  activity_categories: Database['public']['Tables']['activity_categories']['Row'] | null
}

function MeusRegistrosPage() {
  const { data: edition } = useCurrentEdition()
  const { data: records, isLoading } = useMyRecords(edition?.id)
  const queryClient = useQueryClient()
  const [editing, setEditing] = useState<Activity | null>(null)

  async function handleDeleteDraft(id: string) {
    const { error } = await supabase.from('activity_records').delete().eq('id', id)
    if (error) {
      toast.error('Não foi possível excluir', { description: error.message })
      return
    }
    toast.success('Rascunho excluído.')
    await queryClient.invalidateQueries({ queryKey: ['my-records'] })
  }

  return (
    <AppShell>
      <div className="grid gap-4">
        <h1 className="text-lg font-bold">Meus registros</h1>

        {isLoading && (
          <div className="grid gap-3">
            <Skeleton className="h-20 w-full" />
            <Skeleton className="h-20 w-full" />
          </div>
        )}

        {!isLoading && !records?.length && (
          <p className="text-sm text-muted-foreground">Você ainda não registrou nenhuma atividade.</p>
        )}

        <div className="grid gap-2">
          {records?.map((record) => {
            const activity = (record as any).activities as Activity | null
            const editable = EDITABLE_STATUSES.includes(record.status)
            return (
              <Card key={record.id}>
                <CardContent className="flex items-start justify-between gap-3 p-4">
                  <div className="min-w-0 flex-1">
                    <div className="flex flex-wrap items-center gap-2">
                      <p className="font-medium">{activity?.name}</p>
                      <Badge variant={STATUS_TONE[record.status] as BadgeProps['variant']}>
                        {STATUS_LABEL[record.status]}
                      </Badge>
                    </div>
                    <p className="text-xs text-muted-foreground">
                      {formatDateBR(record.activity_date)} · {activity?.activity_categories?.name}
                      {record.points_awarded != null && ` · +${record.points_awarded} pts`}
                    </p>
                    {record.review_reason && (
                      <p className="mt-1 text-xs text-destructive">Motivo: {record.review_reason}</p>
                    )}
                  </div>
                  {editable && (
                    <div className="flex shrink-0 gap-1">
                      <Button size="sm" variant="outline" onClick={() => activity && setEditing(activity)}>
                        Editar
                      </Button>
                      {record.status === 'rascunho' && (
                        <Button size="icon" variant="ghost" onClick={() => handleDeleteDraft(record.id)}>
                          <Trash2 className="size-4 text-destructive" />
                        </Button>
                      )}
                    </div>
                  )}
                </CardContent>
              </Card>
            )
          })}
        </div>
      </div>

      {edition && (
        <RecordFormDialog
          activity={editing}
          editionId={edition.id}
          open={!!editing}
          onOpenChange={(o) => !o && setEditing(null)}
        />
      )}
    </AppShell>
  )
}
