import { createFileRoute } from '@tanstack/react-router'
import { useQuery, useQueryClient } from '@tanstack/react-query'
import { useState } from 'react'
import { toast } from 'sonner'
import { Plus, Star } from 'lucide-react'
import { AppShell } from '#/components/layout/AppShell'
import { Card, CardContent } from '#/components/ui/card'
import { Badge } from '#/components/ui/badge'
import { Button } from '#/components/ui/button'
import { Input } from '#/components/ui/input'
import { Textarea } from '#/components/ui/textarea'
import { Label } from '#/components/ui/label'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '#/components/ui/select'
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '#/components/ui/dialog'
import { supabase } from '#/integrations/supabase/client'
import type { Database } from '#/integrations/supabase/types'

export const Route = createFileRoute('/_authenticated/admin/edicoes')({
  ssr: false,
  head: () => ({ meta: [{ title: 'Edições — Admin AZVFIT' }] }),
  component: EdicoesPage,
})

type Edition = Database['public']['Tables']['editions']['Row']
type EditionStatus = Database['public']['Enums']['edition_status']

const STATUS_OPTIONS: EditionStatus[] = ['planejamento', 'inscricoes', 'ativa', 'auditoria', 'encerrada', 'arquivada']

function EdicoesPage() {
  const queryClient = useQueryClient()
  const [editing, setEditing] = useState<Partial<Edition> | null>(null)

  const { data: editions, isLoading } = useQuery({
    queryKey: ['admin-editions'],
    queryFn: async () => {
      const { data, error } = await supabase.from('editions').select('*').order('year', { ascending: false })
      if (error) throw error
      return data
    },
  })

  async function handleSave() {
    if (!editing?.name || !editing.year) return
    const payload = {
      name: editing.name,
      year: editing.year,
      status: (editing.status ?? 'planejamento') as EditionStatus,
      start_date: editing.start_date || null,
      scoring_end_date: editing.scoring_end_date || null,
      regulation: editing.regulation ?? null,
      participation_term: editing.participation_term ?? null,
    }
    const { error } = editing.id
      ? await supabase.from('editions').update(payload).eq('id', editing.id)
      : await supabase.from('editions').insert(payload)
    if (error) {
      toast.error('Não foi possível salvar', { description: error.message })
      return
    }
    toast.success('Edição salva.')
    setEditing(null)
    await queryClient.invalidateQueries({ queryKey: ['admin-editions'] })
  }

  async function setCurrent(id: string) {
    // Remove o is_current das demais e ativa nesta (respeitando o índice único parcial).
    const { error: clearError } = await supabase.from('editions').update({ is_current: false }).neq('id', id)
    if (clearError) {
      toast.error(clearError.message)
      return
    }
    const { error } = await supabase.from('editions').update({ is_current: true }).eq('id', id)
    if (error) {
      toast.error('Não foi possível definir como atual', { description: error.message })
      return
    }
    toast.success('Edição atual atualizada.')
    await queryClient.invalidateQueries({ queryKey: ['admin-editions'] })
    await queryClient.invalidateQueries({ queryKey: ['edition', 'current'] })
  }

  return (
    <AppShell admin>
      <div className="grid gap-4">
        <div className="flex items-center justify-between">
          <h1 className="text-lg font-bold">Edições</h1>
          <Button onClick={() => setEditing({ name: '', year: new Date().getFullYear(), status: 'planejamento' })} className="gap-1.5">
            <Plus className="size-4" /> Nova edição
          </Button>
        </div>

        {isLoading && <p className="text-sm text-muted-foreground">Carregando…</p>}

        <div className="grid gap-2">
          {editions?.map((e) => (
            <Card key={e.id}>
              <CardContent className="flex items-center justify-between gap-3 p-4">
                <div className="cursor-pointer" onClick={() => setEditing(e)}>
                  <p className="flex items-center gap-1.5 font-medium">
                    {e.is_current && <Star className="size-4 fill-accent text-accent" />} {e.name}
                  </p>
                  <p className="text-xs text-muted-foreground">
                    {e.start_date} → {e.scoring_end_date}
                  </p>
                </div>
                <div className="flex items-center gap-2">
                  <Badge variant="secondary">{e.status}</Badge>
                  {!e.is_current && (
                    <Button size="sm" variant="outline" onClick={() => setCurrent(e.id)}>
                      Tornar atual
                    </Button>
                  )}
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      </div>

      <Dialog open={!!editing} onOpenChange={(o) => !o && setEditing(null)}>
        <DialogContent className="max-h-[85vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>{editing?.id ? 'Editar edição' : 'Nova edição'}</DialogTitle>
          </DialogHeader>
          {editing && (
            <div className="grid gap-3">
              <div className="grid grid-cols-2 gap-3">
                <div className="grid gap-1.5">
                  <Label>Nome</Label>
                  <Input value={editing.name ?? ''} onChange={(e) => setEditing({ ...editing, name: e.target.value })} />
                </div>
                <div className="grid gap-1.5">
                  <Label>Ano</Label>
                  <Input
                    type="number"
                    value={editing.year ?? ''}
                    onChange={(e) => setEditing({ ...editing, year: Number(e.target.value) })}
                  />
                </div>
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div className="grid gap-1.5">
                  <Label>Início</Label>
                  <Input
                    type="date"
                    value={editing.start_date ?? ''}
                    onChange={(e) => setEditing({ ...editing, start_date: e.target.value })}
                  />
                </div>
                <div className="grid gap-1.5">
                  <Label>Fim da pontuação</Label>
                  <Input
                    type="date"
                    value={editing.scoring_end_date ?? ''}
                    onChange={(e) => setEditing({ ...editing, scoring_end_date: e.target.value })}
                  />
                </div>
              </div>
              <div className="grid gap-1.5">
                <Label>Status</Label>
                <Select
                  value={editing.status ?? 'planejamento'}
                  onValueChange={(v) => setEditing({ ...editing, status: v as EditionStatus })}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {STATUS_OPTIONS.map((s) => (
                      <SelectItem key={s} value={s}>
                        {s}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="grid gap-1.5">
                <Label>Regulamento</Label>
                <Textarea
                  value={editing.regulation ?? ''}
                  onChange={(e) => setEditing({ ...editing, regulation: e.target.value })}
                  rows={4}
                />
              </div>
              <div className="grid gap-1.5">
                <Label>Termo de participação</Label>
                <Textarea
                  value={editing.participation_term ?? ''}
                  onChange={(e) => setEditing({ ...editing, participation_term: e.target.value })}
                  rows={3}
                />
              </div>
            </div>
          )}
          <DialogFooter>
            <Button onClick={handleSave} disabled={!editing?.name}>
              Salvar
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </AppShell>
  )
}
