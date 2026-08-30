import { createFileRoute } from '@tanstack/react-router'
import { useQuery, useQueryClient } from '@tanstack/react-query'
import { useEffect, useRef, useState } from 'react'
import { toast } from 'sonner'
import QRCode from 'qrcode'
import { Plus, QrCode, Megaphone, Send } from 'lucide-react'
import { AppShell } from '#/components/layout/AppShell'
import { Card, CardContent, CardHeader, CardTitle } from '#/components/ui/card'
import { Badge } from '#/components/ui/badge'
import { Button } from '#/components/ui/button'
import { Input } from '#/components/ui/input'
import { Textarea } from '#/components/ui/textarea'
import { Label } from '#/components/ui/label'
import { Switch } from '#/components/ui/switch'
import { Tabs, TabsList, TabsTrigger, TabsContent } from '#/components/ui/tabs'
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '#/components/ui/dialog'
import { supabase } from '#/integrations/supabase/client'
import { useCurrentEdition, formatDateBR } from '#/lib/programa'

export const Route = createFileRoute('/_authenticated/admin/eventos')({
  ssr: false,
  head: () => ({ meta: [{ title: 'Eventos — Admin AZVFIT' }] }),
  component: AdminEventosPage,
})

function AdminEventosPage() {
  const { data: edition } = useCurrentEdition()
  return (
    <AppShell admin>
      <div className="grid gap-4">
        <h1 className="text-lg font-bold">Eventos e comunicados</h1>
        <Tabs defaultValue="eventos">
          <TabsList>
            <TabsTrigger value="eventos">Eventos e estações</TabsTrigger>
            <TabsTrigger value="comunicados">Comunicados</TabsTrigger>
          </TabsList>
          <TabsContent value="eventos">{edition && <EventsSection editionId={edition.id} />}</TabsContent>
          <TabsContent value="comunicados">{edition && <AnnouncementsSection editionId={edition.id} />}</TabsContent>
        </Tabs>
      </div>
    </AppShell>
  )
}

function EventsSection({ editionId }: { editionId: string }) {
  const queryClient = useQueryClient()
  const [creatingEvent, setCreatingEvent] = useState(false)
  const [eventForm, setEventForm] = useState({ name: '', event_type: 'day_fit', event_date: '', location: '' })
  const [stationEventId, setStationEventId] = useState<string | null>(null)
  const [stationForm, setStationForm] = useState({ name: '', points: 1, station_code: '' })
  const [qrStation, setQrStation] = useState<{ code: string; token: string; name: string } | null>(null)

  const { data: events, isLoading } = useQuery({
    queryKey: ['admin-events', editionId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('events')
        .select('*, event_stations(*)')
        .eq('edition_id', editionId)
        .order('event_date')
      if (error) throw error
      return data
    },
  })

  async function createEvent() {
    const { error } = await supabase.from('events').insert({
      edition_id: editionId,
      name: eventForm.name,
      event_type: eventForm.event_type,
      event_date: eventForm.event_date || null,
      location: eventForm.location || null,
    })
    if (error) {
      toast.error('Não foi possível criar o evento', { description: error.message })
      return
    }
    toast.success('Evento criado.')
    setCreatingEvent(false)
    setEventForm({ name: '', event_type: 'day_fit', event_date: '', location: '' })
    await queryClient.invalidateQueries({ queryKey: ['admin-events'] })
  }

  async function togglePublish(id: string, is_published: boolean) {
    const { error } = await supabase.from('events').update({ is_published: !is_published }).eq('id', id)
    if (error) toast.error(error.message)
    await queryClient.invalidateQueries({ queryKey: ['admin-events'] })
  }

  async function createStation() {
    if (!stationEventId) return
    const code = stationForm.station_code || Math.random().toString(36).slice(2, 8).toUpperCase()
    const { error } = await supabase.from('event_stations').insert({
      event_id: stationEventId,
      name: stationForm.name,
      points: stationForm.points,
      station_code: code,
    })
    if (error) {
      toast.error('Não foi possível criar a estação', { description: error.message })
      return
    }
    toast.success('Estação criada.')
    setStationEventId(null)
    setStationForm({ name: '', points: 1, station_code: '' })
    await queryClient.invalidateQueries({ queryKey: ['admin-events'] })
  }

  return (
    <div className="grid gap-3 pt-4">
      <Button onClick={() => setCreatingEvent(true)} className="w-fit gap-1.5">
        <Plus className="size-4" /> Novo evento
      </Button>

      {isLoading && <p className="text-sm text-muted-foreground">Carregando…</p>}

      {events?.map((event) => (
        <Card key={event.id}>
          <CardHeader className="flex-row items-center justify-between">
            <div>
              <CardTitle className="text-base">{event.name}</CardTitle>
              <p className="text-xs text-muted-foreground">
                {formatDateBR(event.event_date)} · {event.location}
              </p>
            </div>
            <div className="flex items-center gap-2">
              <Badge variant={event.is_published ? 'success' : 'muted'}>
                {event.is_published ? 'Publicado' : 'Rascunho'}
              </Badge>
              <Switch checked={event.is_published} onCheckedChange={() => togglePublish(event.id, event.is_published)} />
            </div>
          </CardHeader>
          <CardContent className="grid gap-2">
            <div className="flex items-center justify-between">
              <span className="text-sm font-medium">Estações do Passaporte</span>
              <Button size="sm" variant="outline" onClick={() => setStationEventId(event.id)} className="gap-1">
                <Plus className="size-3.5" /> Estação
              </Button>
            </div>
            <div className="grid grid-cols-2 gap-2 sm:grid-cols-3">
              {(event as any).event_stations?.map((s: any) => (
                <button
                  key={s.id}
                  className="flex items-center justify-between gap-2 rounded-md border border-border p-2 text-left text-xs hover:bg-muted"
                  onClick={() => setQrStation({ code: s.station_code, token: s.qr_token, name: s.name })}
                >
                  <span>
                    {s.name} <span className="text-muted-foreground">({s.points} pt)</span>
                  </span>
                  <QrCode className="size-4 shrink-0 text-primary" />
                </button>
              ))}
            </div>
          </CardContent>
        </Card>
      ))}

      <Dialog open={creatingEvent} onOpenChange={setCreatingEvent}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Novo evento</DialogTitle>
          </DialogHeader>
          <div className="grid gap-3">
            <div className="grid gap-1.5">
              <Label>Nome</Label>
              <Input value={eventForm.name} onChange={(e) => setEventForm({ ...eventForm, name: e.target.value })} />
            </div>
            <div className="grid gap-1.5">
              <Label>Data</Label>
              <Input
                type="date"
                value={eventForm.event_date}
                onChange={(e) => setEventForm({ ...eventForm, event_date: e.target.value })}
              />
            </div>
            <div className="grid gap-1.5">
              <Label>Local</Label>
              <Input value={eventForm.location} onChange={(e) => setEventForm({ ...eventForm, location: e.target.value })} />
            </div>
          </div>
          <DialogFooter>
            <Button onClick={createEvent} disabled={!eventForm.name}>
              Criar
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={!!stationEventId} onOpenChange={(o) => !o && setStationEventId(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Nova estação</DialogTitle>
          </DialogHeader>
          <div className="grid gap-3">
            <div className="grid gap-1.5">
              <Label>Nome (ex.: Abertura, Movimento, Hidratação…)</Label>
              <Input value={stationForm.name} onChange={(e) => setStationForm({ ...stationForm, name: e.target.value })} />
            </div>
            <div className="grid gap-1.5">
              <Label>Pontos</Label>
              <Input
                type="number"
                value={stationForm.points}
                onChange={(e) => setStationForm({ ...stationForm, points: Number(e.target.value) })}
              />
            </div>
            <div className="grid gap-1.5">
              <Label>Código (opcional — gerado automaticamente se vazio)</Label>
              <Input
                value={stationForm.station_code}
                onChange={(e) => setStationForm({ ...stationForm, station_code: e.target.value.toUpperCase() })}
              />
            </div>
          </div>
          <DialogFooter>
            <Button onClick={createStation} disabled={!stationForm.name}>
              Criar estação
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <QrDialog station={qrStation} onOpenChange={(o) => !o && setQrStation(null)} />
    </div>
  )
}

function QrDialog({
  station,
  onOpenChange,
}: {
  station: { code: string; token: string; name: string } | null
  onOpenChange: (o: boolean) => void
}) {
  const canvasRef = useRef<HTMLCanvasElement>(null)

  useEffect(() => {
    if (station && canvasRef.current) {
      QRCode.toCanvas(canvasRef.current, station.token, { width: 220, margin: 1 })
    }
  }, [station])

  return (
    <Dialog open={!!station} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-xs">
        <DialogHeader>
          <DialogTitle>{station?.name}</DialogTitle>
        </DialogHeader>
        <div className="flex flex-col items-center gap-3">
          <canvas ref={canvasRef} />
          <p className="text-sm text-muted-foreground">
            Código manual: <span className="font-mono font-semibold text-foreground">{station?.code}</span>
          </p>
        </div>
      </DialogContent>
    </Dialog>
  )
}

function AnnouncementsSection({ editionId }: { editionId: string }) {
  const queryClient = useQueryClient()
  const [creating, setCreating] = useState(false)
  const [form, setForm] = useState({ title: '', body: '', notify_participants: true })

  const { data: announcements, isLoading } = useQuery({
    queryKey: ['admin-announcements', editionId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('announcements')
        .select('*')
        .eq('edition_id', editionId)
        .order('created_at', { ascending: false })
      if (error) throw error
      return data
    },
  })

  async function create() {
    const { error } = await supabase.from('announcements').insert({
      edition_id: editionId,
      title: form.title,
      body: form.body,
      notify_participants: form.notify_participants,
    })
    if (error) {
      toast.error('Não foi possível criar', { description: error.message })
      return
    }
    toast.success('Comunicado criado como rascunho.')
    setCreating(false)
    setForm({ title: '', body: '', notify_participants: true })
    await queryClient.invalidateQueries({ queryKey: ['admin-announcements'] })
  }

  async function publish(id: string) {
    const { error } = await supabase.rpc('publish_announcement', { _announcement_id: id })
    if (error) {
      toast.error('Não foi possível publicar', { description: error.message })
      return
    }
    toast.success('Comunicado publicado e colaboradores notificados.')
    await queryClient.invalidateQueries({ queryKey: ['admin-announcements'] })
  }

  return (
    <div className="grid gap-3 pt-4">
      <Button onClick={() => setCreating(true)} className="w-fit gap-1.5">
        <Plus className="size-4" /> Novo comunicado
      </Button>

      {isLoading && <p className="text-sm text-muted-foreground">Carregando…</p>}

      {announcements?.map((a) => (
        <Card key={a.id}>
          <CardContent className="grid gap-2 p-4">
            <div className="flex items-center justify-between">
              <p className="flex items-center gap-1.5 font-medium">
                <Megaphone className="size-4 text-primary" /> {a.title}
              </p>
              <Badge variant={a.status === 'publicado' ? 'success' : 'muted'}>
                {a.status === 'publicado' ? 'Publicado' : 'Rascunho'}
              </Badge>
            </div>
            <p className="text-sm text-muted-foreground">{a.body}</p>
            {a.status !== 'publicado' && (
              <Button size="sm" onClick={() => publish(a.id)} className="w-fit gap-1.5">
                <Send className="size-3.5" /> Publicar e notificar
              </Button>
            )}
          </CardContent>
        </Card>
      ))}

      <Dialog open={creating} onOpenChange={setCreating}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Novo comunicado</DialogTitle>
          </DialogHeader>
          <div className="grid gap-3">
            <div className="grid gap-1.5">
              <Label>Título</Label>
              <Input value={form.title} onChange={(e) => setForm({ ...form, title: e.target.value })} />
            </div>
            <div className="grid gap-1.5">
              <Label>Mensagem</Label>
              <Textarea value={form.body} onChange={(e) => setForm({ ...form, body: e.target.value })} rows={4} />
            </div>
            <label className="flex items-center justify-between text-sm">
              Notificar participantes ao publicar
              <Switch
                checked={form.notify_participants}
                onCheckedChange={(v) => setForm({ ...form, notify_participants: v })}
              />
            </label>
          </div>
          <DialogFooter>
            <Button onClick={create} disabled={!form.title || !form.body}>
              Criar como rascunho
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}
