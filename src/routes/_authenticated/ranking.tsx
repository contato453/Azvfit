import { createFileRoute } from '@tanstack/react-router'
import { useQuery } from '@tanstack/react-query'
import { Trophy, Medal } from 'lucide-react'
import { AppShell } from '#/components/layout/AppShell'
import { Card, CardContent } from '#/components/ui/card'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '#/components/ui/table'
import { supabase } from '#/integrations/supabase/client'
import { useAuth } from '#/lib/auth'
import { useCurrentEdition } from '#/lib/programa'
import { cn } from '#/lib/utils'

export const Route = createFileRoute('/_authenticated/ranking')({
  ssr: false,
  head: () => ({ meta: [{ title: 'Ranking — AZVFIT' }] }),
  component: RankingPage,
})

const MEDAL_COLOR = ['text-accent', 'text-muted-foreground', 'text-warning-foreground']

function RankingPage() {
  const { user } = useAuth()
  const { data: edition } = useCurrentEdition()

  const { data: publication } = useQuery({
    queryKey: ['ranking-publication', edition?.id],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('ranking_publications')
        .select('*')
        .eq('edition_id', edition!.id)
        .eq('status', 'publicado')
        .order('published_at', { ascending: false })
        .limit(1)
        .maybeSingle()
      if (error) throw error
      return data
    },
    enabled: !!edition?.id,
  })

  const { data: entries } = useQuery({
    queryKey: ['ranking-entries', publication?.id],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('ranking_entries')
        .select('*')
        .eq('publication_id', publication!.id)
        .order('position')
      if (error) throw error
      return data
    },
    enabled: !!publication?.id,
  })

  return (
    <AppShell>
      <div className="grid gap-4">
        <div>
          <h1 className="flex items-center gap-2 text-lg font-bold">
            <Trophy className="size-5 text-accent" /> Ranking
          </h1>
          {publication && <p className="text-sm text-muted-foreground">{publication.title}</p>}
        </div>

        {!publication && (
          <Card>
            <CardContent className="p-6 text-center text-sm text-muted-foreground">
              O ranking ainda não foi publicado pela comissão organizadora.
            </CardContent>
          </Card>
        )}

        {publication && (
          <Card>
            <CardContent className="p-0">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead className="w-12">#</TableHead>
                    <TableHead>Participante</TableHead>
                    <TableHead className="text-right">Pontos</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {entries?.map((entry) => (
                    <TableRow key={entry.id} className={cn(entry.user_id === user?.id && 'bg-accent/10')}>
                      <TableCell>
                        {entry.position <= 3 ? (
                          <Medal className={cn('size-4', MEDAL_COLOR[entry.position - 1])} />
                        ) : (
                          entry.position
                        )}
                      </TableCell>
                      <TableCell className="font-medium">{entry.participant_name}</TableCell>
                      <TableCell className="text-right font-semibold">{entry.total_points}</TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        )}
      </div>
    </AppShell>
  )
}
