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
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '#/components/ui/select'
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '#/components/ui/dialog'
import { supabase } from '#/integrations/supabase/client'
import { useCurrentEdition } from '#/lib/programa'
import type { Database } from '#/integrations/supabase/types'

export const Route = createFileRoute('/_authenticated/admin/atividades')({
  ssr: false,
  head: () => ({ meta: [{ title: 'Atividades — Admin AZVFIT' }] }),
  component: AdminAtividadesPage,
})

type Activity = Database['public']['Tables']['activities']['Row']
type Category = Database['public']['Tables']['activity_categories']['Row']

const EMPTY: Partial<Activity> = {
  name: '',
  description: '',
  category_id: undefined,
  base_points: 1,
  points_per_unit: null,
  max_per_day: null,
  max_per_week: null,
  max_total: null,
  requires_evidence: true,
  is_active: true,
}

function AdminAtividadesPage() {
  const { data: edition } = useCurrentEdition()
  const queryClient = useQueryClient()
  const [editing, setEditing] = useState<Partial<Activity> | null>(null)

  const { data: categories } = useQuery({
    queryKey: ['activity-categories', edition?.id],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('activity_categories')
        .select('*')
        .eq('edition_id', edition!.id)
        .order('sort_order')
      if (error) throw error
      return data
    },
    enabled: !!edition?.id,
  })

  const { data: activities, isLoading } = useQuery({
    queryKey: ['admin-activities', edition?.id],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('activities')
        .select('*, activity_categories(*)')
        .eq('edition_id', edition!.id)
        .order('name')
      if (error) throw error
      return data
    },
    enabled: !!edition?.id,
  })

  const grouped = (categories ?? []).map((cat) => ({
    ...cat,
    items: (activities ?? []).filter((a) => a.category_id === cat.id),
  }))

  async function handleSave() {
    if (!edition || !editing?.name || !editing.category_id) return
    const payload = {
      edition_id: edition.id,
      category_id: editing.category_id,
      name: editing.name,
      description: editing.description || null,
      base_points: editing.base_points ?? 1,
      points_per_unit: editing.points_per_unit || null,
      max_per_day: editing.max_per_day || null,
      max_per_week: editing.max_per_week || null,
      max_total: editing.max_total || null,
      requires_evidence: editing.requires_evidence ?? true,
      is_active: editing.is_active ?? true,
    }
    const { error } = editing.id
      ? await supabase.from('activities').update(payload).eq('id', editing.id)
      : await supabase.from('activities').insert(payload)
    if (error) {
      toast.error('Não foi possível salvar', { description: error.message })
      return
    }
    toast.success('Atividade salva.')
    setEditing(null)
    await queryClient.invalidateQueries({ queryKey: ['admin-activities'] })
  }

  async function handleToggleActive(a: Activity) {
    const { error } = await supabase.from('activities').update({ is_active: !a.is_active }).eq('id', a.id)
    if (error) {
      toast.error('Não foi possível atualizar', { description: error.message })
      return
    }
    toast.success(a.is_active ? 'Atividade desativada.' : 'Atividade reativada.')
    await queryClient.invalidateQueries({ queryKey: ['admin-activities'] })
  }

  return (
    <AppShell admin>
      <div className="grid gap-4">
        <div className="flex items-center justify-between">
          <h1 className="text-lg font-bold">Atividades</h1>
          <Button
            onClick={() => setEditing({ ...EMPTY, category_id: categories?.[0]?.id })}
            disabled={!categories?.length}
            className="gap-1.5"
          >
            <Plus className="size-4" /> Nova atividade
          </Button>
        </div>

        {isLoading && <p className="text-sm text-muted-foreground">Carregando…</p>}

        <div className="grid gap-5">
          {grouped.map((cat) => (
            <div key={cat.id} className="grid gap-2">
              <h2 className="text-sm font-semibold text-muted-foreground">{cat.name}</h2>
              {cat.items.length === 0 && <p className="text-xs text-muted-foreground">Nenhuma atividade cadastrada.</p>}
              <div className="grid gap-2 sm:grid-cols-2">
                {cat.items.map((a) => (
                  <Card key={a.id}>
                    <CardContent className="grid gap-2 p-4">
                      <div className="flex items-start justify-between gap-2">
                        <p className="font-medium">{a.name}</p>
                        <Badge variant="accent">
                          +{a.base_points} pts{a.points_per_unit ? ` / unidade` : ''}
                        </Badge>
                      </div>
                      {a.description && <p className="text-xs text-muted-foreground">{a.description}</p>}
                      <div className="flex flex-wrap items-center gap-1.5 text-xs text-muted-foreground">
                        {a.requires_evidence && <Badge variant="muted">Exige evidência</Badge>}
                        {a.max_per_day && <Badge variant="muted">Máx {a.max_per_day}/dia</Badge>}
                        {a.max_per_week && <Badge variant="muted">Máx {a.max_per_week}/semana</Badge>}
                        {a.max_total && <Badge variant="muted">Máx {a.max_total} na edição</Badge>}
                      </div>
                      <div className="flex items-center justify-between pt-1">
                        <div className="flex items-center gap-2">
                          <Switch checked={a.is_active} onCheckedChange={() => handleToggleActive(a)} />
                          <span className="text-xs text-muted-foreground">{a.is_active ? 'Ativa' : 'Inativa'}</span>
                        </div>
                        <Button size="sm" variant="outline" onClick={() => setEditing(a)} className="gap-1">
                          <Pencil className="size-3.5" /> Editar
                        </Button>
                      </div>
                    </CardContent>
                  </Card>
                ))}
              </div>
            </div>
          ))}
        </div>
      </div>

      <Dialog open={!!editing} onOpenChange={(o) => !o && setEditing(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{editing?.id ? 'Editar atividade' : 'Nova atividade'}</DialogTitle>
          </DialogHeader>
          {editing && (
            <div className="grid gap-3">
              <div className="grid gap-1.5">
                <Label>Nome</Label>
                <Input value={editing.name ?? ''} onChange={(e) => setEditing({ ...editing, name: e.target.value })} />
              </div>
              <div className="grid gap-1.5">
                <Label>Descrição</Label>
                <Textarea
                  value={editing.description ?? ''}
                  onChange={(e) => setEditing({ ...editing, description: e.target.value })}
                  rows={2}
                />
              </div>
              <div className="grid gap-1.5">
                <Label>Categoria</Label>
                <Select
                  value={editing.category_id ?? ''}
                  onValueChange={(v) => setEditing({ ...editing, category_id: v })}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {categories?.map((c: Category) => (
                      <SelectItem key={c.id} value={c.id}>
                        {c.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div className="grid gap-1.5">
                  <Label>Pontos base</Label>
                  <Input
                    type="number"
                    min={0}
                    value={editing.base_points ?? 1}
                    onChange={(e) => setEditing({ ...editing, base_points: Number(e.target.value) })}
                  />
                </div>
                <div className="grid gap-1.5">
                  <Label>Pontos por unidade (opcional)</Label>
                  <Input
                    type="number"
                    min={0}
                    value={editing.points_per_unit ?? ''}
                    onChange={(e) => setEditing({ ...editing, points_per_unit: e.target.value ? Number(e.target.value) : null })}
                  />
                </div>
              </div>
              <div className="grid grid-cols-3 gap-3">
                <div className="grid gap-1.5">
                  <Label>Máx/dia</Label>
                  <Input
                    type="number"
                    min={0}
                    value={editing.max_per_day ?? ''}
                    onChange={(e) => setEditing({ ...editing, max_per_day: e.target.value ? Number(e.target.value) : null })}
                  />
                </div>
                <div className="grid gap-1.5">
                  <Label>Máx/semana</Label>
                  <Input
                    type="number"
                    min={0}
                    value={editing.max_per_week ?? ''}
                    onChange={(e) => setEditing({ ...editing, max_per_week: e.target.value ? Number(e.target.value) : null })}
                  />
                </div>
                <div className="grid gap-1.5">
                  <Label>Máx na edição</Label>
                  <Input
                    type="number"
                    min={0}
                    value={editing.max_total ?? ''}
                    onChange={(e) => setEditing({ ...editing, max_total: e.target.value ? Number(e.target.value) : null })}
                  />
                </div>
              </div>
              <label className="flex items-center justify-between text-sm">
                Exige evidência (foto/print)
                <Switch
                  checked={editing.requires_evidence ?? true}
                  onCheckedChange={(v) => setEditing({ ...editing, requires_evidence: v })}
                />
              </label>
              <label className="flex items-center justify-between text-sm">
                Ativa (visível para os colaboradores)
                <Switch
                  checked={editing.is_active ?? true}
                  onCheckedChange={(v) => setEditing({ ...editing, is_active: v })}
                />
              </label>
            </div>
          )}
          <DialogFooter>
            <Button onClick={handleSave} disabled={!editing?.name || !editing.category_id}>
              Salvar
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </AppShell>
  )
}
