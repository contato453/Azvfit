import { createFileRoute } from '@tanstack/react-router'
import { useQuery, useQueryClient } from '@tanstack/react-query'
import { useState } from 'react'
import { toast } from 'sonner'
import { CheckCircle2, XCircle, RotateCcw, Ban, Pencil, ExternalLink } from 'lucide-react'
import { AppShell } from '#/components/layout/AppShell'
import { Card, CardContent } from '#/components/ui/card'
import { Badge, type BadgeProps } from '#/components/ui/badge'
import { Button } from '#/components/ui/button'
import { Tabs, TabsList, TabsTrigger, TabsContent } from '#/components/ui/tabs'
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from '#/components/ui/dialog'
import { Textarea } from '#/components/ui/textarea'
import { Input } from '#/components/ui/input'
import { Label } from '#/components/ui/label'
import { supabase } from '#/integrations/supabase/client'
import { useCurrentEdition, STATUS_LABEL, STATUS_TONE, formatDateBR, type RecordStatus } from '#/lib/programa'

export const Route = createFileRoute('/_authenticated/admin/validacao')({
  ssr: false,
  head: () => ({ meta: [{ title: 'Validação — AZVFIT' }] }),
  component: ValidacaoPage,
})

type QueueKind = 'atividades' | 'missoes' | 'totalpass'

function ValidacaoPage() {
  const { data: edition } = useCurrentEdition()
  const [tab, setTab] = useState<QueueKind>('atividades')

  return (
    <AppShell admin>
      <div className="grid gap-4">
        <h1 className="text-lg font-bold">Central de validação</h1>
        <Tabs value={tab} onValueChange={(v) => setTab(v as QueueKind)}>
          <TabsList>
            <TabsTrigger value="atividades">Atividades</TabsTrigger>
            <TabsTrigger value="missoes">Missões</TabsTrigger>
            <TabsTrigger value="totalpass">TotalPass</TabsTrigger>
          </TabsList>
          <TabsContent value="atividades">{edition && <ActivityQueue editionId={edition.id} />}</TabsContent>
          <TabsContent value="missoes">{edition && <MissionQueue editionId={edition.id} />}</TabsContent>
          <TabsContent value="totalpass">{edition && <TotalPassQueue editionId={edition.id} />}</TabsContent>
        </Tabs>
      </div>
    </AppShell>
  )
}

function ActivityQueue({ editionId }: { editionId: string }) {
  const queryClient = useQueryClient()
  const [reviewing, setReviewing] = useState<{ id: string; action: string } | null>(null)
  const [reason, setReason] = useState('')
  const [points, setPoints] = useState('')

  const { data: records, isLoading } = useQuery({
    queryKey: ['validation-queue', 'activities', editionId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('activity_records')
        .select('*, activities(*, activity_categories(*)), profiles(full_name), evidences(*)')
        .eq('edition_id', editionId)
        .in('status', ['enviado', 'em_analise'])
        .order('submitted_at', { ascending: true })
      if (error) throw error
      return data
    },
  })

  async function runAction(id: string, action: string, extra?: { reason?: string; points?: number }) {
    const { error } = await supabase.rpc('review_activity_record', {
      _record_id: id,
      _action: action,
      _reason: extra?.reason ?? undefined,
      _points: extra?.points ?? undefined,
    })
    if (error) {
      toast.error('Ação não realizada', { description: error.message })
      return
    }
    toast.success('Registro atualizado.')
    setReviewing(null)
    setReason('')
    setPoints('')
    await queryClient.invalidateQueries({ queryKey: ['validation-queue'] })
  }

  if (isLoading) return <p className="pt-4 text-sm text-muted-foreground">Carregando…</p>
  if (!records?.length) return <p className="pt-4 text-sm text-muted-foreground">Fila vazia. Tudo em dia!</p>

  return (
    <div className="grid gap-3 pt-4">
      {records.map((r: any) => (
        <Card key={r.id}>
          <CardContent className="grid gap-2 p-4">
            <div className="flex flex-wrap items-center justify-between gap-2">
              <div>
                <p className="font-medium">
                  {r.profiles?.full_name} — {r.activities?.name}
                </p>
                <p className="text-xs text-muted-foreground">
                  {formatDateBR(r.activity_date)} · {r.activities?.activity_categories?.name}
                </p>
              </div>
              <Badge variant={STATUS_TONE[r.status as RecordStatus] as BadgeProps['variant']}>
                {STATUS_LABEL[r.status as RecordStatus]}
              </Badge>
            </div>
            {r.notes && <p className="text-sm text-muted-foreground">"{r.notes}"</p>}
            {r.evidences?.map((ev: any) => (
              <EvidenceLink key={ev.id} url={ev.drive_view_url} name={ev.file_name} />
            ))}
            <div className="flex flex-wrap gap-2 pt-1">
              <Button size="sm" onClick={() => runAction(r.id, 'aprovar')} className="gap-1">
                <CheckCircle2 className="size-4" /> Aprovar
              </Button>
              <Button size="sm" variant="outline" onClick={() => setReviewing({ id: r.id, action: 'ajustar_pontos' })} className="gap-1">
                <Pencil className="size-4" /> Ajustar
              </Button>
              <Button size="sm" variant="outline" onClick={() => setReviewing({ id: r.id, action: 'solicitar_correcao' })} className="gap-1">
                <RotateCcw className="size-4" /> Correção
              </Button>
              <Button size="sm" variant="destructive" onClick={() => setReviewing({ id: r.id, action: 'recusar' })} className="gap-1">
                <XCircle className="size-4" /> Recusar
              </Button>
              <Button size="sm" variant="ghost" onClick={() => setReviewing({ id: r.id, action: 'desconsiderar' })} className="gap-1 text-destructive">
                <Ban className="size-4" /> Desconsiderar
              </Button>
            </div>
          </CardContent>
        </Card>
      ))}

      <Dialog open={!!reviewing} onOpenChange={(o) => !o && setReviewing(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Justificativa obrigatória</DialogTitle>
          </DialogHeader>
          <div className="grid gap-3">
            {reviewing?.action === 'ajustar_pontos' && (
              <div className="grid gap-1.5">
                <Label>Nova pontuação</Label>
                <Input type="number" value={points} onChange={(e) => setPoints(e.target.value)} />
              </div>
            )}
            <div className="grid gap-1.5">
              <Label>Motivo</Label>
              <Textarea value={reason} onChange={(e) => setReason(e.target.value)} rows={3} />
            </div>
          </div>
          <DialogFooter>
            <Button
              onClick={() =>
                reviewing &&
                runAction(reviewing.id, reviewing.action, { reason, points: points ? Number(points) : undefined })
              }
            >
              Confirmar
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}

function MissionQueue({ editionId }: { editionId: string }) {
  const queryClient = useQueryClient()
  const [reviewing, setReviewing] = useState<{ id: string; action: string } | null>(null)
  const [reason, setReason] = useState('')

  const { data: participations, isLoading } = useQuery({
    queryKey: ['validation-queue', 'missions', editionId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('mission_participations')
        .select('*, missions!inner(title, edition_id), profiles(full_name), evidences(*)')
        .eq('missions.edition_id', editionId)
        .in('status', ['enviado', 'em_analise'])
      if (error) throw error
      return data
    },
  })

  async function runAction(id: string, action: string) {
    const { error } = await supabase.rpc('review_mission_participation', {
      _participation_id: id,
      _action: action,
      _reason: reason || undefined,
    })
    if (error) {
      toast.error('Ação não realizada', { description: error.message })
      return
    }
    toast.success('Participação atualizada.')
    setReviewing(null)
    setReason('')
    await queryClient.invalidateQueries({ queryKey: ['validation-queue'] })
  }

  if (isLoading) return <p className="pt-4 text-sm text-muted-foreground">Carregando…</p>
  if (!participations?.length) return <p className="pt-4 text-sm text-muted-foreground">Fila vazia.</p>

  return (
    <div className="grid gap-3 pt-4">
      {participations.map((p: any) => (
        <Card key={p.id}>
          <CardContent className="grid gap-2 p-4">
            <p className="font-medium">
              {p.profiles?.full_name} — {p.missions?.title}
            </p>
            {p.notes && <p className="text-sm text-muted-foreground">"{p.notes}"</p>}
            {p.evidences?.map((ev: any) => (
              <EvidenceLink key={ev.id} url={ev.drive_view_url} name={ev.file_name} />
            ))}
            <div className="flex gap-2 pt-1">
              <Button size="sm" onClick={() => runAction(p.id, 'aprovar')}>
                Aprovar
              </Button>
              <Button size="sm" variant="destructive" onClick={() => setReviewing({ id: p.id, action: 'recusar' })}>
                Recusar
              </Button>
            </div>
          </CardContent>
        </Card>
      ))}

      <Dialog open={!!reviewing} onOpenChange={(o) => !o && setReviewing(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Motivo da recusa</DialogTitle>
          </DialogHeader>
          <Textarea value={reason} onChange={(e) => setReason(e.target.value)} rows={3} />
          <DialogFooter>
            <Button onClick={() => reviewing && runAction(reviewing.id, reviewing.action)}>Confirmar</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}

function TotalPassQueue({ editionId }: { editionId: string }) {
  const queryClient = useQueryClient()
  const [reviewing, setReviewing] = useState<string | null>(null)
  const [reason, setReason] = useState('')

  const { data: checkins, isLoading } = useQuery({
    queryKey: ['validation-queue', 'totalpass', editionId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('totalpass_checkins')
        .select('*, profiles(full_name), evidences(*)')
        .eq('edition_id', editionId)
        .in('status', ['enviado', 'em_analise'])
      if (error) throw error
      return data
    },
  })

  async function runAction(id: string, action: string) {
    const { error } = await supabase.rpc('review_totalpass_checkin', {
      _checkin_id: id,
      _action: action,
      _reason: reason || undefined,
    })
    if (error) {
      toast.error('Ação não realizada', { description: error.message })
      return
    }
    toast.success('Check-in atualizado.')
    setReviewing(null)
    setReason('')
    await queryClient.invalidateQueries({ queryKey: ['validation-queue'] })
  }

  if (isLoading) return <p className="pt-4 text-sm text-muted-foreground">Carregando…</p>
  if (!checkins?.length) return <p className="pt-4 text-sm text-muted-foreground">Fila vazia.</p>

  return (
    <div className="grid gap-3 pt-4">
      {checkins.map((c: any) => (
        <Card key={c.id}>
          <CardContent className="grid gap-2 p-4">
            <p className="font-medium">
              {c.profiles?.full_name} — {c.gym_name ?? 'Academia'}
            </p>
            <p className="text-xs text-muted-foreground">{formatDateBR(c.checkin_date)}</p>
            {c.evidences?.map((ev: any) => (
              <EvidenceLink key={ev.id} url={ev.drive_view_url} name={ev.file_name} />
            ))}
            <div className="flex gap-2 pt-1">
              <Button size="sm" onClick={() => runAction(c.id, 'aprovar')}>
                Aprovar
              </Button>
              <Button size="sm" variant="destructive" onClick={() => setReviewing(c.id)}>
                Recusar
              </Button>
            </div>
          </CardContent>
        </Card>
      ))}

      <Dialog open={!!reviewing} onOpenChange={(o) => !o && setReviewing(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Motivo da recusa</DialogTitle>
          </DialogHeader>
          <Textarea value={reason} onChange={(e) => setReason(e.target.value)} rows={3} />
          <DialogFooter>
            <Button onClick={() => reviewing && runAction(reviewing, 'recusar')}>Confirmar</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}

function EvidenceLink({ url, name }: { url: string | null; name: string }) {
  return (
    <Button
      variant="link"
      size="sm"
      className="h-auto justify-start p-0 text-xs"
      disabled={!url}
      onClick={() => url && window.open(url, '_blank', 'noopener,noreferrer')}
    >
      <ExternalLink className="mr-1 size-3" /> {name} (Drive)
    </Button>
  )
}
