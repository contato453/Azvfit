import { createFileRoute } from '@tanstack/react-router'
import { useQuery, useQueryClient } from '@tanstack/react-query'
import { useState } from 'react'
import { toast } from 'sonner'
import { Plus, Pencil } from 'lucide-react'
import { AppShell } from '#/components/layout/AppShell'
import { Card, CardContent } from '#/components/ui/card'
import { Badge } from '#/components/ui/badge'
import { Button } from '#/components/ui/button'
import { Input } from '#/components/ui/input'
import { Textarea } from '#/components/ui/textarea'
import { Label } from '#/components/ui/label'
import { Switch } from '#/components/ui/switch'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '#/components/ui/select'
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '#/components/ui/dialog'
import { supabase } from '#/integrations/supabase/client'
import { useCurrentEdition } from '#/lib/programa'
import type { Database } from '#/integrations/supabase/types'

export const Route = createFileRoute('/_authenticated/admin/missoes')({
  ssr: false,
  head: () => ({ meta: [{ title: 'Missões — Admin AZVFIT' }] }),
  component: AdminMissoesPage,
})

type Mission = Database['public']['Tables']['missions']['Row']
type MissionType = Database['public']['Enums']['mission_type']

const EMPTY: Partial<Mission> = { title: '', description: '', points: 5, mission_type: 'extra', requires_evidence: true, is_published: false }

function AdminMissoesPage() {
  const { data: edition } = useCurrentEdition()
  const queryClient = useQueryClient()
  const [editing, setEditing] = useState<Partial<Mission> | null>(null)

  const { data: missions, isLoading } = useQuery({
    queryKey: ['admin-missions', edition?.id],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('missions')
        .select('*')
        .eq('edition_id', edition!.id)
        .order('created_at', { ascending: false })
      if (error) throw error
      return data
    },
    enabled: !!edition?.id,
  })

  async function handleSave() {
    if (!edition || !editing?.title) return
    const payload = {
      edition_id: edition.id,
      title: editing.title,
      description: editing.description ?? null,
      points: editing.points ?? 5,
      mission_type: (editing.mission_type ?? 'extra') as MissionType,
      requires_evidence: editing.requires_evidence ?? true,
      is_published: editing.is_published ?? false,
    }
    const { error } = editing.id
      ? await supabase.from('missions').update(payload).eq('id', editing.id)
      : await supabase.from('missions').insert(payload)
    if (error) {
      toast.error('Não foi possível salvar', { description: error.message })
      return
    }
    toast.success('Missão salva.')
    setEditing(null)
    await queryClient.invalidateQueries({ queryKey: ['admin-missions'] })
  }

  return (
    <AppShell admin>
      <div className="grid gap-4">
        <div className="flex items-center justify-between">
          <h1 className="text-lg font-bold">Missões</h1>
          <Button onClick={() => setEditing(EMPTY)} className="gap-1.5">
            <Plus className="size-4" /> Nova missão
          </Button>
        </div>

        {isLoading && <p className="text-sm text-muted-foreground">Carregando…</p>}

        <div className="grid gap-2 sm:grid-cols-2">
          {missions?.map((m) => (
            <Card key={m.id}>
              <CardContent className="grid gap-2 p-4">
                <div className="flex items-start justify-between gap-2">
                  <p className="font-medium">{m.title}</p>
                  <Badge variant="accent">+{m.points} pts</Badge>
                </div>
                <p className="text-xs text-muted-foreground">{m.description}</p>
                <div className="flex items-center justify-between">
                  <Badge variant={m.is_published ? 'success' : 'muted'}>
                    {m.is_published ? 'Publicada' : 'Rascunho'}
                  </Badge>
                  <Button size="sm" variant="outline" onClick={() => setEditing(m)} className="gap-1">
                    <Pencil className="size-3.5" /> Editar
                  </Button>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      </div>

      <Dialog open={!!editing} onOpenChange={(o) => !o && setEditing(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{editing?.id ? 'Editar missão' : 'Nova missão'}</DialogTitle>
          </DialogHeader>
          {editing && (
            <div className="grid gap-3">
              <div className="grid gap-1.5">
                <Label>Título</Label>
                <Input value={editing.title ?? ''} onChange={(e) => setEditing({ ...editing, title: e.target.value })} />
              </div>
              <div className="grid gap-1.5">
                <Label>Descrição</Label>
                <Textarea
                  value={editing.description ?? ''}
                  onChange={(e) => setEditing({ ...editing, description: e.target.value })}
                  rows={3}
                />
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div className="grid gap-1.5">
                  <Label>Pontos (3 a 10)</Label>
                  <Input
                    type="number"
                    min={0}
                    max={100}
                    value={editing.points ?? 5}
                    onChange={(e) => setEditing({ ...editing, points: Number(e.target.value) })}
                  />
                </div>
                <div className="grid gap-1.5">
                  <Label>Tipo</Label>
                  <Select
                    value={editing.mission_type ?? 'extra'}
                    onValueChange={(v) => setEditing({ ...editing, mission_type: v as MissionType })}
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="extra">Extra</SelectItem>
                      <SelectItem value="semanal">Semanal</SelectItem>
                      <SelectItem value="surpresa">Surpresa</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>
              <label className="flex items-center justify-between text-sm">
                Exige evidência
                <Switch
                  checked={editing.requires_evidence ?? true}
                  onCheckedChange={(v) => setEditing({ ...editing, requires_evidence: v })}
                />
              </label>
              <label className="flex items-center justify-between text-sm">
                Publicada
                <Switch
                  checked={editing.is_published ?? false}
                  onCheckedChange={(v) => setEditing({ ...editing, is_published: v })}
                />
              </label>
            </div>
          )}
          <DialogFooter>
            <Button onClick={handleSave} disabled={!editing?.title}>
              Salvar
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </AppShell>
  )
}
