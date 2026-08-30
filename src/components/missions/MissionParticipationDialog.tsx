import * as React from 'react'
import { toast } from 'sonner'
import { useQueryClient } from '@tanstack/react-query'
import { Loader2 } from 'lucide-react'
import {
  Drawer,
  DrawerContent,
  DrawerHeader,
  DrawerTitle,
  DrawerDescription,
  DrawerFooter,
} from '#/components/ui/drawer'
import { Button } from '#/components/ui/button'
import { Label } from '#/components/ui/label'
import { Textarea } from '#/components/ui/textarea'
import { Checkbox } from '#/components/ui/checkbox'
import { Input } from '#/components/ui/input'
import { supabase } from '#/integrations/supabase/client'
import { useAuth } from '#/lib/auth'
import { uploadEvidence } from '#/lib/evidence-upload'
import type { Database } from '#/integrations/supabase/types'

type Mission = Database['public']['Tables']['missions']['Row']

export function MissionParticipationDialog({
  mission,
  editionId,
  open,
  onOpenChange,
}: {
  mission: Mission | null
  editionId: string
  open: boolean
  onOpenChange: (open: boolean) => void
}) {
  const { user, profile } = useAuth()
  const queryClient = useQueryClient()
  const [notes, setNotes] = React.useState('')
  const [file, setFile] = React.useState<File | null>(null)
  const [truthDeclared, setTruthDeclared] = React.useState(false)
  const [submitting, setSubmitting] = React.useState(false)

  React.useEffect(() => {
    if (open) {
      setNotes('')
      setFile(null)
      setTruthDeclared(false)
    }
  }, [open, mission?.id])

  async function handleSubmit() {
    if (!mission || !user) return
    if (mission.requires_evidence && !file) {
      toast.error('Anexe a evidência pedida pela missão.')
      return
    }
    if (!truthDeclared) {
      toast.error('Confirme a declaração de veracidade.')
      return
    }
    setSubmitting(true)
    try {
      const { data: participation, error } = await supabase
        .from('mission_participations')
        .insert({ mission_id: mission.id, user_id: user.id, notes: notes || null, truth_declared: truthDeclared })
        .select()
        .single()
      if (error) throw error

      if (file) {
        const drive = await uploadEvidence(file, user.id, profile?.full_name ?? user.email ?? user.id)
        const { error: evError } = await supabase.from('evidences').insert({
          mission_participation_id: participation.id,
          edition_id: editionId,
          user_id: user.id,
          drive_file_id: drive.id,
          drive_view_url: drive.webViewLink,
          file_name: file.name,
          mime_type: file.type,
          file_size: file.size,
        })
        if (evError) throw evError
      }

      const { error: updateError } = await supabase
        .from('mission_participations')
        .update({ status: 'enviado', submitted_at: new Date().toISOString() })
        .eq('id', participation.id)
      if (updateError) throw updateError

      toast.success('Participação enviada para validação!')
      await queryClient.invalidateQueries({ queryKey: ['my-mission-participations'] })
      onOpenChange(false)
    } catch (err: any) {
      toast.error('Não foi possível enviar', { description: err.message ?? String(err) })
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <Drawer open={open} onOpenChange={onOpenChange}>
      <DrawerContent>
        <DrawerHeader>
          <DrawerTitle>{mission?.title}</DrawerTitle>
          <DrawerDescription>{mission?.description}</DrawerDescription>
        </DrawerHeader>

        <div className="grid gap-4">
          <div className="grid gap-1.5">
            <Label htmlFor="mission_notes">Como você cumpriu a missão?</Label>
            <Textarea id="mission_notes" value={notes} onChange={(e) => setNotes(e.target.value)} rows={2} />
          </div>
          <div className="grid gap-1.5">
            <Label htmlFor="mission_evidence">
              Evidência {mission?.requires_evidence ? '(obrigatória)' : '(opcional)'}
            </Label>
            <Input
              id="mission_evidence"
              type="file"
              accept="image/*,application/pdf"
              onChange={(e) => setFile(e.target.files?.[0] ?? null)}
            />
          </div>
          <label className="flex items-start gap-2 text-sm">
            <Checkbox checked={truthDeclared} onCheckedChange={(v) => setTruthDeclared(!!v)} className="mt-0.5" />
            Declaro que as informações enviadas são verdadeiras.
          </label>
        </div>

        <DrawerFooter>
          <Button onClick={handleSubmit} disabled={submitting}>
            {submitting ? <Loader2 className="size-4 animate-spin" /> : 'Enviar participação'}
          </Button>
        </DrawerFooter>
      </DrawerContent>
    </Drawer>
  )
}
