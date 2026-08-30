import { createFileRoute } from '@tanstack/react-router'
import { useQuery } from '@tanstack/react-query'
import { useState } from 'react'
import { Target } from 'lucide-react'
import { AppShell } from '#/components/layout/AppShell'
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '#/components/ui/card'
import { Badge } from '#/components/ui/badge'
import { Button } from '#/components/ui/button'
import { Skeleton } from '#/components/ui/skeleton'
import { MissionParticipationDialog } from '#/components/missions/MissionParticipationDialog'
import { supabase } from '#/integrations/supabase/client'
import { useAuth } from '#/lib/auth'
import { useCurrentEdition, STATUS_LABEL, STATUS_TONE } from '#/lib/programa'
import type { Database } from '#/integrations/supabase/types'

export const Route = createFileRoute('/_authenticated/missoes')({
  ssr: false,
  head: () => ({ meta: [{ title: 'Missões — AZVFIT' }] }),
  component: MissoesPage,
})

type Mission = Database['public']['Tables']['missions']['Row']

const TYPE_LABEL: Record<string, string> = { extra: 'Extra', semanal: 'Semanal', surpresa: 'Surpresa' }

function MissoesPage() {
  const { user } = useAuth()
  const { data: edition } = useCurrentEdition()
  const [selected, setSelected] = useState<Mission | null>(null)

  const { data: missions, isLoading } = useQuery({
    queryKey: ['missions', edition?.id],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('missions')
        .select('*')
        .eq('edition_id', edition!.id)
        .eq('is_published', true)
        .order('ends_at_ts', { ascending: true, nullsFirst: false })
      if (error) throw error
      return data
    },
    enabled: !!edition?.id,
  })

  const { data: myParticipations } = useQuery({
    queryKey: ['my-mission-participations', edition?.id, user?.id],
    queryFn: async () => {
      const { data, error } = await supabase.from('mission_participations').select('*').eq('user_id', user!.id)
      if (error) throw error
      return data
    },
    enabled: !!user,
  })

  function participationFor(missionId: string) {
    return myParticipations?.find((p) => p.mission_id === missionId)
  }

  return (
    <AppShell>
      <div className="grid gap-4">
        <div>
          <h1 className="text-lg font-bold">Missões</h1>
          <p className="text-sm text-muted-foreground">Desafios extras que valem de 3 a 10 pontos.</p>
        </div>

        {isLoading && <Skeleton className="h-24 w-full" />}
        {!isLoading && !missions?.length && (
          <p className="text-sm text-muted-foreground">Nenhuma missão disponível no momento.</p>
        )}

        <div className="grid gap-3 sm:grid-cols-2">
          {missions?.map((mission) => {
            const participation = participationFor(mission.id)
            return (
              <Card key={mission.id}>
                <CardHeader>
                  <div className="flex items-center justify-between gap-2">
                    <CardTitle className="flex items-center gap-2 text-base">
                      <Target className="size-4 text-accent" /> {mission.title}
                    </CardTitle>
                    <Badge variant="accent">+{mission.points} pts</Badge>
                  </div>
                  <CardDescription>{mission.description}</CardDescription>
                </CardHeader>
                <CardContent className="flex items-center justify-between">
                  <Badge variant="muted">{TYPE_LABEL[mission.mission_type]}</Badge>
                  {participation ? (
                    <Badge variant={STATUS_TONE[participation.status]}>{STATUS_LABEL[participation.status]}</Badge>
                  ) : (
                    <Button size="sm" onClick={() => setSelected(mission)}>
                      Participar
                    </Button>
                  )}
                </CardContent>
              </Card>
            )
          })}
        </div>
      </div>

      {edition && (
        <MissionParticipationDialog
          mission={selected}
          editionId={edition.id}
          open={!!selected}
          onOpenChange={(o) => !o && setSelected(null)}
        />
      )}
    </AppShell>
  )
}
