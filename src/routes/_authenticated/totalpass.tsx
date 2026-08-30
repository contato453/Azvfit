import { createFileRoute } from '@tanstack/react-router'
import { useQuery, useQueryClient } from '@tanstack/react-query'
import { useState } from 'react'
import { toast } from 'sonner'
import { Watch, Loader2 } from 'lucide-react'
import { AppShell } from '#/components/layout/AppShell'
import { Card, CardContent } from '#/components/ui/card'
import { Badge, type BadgeProps } from '#/components/ui/badge'
import { Button } from '#/components/ui/button'
import { Input } from '#/components/ui/input'
import { Label } from '#/components/ui/label'
import { Progress } from '#/components/ui/progress'
import {
  Drawer,
  DrawerContent,
  DrawerHeader,
  DrawerTitle,
  DrawerFooter,
} from '#/components/ui/drawer'
import { supabase } from '#/integrations/supabase/client'
import { useAuth } from '#/lib/auth'
import { useCurrentEdition, STATUS_LABEL, STATUS_TONE, formatDateBR, todayISO } from '#/lib/programa'

export const Route = createFileRoute('/_authenticated/totalpass')({
  ssr: false,
  head: () => ({ meta: [{ title: 'TotalPass — AZVFIT' }] }),
  component: TotalPassPage,
})

function TotalPassPage() {
  const { user } = useAuth()
  const { data: edition } = useCurrentEdition()
  const queryClient = useQueryClient()
  const [open, setOpen] = useState(false)
  const [gymName, setGymName] = useState('')
  const [date, setDate] = useState(todayISO())
  const [file, setFile] = useState<File | null>(null)
  const [submitting, setSubmitting] = useState(false)

  const { data: checkins, isLoading } = useQuery({
    queryKey: ['totalpass-checkins', edition?.id, user?.id],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('totalpass_checkins')
        .select('*')
        .eq('edition_id', edition!.id)
        .eq('user_id', user!.id)
        .order('checkin_date', { ascending: false })
      if (error) throw error
      return data
    },
    enabled: !!edition?.id && !!user,
  })

  const { data: bonusPoints } = useQuery({
    queryKey: ['totalpass-bonus', edition?.id, user?.id],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('point_ledger')
        .select('points')
        .eq('edition_id', edition!.id)
        .eq('user_id', user!.id)
        .eq('kind', 'totalpass')
      if (error) throw error
      return (data ?? []).reduce((sum, r) => sum + Number(r.points), 0)
    },
    enabled: !!edition?.id && !!user,
  })

  async function handleSubmit() {
    if (!user || !edition) return
    if (!file) {
      toast.error('Anexe o print do check-in.')
      return
    }
    setSubmitting(true)
    try {
      const { data: checkin, error } = await supabase
        .from('totalpass_checkins')
        .insert({ edition_id: edition.id, user_id: user.id, checkin_date: date, gym_name: gymName || null, truth_declared: true })
        .select()
        .single()
      if (error) throw error

      const path = `${user.id}/${edition.id}/${Date.now()}_${file.name.replace(/[^a-zA-Z0-9._-]/g, '_')}`
      const { error: uploadError } = await supabase.storage.from('evidences').upload(path, file)
      if (uploadError) throw uploadError
      const { error: evError } = await supabase.from('evidences').insert({
        totalpass_checkin_id: checkin.id,
        edition_id: edition.id,
        user_id: user.id,
        storage_path: path,
        file_name: file.name,
        mime_type: file.type,
        file_size: file.size,
      })
      if (evError) throw evError

      const { error: updateError } = await supabase
        .from('totalpass_checkins')
        .update({ status: 'enviado', submitted_at: new Date().toISOString() })
        .eq('id', checkin.id)
      if (updateError) throw updateError

      toast.success('Check-in enviado para validação!')
      await queryClient.invalidateQueries({ queryKey: ['totalpass-checkins'] })
      setOpen(false)
      setGymName('')
      setFile(null)
    } catch (err: any) {
      toast.error('Não foi possível enviar o check-in', { description: err.message ?? String(err) })
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <AppShell>
      <div className="grid gap-4">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-lg font-bold">TotalPass</h1>
            <p className="text-sm text-muted-foreground">3 check-ins na semana = 2 pontos de bônus (teto de 8).</p>
          </div>
          <Button onClick={() => setOpen(true)}>Novo check-in</Button>
        </div>

        <Card>
          <CardContent className="grid gap-2 p-4">
            <div className="flex items-center justify-between text-sm">
              <span>Bônus acumulado</span>
              <span className="font-semibold">{bonusPoints ?? 0} / 8 pts</span>
            </div>
            <Progress value={((bonusPoints ?? 0) / 8) * 100} />
          </CardContent>
        </Card>

        {isLoading && <div className="h-20 w-full animate-pulse rounded-md bg-muted" />}

        <div className="grid gap-2">
          {checkins?.map((c) => (
            <Card key={c.id}>
              <CardContent className="flex items-center justify-between p-4">
                <div>
                  <p className="flex items-center gap-1.5 font-medium">
                    <Watch className="size-4 text-primary" /> {c.gym_name ?? 'Academia'}
                  </p>
                  <p className="text-xs text-muted-foreground">{formatDateBR(c.checkin_date)}</p>
                </div>
                <Badge variant={STATUS_TONE[c.status] as BadgeProps['variant']}>{STATUS_LABEL[c.status]}</Badge>
              </CardContent>
            </Card>
          ))}
        </div>
      </div>

      <Drawer open={open} onOpenChange={setOpen}>
        <DrawerContent>
          <DrawerHeader>
            <DrawerTitle>Novo check-in TotalPass</DrawerTitle>
          </DrawerHeader>
          <div className="grid gap-4">
            <div className="grid gap-1.5">
              <Label htmlFor="checkin_date">Data</Label>
              <Input id="checkin_date" type="date" value={date} onChange={(e) => setDate(e.target.value)} max={todayISO()} />
            </div>
            <div className="grid gap-1.5">
              <Label htmlFor="gym_name">Academia (opcional)</Label>
              <Input id="gym_name" value={gymName} onChange={(e) => setGymName(e.target.value)} />
            </div>
            <div className="grid gap-1.5">
              <Label htmlFor="checkin_evidence">Print do check-in</Label>
              <Input id="checkin_evidence" type="file" accept="image/*" onChange={(e) => setFile(e.target.files?.[0] ?? null)} />
            </div>
          </div>
          <DrawerFooter>
            <Button onClick={handleSubmit} disabled={submitting}>
              {submitting ? <Loader2 className="size-4 animate-spin" /> : 'Enviar check-in'}
            </Button>
          </DrawerFooter>
        </DrawerContent>
      </Drawer>
    </AppShell>
  )
}
