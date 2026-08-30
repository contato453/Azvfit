import { createFileRoute } from '@tanstack/react-router'
import { useQuery, useQueryClient } from '@tanstack/react-query'
import { useState } from 'react'
import { toast } from 'sonner'
import { Trophy, Send, Ban } from 'lucide-react'
import { AppShell } from '#/components/layout/AppShell'
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '#/components/ui/card'
import { Badge } from '#/components/ui/badge'
import { Button } from '#/components/ui/button'
import { Input } from '#/components/ui/input'
import { Textarea } from '#/components/ui/textarea'
import { Label } from '#/components/ui/label'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '#/components/ui/table'
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '#/components/ui/dialog'
import { supabase } from '#/integrations/supabase/client'
import { useAuth } from '#/lib/auth'
import { useCurrentEdition, formatDateBR } from '#/lib/programa'

export const Route = createFileRoute('/_authenticated/admin/ranking')({
  ssr: false,
  head: () => ({ meta: [{ title: 'Ranking — Admin AZVFIT' }] }),
  component: AdminRankingPage,
})

function AdminRankingPage() {
  const { isAdmin } = useAuth()
  const { data: edition } = useCurrentEdition()
  const queryClient = useQueryClient()
  const [publishing, setPublishing] = useState(false)
  const [title, setTitle] = useState('')
  const [canceling, setCanceling] = useState<string | null>(null)
  const [cancelReason, setCancelReason] = useState('')

  const { data: provisional, isLoading } = useQuery({
    queryKey: ['provisional-ranking', edition?.id],
    queryFn: async () => {
      const { data, error } = await supabase.rpc('compute_ranking', { _edition_id: edition!.id })
      if (error) throw error
      return data
    },
    enabled: !!edition?.id,
  })

  const { data: publications } = useQuery({
    queryKey: ['ranking-publications-admin', edition?.id],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('ranking_publications')
        .select('*')
        .eq('edition_id', edition!.id)
        .order('published_at', { ascending: false })
      if (error) throw error
      return data
    },
    enabled: !!edition?.id,
  })

  async function handlePublish() {
    if (!edition || !title) return
    const { error } = await supabase.rpc('publish_ranking', { _edition_id: edition.id, _title: title })
    if (error) {
      toast.error('Não foi possível publicar', { description: error.message })
      return
    }
    toast.success('Ranking publicado!')
    setPublishing(false)
    setTitle('')
    await queryClient.invalidateQueries({ queryKey: ['ranking-publications-admin'] })
  }

  async function handleCancel() {
    if (!canceling || !cancelReason) return
    const { error } = await supabase.rpc('cancel_ranking_publication', {
      _publication_id: canceling,
      _reason: cancelReason,
    })
    if (error) {
      toast.error('Não foi possível cancelar', { description: error.message })
      return
    }
    toast.success('Publicação cancelada.')
    setCanceling(null)
    setCancelReason('')
    await queryClient.invalidateQueries({ queryKey: ['ranking-publications-admin'] })
  }

  return (
    <AppShell admin>
      <div className="grid gap-4">
        <div className="flex items-center justify-between">
          <h1 className="flex items-center gap-2 text-lg font-bold">
            <Trophy className="size-5 text-accent" /> Ranking
          </h1>
          <Button onClick={() => setPublishing(true)} className="gap-1.5">
            <Send className="size-4" /> Publicar snapshot
          </Button>
        </div>

        <Card>
          <CardHeader>
            <CardTitle className="text-base">Provisório (tempo real)</CardTitle>
            <CardDescription>Critérios: pontos → atividades → frequência semanal → TotalPass → missões → Day Fit.</CardDescription>
          </CardHeader>
          <CardContent className="p-0">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead className="w-12">#</TableHead>
                  <TableHead>Nome</TableHead>
                  <TableHead className="text-right">Pontos</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {isLoading && (
                  <TableRow>
                    <TableCell colSpan={3}>Calculando…</TableCell>
                  </TableRow>
                )}
                {provisional?.slice(0, 30).map((row: any) => (
                  <TableRow key={row.user_id}>
                    <TableCell>{row.position}</TableCell>
                    <TableCell className="font-medium">{row.participant_name}</TableCell>
                    <TableCell className="text-right font-semibold">{row.total_points}</TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="text-base">Publicações</CardTitle>
          </CardHeader>
          <CardContent className="grid gap-2">
            {publications?.map((p) => (
              <div key={p.id} className="flex items-center justify-between rounded-md border border-border p-3 text-sm">
                <div>
                  <p className="font-medium">{p.title}</p>
                  <p className="text-xs text-muted-foreground">{formatDateBR(p.published_at?.slice(0, 10))}</p>
                </div>
                <div className="flex items-center gap-2">
                  <Badge variant={p.status === 'publicado' ? 'success' : 'destructive'}>
                    {p.status === 'publicado' ? 'Publicado' : 'Cancelado'}
                  </Badge>
                  {p.status === 'publicado' && isAdmin && (
                    <Button size="icon" variant="ghost" onClick={() => setCanceling(p.id)}>
                      <Ban className="size-4 text-destructive" />
                    </Button>
                  )}
                </div>
              </div>
            ))}
          </CardContent>
        </Card>
      </div>

      <Dialog open={publishing} onOpenChange={setPublishing}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Publicar snapshot do ranking</DialogTitle>
          </DialogHeader>
          <div className="grid gap-1.5">
            <Label>Título</Label>
            <Input value={title} onChange={(e) => setTitle(e.target.value)} placeholder="Ex.: Ranking — Semana 12" />
          </div>
          <DialogFooter>
            <Button onClick={handlePublish} disabled={!title}>
              Publicar
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={!!canceling} onOpenChange={(o) => !o && setCanceling(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Cancelar publicação (só admin)</DialogTitle>
          </DialogHeader>
          <div className="grid gap-1.5">
            <Label>Motivo</Label>
            <Textarea value={cancelReason} onChange={(e) => setCancelReason(e.target.value)} rows={3} />
          </div>
          <DialogFooter>
            <Button variant="destructive" onClick={handleCancel} disabled={!cancelReason}>
              Confirmar cancelamento
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </AppShell>
  )
}
