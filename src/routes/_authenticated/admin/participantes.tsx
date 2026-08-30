import { createFileRoute } from '@tanstack/react-router'
import { useQuery, useQueryClient } from '@tanstack/react-query'
import { useState } from 'react'
import { toast } from 'sonner'
import { Search, Ban, PlusCircle, MinusCircle } from 'lucide-react'
import { AppShell } from '#/components/layout/AppShell'
import { Card, CardContent } from '#/components/ui/card'
import { Badge } from '#/components/ui/badge'
import { Button } from '#/components/ui/button'
import { Input } from '#/components/ui/input'
import { Textarea } from '#/components/ui/textarea'
import { Label } from '#/components/ui/label'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '#/components/ui/table'
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '#/components/ui/dialog'
import { supabase } from '#/integrations/supabase/client'
import { useCurrentEdition } from '#/lib/programa'

export const Route = createFileRoute('/_authenticated/admin/participantes')({
  ssr: false,
  head: () => ({ meta: [{ title: 'Participantes — AZVFIT' }] }),
  component: ParticipantesPage,
})

function ParticipantesPage() {
  const { data: edition } = useCurrentEdition()
  const queryClient = useQueryClient()
  const [search, setSearch] = useState('')
  const [adjusting, setAdjusting] = useState<{ userId: string; name: string } | null>(null)
  const [disqualifying, setDisqualifying] = useState<{ userId: string; name: string } | null>(null)
  const [points, setPoints] = useState('')
  const [reason, setReason] = useState('')

  const { data: participants, isLoading } = useQuery({
    queryKey: ['participants', edition?.id],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('edition_participants')
        .select('*, profiles(full_name, email, department)')
        .eq('edition_id', edition!.id)
        .order('total_points', { ascending: false })
      if (error) throw error
      return data
    },
    enabled: !!edition?.id,
  })

  const filtered = participants?.filter((p: any) =>
    (p.profiles?.full_name ?? '').toLowerCase().includes(search.toLowerCase()),
  )

  async function handleAdjust() {
    if (!adjusting || !edition || !points || !reason) return
    const { error } = await supabase.rpc('apply_manual_adjustment', {
      _edition_id: edition.id,
      _user_id: adjusting.userId,
      _points: Number(points),
      _reason: reason,
    })
    if (error) {
      toast.error('Ajuste não realizado', { description: error.message })
      return
    }
    toast.success('Ajuste aplicado.')
    setAdjusting(null)
    setPoints('')
    setReason('')
    await queryClient.invalidateQueries({ queryKey: ['participants'] })
  }

  async function handleDisqualify() {
    if (!disqualifying || !edition || !reason) return
    const { error } = await supabase.rpc('register_conduct_incident', {
      _edition_id: edition.id,
      _user_id: disqualifying.userId,
      // _record_id é uuid nullable no banco (desclassificação não está presa a um registro),
      // mas o gerador de tipos do Supabase marca args sem "default" como obrigatórios.
      _record_id: null as unknown as string,
      _incident_type: 'informacoes_inconsistentes',
      _measure: 'desclassificacao',
      _reason: reason,
    })
    if (error) {
      toast.error('Não foi possível desclassificar', { description: error.message })
      return
    }
    toast.success('Participante desclassificado.')
    setDisqualifying(null)
    setReason('')
    await queryClient.invalidateQueries({ queryKey: ['participants'] })
  }

  return (
    <AppShell admin>
      <div className="grid gap-4">
        <div className="flex items-center justify-between gap-2">
          <h1 className="text-lg font-bold">Participantes</h1>
          <div className="relative w-56">
            <Search className="absolute left-2.5 top-2.5 size-4 text-muted-foreground" />
            <Input placeholder="Buscar por nome" className="pl-8" value={search} onChange={(e) => setSearch(e.target.value)} />
          </div>
        </div>

        <Card>
          <CardContent className="p-0">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Nome</TableHead>
                  <TableHead>Departamento</TableHead>
                  <TableHead className="text-right">Pontos</TableHead>
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
                {filtered?.map((p: any) => (
                  <TableRow key={p.id}>
                    <TableCell className="font-medium">{p.profiles?.full_name}</TableCell>
                    <TableCell className="text-muted-foreground">{p.profiles?.department ?? '—'}</TableCell>
                    <TableCell className="text-right font-semibold">{p.total_points}</TableCell>
                    <TableCell>
                      {p.is_disqualified ? (
                        <Badge variant="destructive">Desclassificado</Badge>
                      ) : (
                        <Badge variant="success">Ativo</Badge>
                      )}
                    </TableCell>
                    <TableCell className="flex justify-end gap-1">
                      <Button
                        size="icon"
                        variant="ghost"
                        title="Ajustar pontuação"
                        onClick={() => setAdjusting({ userId: p.user_id, name: p.profiles?.full_name })}
                      >
                        <PlusCircle className="size-4" />
                      </Button>
                      {!p.is_disqualified && (
                        <Button
                          size="icon"
                          variant="ghost"
                          title="Desclassificar"
                          onClick={() => setDisqualifying({ userId: p.user_id, name: p.profiles?.full_name })}
                        >
                          <Ban className="size-4 text-destructive" />
                        </Button>
                      )}
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </CardContent>
        </Card>
      </div>

      <Dialog open={!!adjusting} onOpenChange={(o) => !o && setAdjusting(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Ajustar pontuação — {adjusting?.name}</DialogTitle>
          </DialogHeader>
          <div className="grid gap-3">
            <div className="grid gap-1.5">
              <Label className="flex items-center gap-1">
                <MinusCircle className="size-3.5" /> Pontos (use negativo para débito)
              </Label>
              <Input type="number" value={points} onChange={(e) => setPoints(e.target.value)} />
            </div>
            <div className="grid gap-1.5">
              <Label>Justificativa</Label>
              <Textarea value={reason} onChange={(e) => setReason(e.target.value)} rows={3} />
            </div>
          </div>
          <DialogFooter>
            <Button onClick={handleAdjust} disabled={!points || !reason}>
              Aplicar ajuste
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={!!disqualifying} onOpenChange={(o) => !o && setDisqualifying(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Desclassificar — {disqualifying?.name}</DialogTitle>
          </DialogHeader>
          <div className="grid gap-1.5">
            <Label>Justificativa (obrigatória, ação só de administrador)</Label>
            <Textarea value={reason} onChange={(e) => setReason(e.target.value)} rows={3} />
          </div>
          <DialogFooter>
            <Button variant="destructive" onClick={handleDisqualify} disabled={!reason}>
              Confirmar desclassificação
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </AppShell>
  )
}
