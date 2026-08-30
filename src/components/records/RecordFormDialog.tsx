import * as React from 'react'
import { toast } from 'sonner'
import { useQueryClient } from '@tanstack/react-query'
import { Camera, Loader2 } from 'lucide-react'
import {
  Drawer,
  DrawerContent,
  DrawerHeader,
  DrawerTitle,
  DrawerDescription,
  DrawerFooter,
} from '#/components/ui/drawer'
import { Button } from '#/components/ui/button'
import { Input } from '#/components/ui/input'
import { Label } from '#/components/ui/label'
import { Textarea } from '#/components/ui/textarea'
import { Checkbox } from '#/components/ui/checkbox'
import { Alert, AlertDescription } from '#/components/ui/alert'
import { supabase } from '#/integrations/supabase/client'
import { useAuth } from '#/lib/auth'
import { fileSha256, saoPauloNow, todayISO } from '#/lib/programa'
import { uploadEvidence } from '#/lib/evidence-upload'
import type { Database } from '#/integrations/supabase/types'

type Activity = Database['public']['Tables']['activities']['Row'] & {
  activity_categories: Database['public']['Tables']['activity_categories']['Row'] | null
}

export function RecordFormDialog({
  activity,
  editionId,
  open,
  onOpenChange,
}: {
  activity: Activity | null
  editionId: string
  open: boolean
  onOpenChange: (open: boolean) => void
}) {
  const { user, profile } = useAuth()
  const queryClient = useQueryClient()

  const now = saoPauloNow()
  const [date, setDate] = React.useState(now.date)
  const [time, setTime] = React.useState(now.time)
  const [notes, setNotes] = React.useState('')
  const [file, setFile] = React.useState<File | null>(null)
  const [truthDeclared, setTruthDeclared] = React.useState(false)
  const [submitting, setSubmitting] = React.useState(false)
  const [duplicateWarning, setDuplicateWarning] = React.useState(false)

  React.useEffect(() => {
    if (open) {
      const n = saoPauloNow()
      setDate(n.date)
      setTime(n.time)
      setNotes('')
      setFile(null)
      setTruthDeclared(false)
      setDuplicateWarning(false)
    }
  }, [open, activity?.id])

  async function handleFileChange(e: React.ChangeEvent<HTMLInputElement>) {
    const f = e.target.files?.[0] ?? null
    setFile(f)
    setDuplicateWarning(false)
    if (!f || !user) return
    const hash = await fileSha256(f)
    const { data } = await supabase
      .from('evidences')
      .select('id')
      .eq('user_id', user.id)
      .eq('file_hash', hash)
      .limit(1)
      .maybeSingle()
    if (data) setDuplicateWarning(true)
  }

  const blockedReason = React.useMemo(() => {
    if (date > todayISO()) return 'Não é possível registrar atividades com data futura.'
    if (date < todayISO()) return 'Não é permitido registrar atividades de dias anteriores.'
    const activityAt = new Date(`${date}T${time}:00-03:00`)
    const diffHours = (Date.now() - activityAt.getTime()) / 36e5
    if (diffHours > 5) return 'O registro deve ser feito em até 5 horas após a realização da atividade.'
    if (diffHours < 0) return 'O horário informado ainda não aconteceu.'
    return null
  }, [date, time])

  async function handleSubmit() {
    if (!activity || !user) return
    if (activity.requires_evidence && !file) {
      toast.error('Anexe uma evidência (foto ou print) para continuar.')
      return
    }
    if (!truthDeclared) {
      toast.error('Confirme a declaração de veracidade antes de enviar.')
      return
    }
    if (blockedReason) {
      toast.error(blockedReason)
      return
    }

    setSubmitting(true)
    try {
      // 1. Salva como rascunho primeiro para obter o record_id.
      const { data: record, error: insertError } = await supabase
        .from('activity_records')
        .insert({
          edition_id: editionId,
          activity_id: activity.id,
          user_id: user.id,
          activity_date: date,
          activity_time: `${time}:00`,
          notes: notes || null,
          status: 'rascunho',
          truth_declared: truthDeclared,
        })
        .select()
        .single()

      if (insertError) throw insertError

      // 2. Upload da evidência (se houver) direto para o Google Drive — nenhum
      // arquivo fica no Supabase, só o ponteiro (drive_file_id/drive_view_url).
      if (file) {
        const drive = await uploadEvidence(file, user.id, profile?.full_name ?? user.email ?? user.id)
        const hash = await fileSha256(file)
        const { error: evidenceError } = await supabase.from('evidences').insert({
          record_id: record.id,
          edition_id: editionId,
          user_id: user.id,
          drive_file_id: drive.id,
          drive_view_url: drive.webViewLink,
          file_name: file.name,
          mime_type: file.type,
          file_size: file.size,
          file_hash: hash,
        })
        if (evidenceError) throw evidenceError
      }

      // 3. Só então marca como enviado.
      const { error: updateError } = await supabase
        .from('activity_records')
        .update({ status: 'enviado', submitted_at: new Date().toISOString() })
        .eq('id', record.id)
      if (updateError) throw updateError

      toast.success('Registro enviado para validação!')
      await queryClient.invalidateQueries({ queryKey: ['my-records'] })
      onOpenChange(false)
    } catch (err: any) {
      toast.error('Não foi possível salvar o registro', { description: err.message ?? String(err) })
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <Drawer open={open} onOpenChange={onOpenChange}>
      <DrawerContent>
        <DrawerHeader>
          <DrawerTitle>{activity?.name}</DrawerTitle>
          <DrawerDescription>{activity?.activity_categories?.name}</DrawerDescription>
        </DrawerHeader>

        <div className="grid gap-4">
          <div className="grid grid-cols-2 gap-3">
            <div className="grid gap-1.5">
              <Label htmlFor="activity_date">Data</Label>
              <Input id="activity_date" type="date" value={date} onChange={(e) => setDate(e.target.value)} />
            </div>
            <div className="grid gap-1.5">
              <Label htmlFor="activity_time">Horário</Label>
              <Input id="activity_time" type="time" value={time} onChange={(e) => setTime(e.target.value)} />
            </div>
          </div>

          {blockedReason && (
            <Alert variant="destructive">
              <AlertDescription>{blockedReason}</AlertDescription>
            </Alert>
          )}

          <div className="grid gap-1.5">
            <Label htmlFor="notes">O que você fez? (opcional)</Label>
            <Textarea id="notes" value={notes} onChange={(e) => setNotes(e.target.value)} rows={2} />
          </div>

          <div className="grid gap-1.5">
            <Label htmlFor="evidence" className="flex items-center gap-1.5">
              <Camera className="size-4" /> Evidência {activity?.requires_evidence ? '(obrigatória)' : '(opcional)'}
            </Label>
            <Input id="evidence" type="file" accept="image/*,application/pdf" onChange={handleFileChange} />
            {duplicateWarning && (
              <Alert variant="warning">
                <AlertDescription>
                  Este arquivo já foi enviado por você antes. Envie uma evidência nova para este registro.
                </AlertDescription>
              </Alert>
            )}
          </div>

          <label className="flex items-start gap-2 text-sm">
            <Checkbox checked={truthDeclared} onCheckedChange={(v) => setTruthDeclared(!!v)} className="mt-0.5" />
            Declaro que as informações e a evidência enviadas são verdadeiras.
          </label>
        </div>

        <DrawerFooter>
          <Button onClick={handleSubmit} disabled={submitting || !!blockedReason}>
            {submitting ? <Loader2 className="size-4 animate-spin" /> : 'Enviar registro'}
          </Button>
        </DrawerFooter>
      </DrawerContent>
    </Drawer>
  )
}
