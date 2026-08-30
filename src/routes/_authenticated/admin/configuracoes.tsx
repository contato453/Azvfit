import { createFileRoute } from '@tanstack/react-router'
import { useQuery, useQueryClient } from '@tanstack/react-query'
import { useEffect, useState } from 'react'
import { toast } from 'sonner'
import { AppShell } from '#/components/layout/AppShell'
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '#/components/ui/card'
import { Button } from '#/components/ui/button'
import { Input } from '#/components/ui/input'
import { Label } from '#/components/ui/label'
import { Switch } from '#/components/ui/switch'
import { supabase } from '#/integrations/supabase/client'
import { useCurrentEdition } from '#/lib/programa'

export const Route = createFileRoute('/_authenticated/admin/configuracoes')({
  ssr: false,
  head: () => ({ meta: [{ title: 'Configurações — Admin AZVFIT' }] }),
  component: ConfiguracoesPage,
})

function ConfiguracoesPage() {
  const { data: edition } = useCurrentEdition()
  const queryClient = useQueryClient()

  const { data: settings } = useQuery({
    queryKey: ['admin-settings', edition?.id],
    queryFn: async () => {
      const { data, error } = await supabase.from('settings').select('*').eq('edition_id', edition!.id)
      if (error) throw error
      return data
    },
    enabled: !!edition?.id,
  })

  const [form, setForm] = useState({
    max_por_dia: 1,
    missao_min: 3,
    missao_max: 10,
    checkins_por_semana: 3,
    pontos_por_semana: 2,
    maximo_total: 8,
    pontos_por_estacao: 1,
    bonus_passaporte_completo: 5,
    anonimizar_ranking: false,
    retencao_evidencias_dias: 180,
  })

  useEffect(() => {
    if (!settings) return
    const get = (key: string) => settings.find((s) => s.key === key)?.value as any
    setForm({
      max_por_dia: get('movimento_principal_max_por_dia')?.max_por_dia ?? 1,
      missao_min: get('missao_pontos_faixa')?.min ?? 3,
      missao_max: get('missao_pontos_faixa')?.max ?? 10,
      checkins_por_semana: get('totalpass_bonus')?.checkins_por_semana ?? 3,
      pontos_por_semana: get('totalpass_bonus')?.pontos_por_semana ?? 2,
      maximo_total: get('totalpass_bonus')?.maximo_total ?? 8,
      pontos_por_estacao: get('day_fit_config')?.pontos_por_estacao ?? 1,
      bonus_passaporte_completo: get('day_fit_config')?.bonus_passaporte_completo ?? 5,
      anonimizar_ranking: get('privacidade.anonimizar_ranking') ?? false,
      retencao_evidencias_dias: get('privacidade.retencao_evidencias_dias') ?? 180,
    })
  }, [settings])

  async function upsert(key: string, value: unknown, description: string, isPublic = true) {
    if (!edition) return
    const { error } = await supabase
      .from('settings')
      .upsert({ edition_id: edition.id, key, value: value as any, description, is_public: isPublic }, { onConflict: 'edition_id,key' })
    if (error) throw error
  }

  async function handleSave() {
    if (!edition) return
    try {
      await Promise.all([
        upsert('movimento_principal_max_por_dia', { max_por_dia: form.max_por_dia }, 'Limite diário nas categorias movimento e bem-estar.'),
        upsert('missao_pontos_faixa', { min: form.missao_min, max: form.missao_max }, 'Faixa de pontuação das missões.'),
        upsert('totalpass_bonus', {
          checkins_por_semana: form.checkins_por_semana,
          pontos_por_semana: form.pontos_por_semana,
          maximo_total: form.maximo_total,
        }, 'Regra de bônus semanal do TotalPass.'),
        upsert('day_fit_config', {
          pontos_por_estacao: form.pontos_por_estacao,
          bonus_passaporte_completo: form.bonus_passaporte_completo,
          sorteio_exige_passaporte_completo: true,
        }, 'Configuração do Day Fit.'),
        upsert('privacidade.anonimizar_ranking', form.anonimizar_ranking, 'Anonimiza nomes no ranking.'),
        upsert('privacidade.retencao_evidencias_dias', form.retencao_evidencias_dias, 'Dias de retenção de evidências.', false),
      ])
      toast.success('Configurações salvas.')
      await queryClient.invalidateQueries({ queryKey: ['admin-settings'] })
    } catch (err: any) {
      toast.error('Não foi possível salvar', { description: err.message })
    }
  }

  return (
    <AppShell admin>
      <div className="grid gap-4">
        <h1 className="text-lg font-bold">Configurações — {edition?.name}</h1>

        <Card>
          <CardHeader>
            <CardTitle className="text-base">Limites de pontuação</CardTitle>
            <CardDescription>Aplicados pela trigger de validação no servidor.</CardDescription>
          </CardHeader>
          <CardContent className="grid gap-3 sm:grid-cols-2">
            <Field label="Limite diário — movimento/bem-estar">
              <Input type="number" value={form.max_por_dia} onChange={(e) => setForm({ ...form, max_por_dia: Number(e.target.value) })} />
            </Field>
            <div />
            <Field label="Missão — pontos mínimo">
              <Input type="number" value={form.missao_min} onChange={(e) => setForm({ ...form, missao_min: Number(e.target.value) })} />
            </Field>
            <Field label="Missão — pontos máximo">
              <Input type="number" value={form.missao_max} onChange={(e) => setForm({ ...form, missao_max: Number(e.target.value) })} />
            </Field>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="text-base">Bônus TotalPass</CardTitle>
          </CardHeader>
          <CardContent className="grid gap-3 sm:grid-cols-3">
            <Field label="Check-ins por semana">
              <Input type="number" value={form.checkins_por_semana} onChange={(e) => setForm({ ...form, checkins_por_semana: Number(e.target.value) })} />
            </Field>
            <Field label="Pontos por semana">
              <Input type="number" value={form.pontos_por_semana} onChange={(e) => setForm({ ...form, pontos_por_semana: Number(e.target.value) })} />
            </Field>
            <Field label="Teto total">
              <Input type="number" value={form.maximo_total} onChange={(e) => setForm({ ...form, maximo_total: Number(e.target.value) })} />
            </Field>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="text-base">Day Fit</CardTitle>
          </CardHeader>
          <CardContent className="grid gap-3 sm:grid-cols-2">
            <Field label="Pontos por estação">
              <Input type="number" value={form.pontos_por_estacao} onChange={(e) => setForm({ ...form, pontos_por_estacao: Number(e.target.value) })} />
            </Field>
            <Field label="Bônus passaporte completo">
              <Input type="number" value={form.bonus_passaporte_completo} onChange={(e) => setForm({ ...form, bonus_passaporte_completo: Number(e.target.value) })} />
            </Field>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="text-base">Privacidade</CardTitle>
          </CardHeader>
          <CardContent className="grid gap-4">
            <label className="flex items-center justify-between text-sm">
              Anonimizar nomes no ranking
              <Switch checked={form.anonimizar_ranking} onCheckedChange={(v) => setForm({ ...form, anonimizar_ranking: v })} />
            </label>
            <Field label="Retenção de evidências (dias)">
              <Input
                type="number"
                value={form.retencao_evidencias_dias}
                onChange={(e) => setForm({ ...form, retencao_evidencias_dias: Number(e.target.value) })}
              />
            </Field>
          </CardContent>
        </Card>

        <Button onClick={handleSave} className="w-fit">
          Salvar configurações
        </Button>
      </div>
    </AppShell>
  )
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="grid gap-1.5">
      <Label>{label}</Label>
      {children}
    </div>
  )
}
