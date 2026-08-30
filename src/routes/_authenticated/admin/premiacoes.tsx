import { createFileRoute } from '@tanstack/react-router'
import { useQuery, useQueryClient } from '@tanstack/react-query'
import { useState } from 'react'
import { toast } from 'sonner'
import { Plus, Award as AwardIcon } from 'lucide-react'
import { AppShell } from '#/components/layout/AppShell'
import { Card, CardContent } from '#/components/ui/card'
import { Badge } from '#/components/ui/badge'
import { Button } from '#/components/ui/button'
import { Input } from '#/components/ui/input'
import { Textarea } from '#/components/ui/textarea'
import { Label } from '#/components/ui/label'
import { Switch } from '#/components/ui/switch'
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '#/components/ui/dialog'
import { supabase } from '#/integrations/supabase/client'
import { useCurrentEdition } from '#/lib/programa'
import type { Database } from '#/integrations/supabase/types'

export const Route = createFileRoute('/_authenticated/admin/premiacoes')({
  ssr: false,
  head: () => ({ meta: [{ title: 'Premiações — Admin AZVFIT' }] }),
  component: PremiacoesPage,
})

type Award = Database['public']['Tables']['awards']['Row']

const DEFAULT_CATEGORIES = [
  { slug: 'campeao_geral', title: 'Campeão geral', prize: 500 },
  { slug: 'vice', title: 'Vice-campeão', prize: 200 },
  { slug: 'terceiro', title: 'Terceiro lugar', prize: 100 },
  { slug: 'evolucao', title: 'Evolução', prize: 0 },
  { slug: 'espirito_equipe', title: 'Espírito de equipe', prize: 0 },
  { slug: 'motivacao', title: 'Motivação', prize: 0 },
  { slug: 'totalpass', title: 'TotalPass', prize: 0 },
  { slug: 'participacao', title: 'Participação', prize: 0 },
]

function PremiacoesPage() {
  const { data: edition } = useCurrentEdition()
  const queryClient = useQueryClient()
  const [editing, setEditing] = useState<Partial<Award> | null>(null)

  const { data: awards, isLoading } = useQuery({
    queryKey: ['admin-awards', edition?.id],
    queryFn: async () => {
      const { data, error } = await supabase.from('awards').select('*').eq('edition_id', edition!.id).order('sort_order')
      if (error) throw error
      return data
    },
    enabled: !!edition?.id,
  })

  async function seedDefaults() {
    if (!edition) return
    const rows = DEFAULT_CATEGORIES.map((c, i) => ({
      edition_id: edition.id,
      title: c.title,
      category_slug: c.slug,
      prize_amount: c.prize || null,
      sort_order: i,
    }))
    const { error } = await supabase.from('awards').insert(rows)
    if (error) {
      toast.error('Não foi possível criar', { description: error.message })
      return
    }
    toast.success('Categorias padrão criadas.')
    await queryClient.invalidateQueries({ queryKey: ['admin-awards'] })
  }

  async function handleSave() {
    if (!edition || !editing?.title) return
    const payload = {
      edition_id: edition.id,
      title: editing.title,
      description: editing.description ?? null,
      category_slug: editing.category_slug ?? editing.title.toLowerCase().replace(/\s+/g, '_'),
      prize_amount: editing.prize_amount ?? null,
      prize_note: editing.prize_note ?? null,
      is_published: editing.is_published ?? false,
    }
    const { error } = editing.id
      ? await supabase.from('awards').update(payload).eq('id', editing.id)
      : await supabase.from('awards').insert(payload)
    if (error) {
      toast.error('Não foi possível salvar', { description: error.message })
      return
    }
    toast.success('Premiação salva.')
    setEditing(null)
    await queryClient.invalidateQueries({ queryKey: ['admin-awards'] })
  }

  return (
    <AppShell admin>
      <div className="grid gap-4">
        <div className="flex items-center justify-between">
          <h1 className="text-lg font-bold">Premiações</h1>
          <div className="flex gap-2">
            {!awards?.length && (
              <Button variant="outline" onClick={seedDefaults}>
                Criar categorias padrão
              </Button>
            )}
            <Button onClick={() => setEditing({ title: '' })} className="gap-1.5">
              <Plus className="size-4" /> Nova
            </Button>
          </div>
        </div>

        {isLoading && <p className="text-sm text-muted-foreground">Carregando…</p>}

        <div className="grid gap-2 sm:grid-cols-2">
          {awards?.map((a) => (
            <Card key={a.id} className="cursor-pointer" onClick={() => setEditing(a)}>
              <CardContent className="grid gap-1 p-4">
                <p className="flex items-center gap-1.5 font-medium">
                  <AwardIcon className="size-4 text-accent" /> {a.title}
                </p>
                {a.prize_amount != null && (
                  <p className="text-sm text-muted-foreground">R$ {Number(a.prize_amount).toLocaleString('pt-BR')}</p>
                )}
                <Badge variant={a.is_published ? 'success' : 'muted'} className="w-fit">
                  {a.is_published ? 'Publicada' : 'Rascunho'}
                </Badge>
              </CardContent>
            </Card>
          ))}
        </div>
      </div>

      <Dialog open={!!editing} onOpenChange={(o) => !o && setEditing(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{editing?.id ? 'Editar premiação' : 'Nova premiação'}</DialogTitle>
          </DialogHeader>
          {editing && (
            <div className="grid gap-3">
              <div className="grid gap-1.5">
                <Label>Título</Label>
                <Input value={editing.title ?? ''} onChange={(e) => setEditing({ ...editing, title: e.target.value })} />
              </div>
              <div className="grid gap-1.5">
                <Label>Critério</Label>
                <Textarea
                  value={editing.criteria ?? ''}
                  onChange={(e) => setEditing({ ...editing, criteria: e.target.value })}
                  rows={2}
                />
              </div>
              <div className="grid gap-1.5">
                <Label>Valor (R$)</Label>
                <Input
                  type="number"
                  value={editing.prize_amount ?? ''}
                  onChange={(e) => setEditing({ ...editing, prize_amount: e.target.value ? Number(e.target.value) : null })}
                />
              </div>
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
