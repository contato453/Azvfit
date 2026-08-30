import { createFileRoute } from '@tanstack/react-router'
import { useQuery, useQueryClient } from '@tanstack/react-query'
import { useState } from 'react'
import { toast } from 'sonner'
import { CalendarDays, MapPin, QrCode, CheckCircle2, Megaphone } from 'lucide-react'
import { AppShell } from '#/components/layout/AppShell'
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '#/components/ui/card'
import { Badge } from '#/components/ui/badge'
import { Button } from '#/components/ui/button'
import { Input } from '#/components/ui/input'
import { supabase } from '#/integrations/supabase/client'
import { useAuth } from '#/lib/auth'
import { useCurrentEdition, formatDateBR } from '#/lib/programa'

export const Route = createFileRoute('/_authenticated/eventos')({
  ssr: false,
  head: () => ({ meta: [{ title: 'Eventos — AZVFIT' }] }),
  component: EventosPage,
})

function EventosPage() {
  const { user } = useAuth()
  const { data: edition } = useCurrentEdition()
  const queryClient = useQueryClient()
  const [code, setCode] = useState('')
  const [checkingIn, setCheckingIn] = useState(false)

  const { data: events } = useQuery({
    queryKey: ['events', edition?.id],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('events')
        .select('*, event_stations(*)')
        .eq('edition_id', edition!.id)
        .eq('is_published', true)
        .order('event_date')
      if (error) throw error
      return data
    },
    enabled: !!edition?.id,
  })

  const { data: passport } = useQuery({
    queryKey: ['health-passport', edition?.id, user?.id],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('health_passport')
        .select('station_id, status')
        .eq('edition_id', edition!.id)
        .eq('user_id', user!.id)
        .eq('status', 'valido')
      if (error) throw error
      return data
    },
    enabled: !!edition?.id && !!user,
  })

  const { data: announcements } = useQuery({
    queryKey: ['announcements-full', edition?.id],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('announcements')
        .select('*')
        .eq('edition_id', edition!.id)
        .eq('status', 'publicado')
        .order('publish_at', { ascending: false })
      if (error) throw error
      return data
    },
    enabled: !!edition?.id,
  })

  const stampedStationIds = new Set(passport?.map((p) => p.station_id))

  async function handleCodeCheckin() {
    if (!edition || !code.trim()) return
    setCheckingIn(true)
    const { error } = await supabase.rpc('passport_checkin_code', { _edition_id: edition.id, _code: code.trim() })
    setCheckingIn(false)
    if (error) {
      toast.error('Não foi possível validar', { description: error.message })
      return
    }
    toast.success('Estação carimbada no seu Passaporte da Saúde!')
    setCode('')
    await queryClient.invalidateQueries({ queryKey: ['health-passport'] })
  }

  return (
    <AppShell>
      <div className="grid gap-4">
        <h1 className="text-lg font-bold">Eventos</h1>

        {events?.map((event) => {
          const stations = (event as any).event_stations as { id: string; name: string; sort_order: number }[]
          const total = stations?.length ?? 0
          const stamped = stations?.filter((s) => stampedStationIds.has(s.id)).length ?? 0
          return (
            <Card key={event.id}>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <CalendarDays className="size-4 text-primary" /> {event.name}
                </CardTitle>
                <CardDescription>
                  {formatDateBR(event.event_date)}
                  {event.location && (
                    <>
                      {' · '}
                      <MapPin className="inline size-3" /> {event.location}
                    </>
                  )}
                </CardDescription>
              </CardHeader>
              <CardContent className="grid gap-4">
                {event.event_type === 'day_fit' && (
                  <div className="grid gap-3">
                    <div className="flex items-center justify-between text-sm">
                      <span className="font-medium">Passaporte da Saúde</span>
                      <Badge variant={stamped >= total && total > 0 ? 'success' : 'secondary'}>
                        {stamped}/{total} estações
                      </Badge>
                    </div>
                    <div className="grid grid-cols-2 gap-2 sm:grid-cols-3">
                      {stations
                        ?.sort((a, b) => a.sort_order - b.sort_order)
                        .map((station) => {
                          const done = stampedStationIds.has(station.id)
                          return (
                            <div
                              key={station.id}
                              className={`flex items-center gap-1.5 rounded-md border p-2 text-xs ${done ? 'border-success/40 bg-success/10' : 'border-border'}`}
                            >
                              {done ? (
                                <CheckCircle2 className="size-3.5 shrink-0 text-success" />
                              ) : (
                                <QrCode className="size-3.5 shrink-0 text-muted-foreground" />
                              )}
                              {station.name}
                            </div>
                          )
                        })}
                    </div>
                    <div className="flex gap-2">
                      <Input
                        placeholder="Código da estação"
                        value={code}
                        onChange={(e) => setCode(e.target.value)}
                        className="max-w-[200px]"
                      />
                      <Button onClick={handleCodeCheckin} disabled={checkingIn || !code.trim()}>
                        Validar
                      </Button>
                    </div>
                  </div>
                )}
              </CardContent>
            </Card>
          )
        })}

        {!events?.length && <p className="text-sm text-muted-foreground">Nenhum evento publicado no momento.</p>}

        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-base">
              <Megaphone className="size-4 text-primary" /> Comunicados
            </CardTitle>
          </CardHeader>
          <CardContent className="grid gap-2">
            {!announcements?.length && <p className="text-sm text-muted-foreground">Nenhum comunicado ainda.</p>}
            {announcements?.map((a) => (
              <div key={a.id} className="rounded-md border border-border p-3 text-sm">
                <p className="font-medium">{a.title}</p>
                <p className="mt-1 text-muted-foreground">{a.body}</p>
              </div>
            ))}
          </CardContent>
        </Card>
      </div>
    </AppShell>
  )
}
