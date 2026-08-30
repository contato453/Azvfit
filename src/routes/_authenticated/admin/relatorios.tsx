import { createFileRoute } from '@tanstack/react-router'
import { useState } from 'react'
import { toast } from 'sonner'
import { Download, Printer } from 'lucide-react'
import { AppShell } from '#/components/layout/AppShell'
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '#/components/ui/card'
import { Button } from '#/components/ui/button'
import { supabase } from '#/integrations/supabase/client'
import { useCurrentEdition, formatDateBR, STATUS_LABEL } from '#/lib/programa'
import { downloadCsv } from '#/lib/relatorios'

export const Route = createFileRoute('/_authenticated/admin/relatorios')({
  ssr: false,
  head: () => ({ meta: [{ title: 'Relatórios — Admin AZVFIT' }] }),
  component: RelatoriosPage,
})

function RelatoriosPage() {
  const { data: edition } = useCurrentEdition()
  const [loading, setLoading] = useState<string | null>(null)

  async function exportParticipants() {
    if (!edition) return
    setLoading('participants')
    const { data, error } = await supabase
      .from('edition_participants')
      .select('total_points, is_disqualified, profiles(full_name, email, department, unit)')
      .eq('edition_id', edition.id)
      .order('total_points', { ascending: false })
    setLoading(null)
    if (error) return toast.error(error.message)
    downloadCsv(
      `azvfit_participantes_${edition.year}.csv`,
      (data ?? []).map((r: any) => ({
        nome: r.profiles?.full_name,
        email: r.profiles?.email,
        departamento: r.profiles?.department,
        unidade: r.profiles?.unit,
        pontos: r.total_points,
        desclassificado: r.is_disqualified ? 'sim' : 'não',
      })),
    )
  }

  async function exportRecords() {
    if (!edition) return
    setLoading('records')
    const { data, error } = await supabase
      .from('activity_records')
      .select('activity_date, status, points_awarded, profiles(full_name), activities(name, activity_categories(name))')
      .eq('edition_id', edition.id)
      .order('activity_date', { ascending: false })
    setLoading(null)
    if (error) return toast.error(error.message)
    downloadCsv(
      `azvfit_registros_${edition.year}.csv`,
      (data ?? []).map((r: any) => ({
        data: formatDateBR(r.activity_date),
        colaborador: r.profiles?.full_name,
        categoria: r.activities?.activity_categories?.name,
        atividade: r.activities?.name,
        status: STATUS_LABEL[r.status as keyof typeof STATUS_LABEL],
        pontos: r.points_awarded ?? '',
      })),
    )
  }

  async function exportTotalPass() {
    if (!edition) return
    setLoading('totalpass')
    const { data, error } = await supabase
      .from('totalpass_checkins')
      .select('checkin_date, status, gym_name, profiles(full_name)')
      .eq('edition_id', edition.id)
    setLoading(null)
    if (error) return toast.error(error.message)
    downloadCsv(
      `azvfit_totalpass_${edition.year}.csv`,
      (data ?? []).map((r: any) => ({
        data: formatDateBR(r.checkin_date),
        colaborador: r.profiles?.full_name,
        academia: r.gym_name,
        status: STATUS_LABEL[r.status as keyof typeof STATUS_LABEL],
      })),
    )
  }

  async function exportMissions() {
    if (!edition) return
    setLoading('missions')
    const { data, error } = await supabase
      .from('mission_participations')
      .select('status, points_awarded, profiles(full_name), missions!inner(title, edition_id)')
      .eq('missions.edition_id', edition.id)
    setLoading(null)
    if (error) return toast.error(error.message)
    downloadCsv(
      `azvfit_missoes_${edition.year}.csv`,
      (data ?? []).map((r: any) => ({
        colaborador: r.profiles?.full_name,
        missao: r.missions?.title,
        status: STATUS_LABEL[r.status as keyof typeof STATUS_LABEL],
        pontos: r.points_awarded ?? '',
      })),
    )
  }

  async function exportRanking() {
    if (!edition) return
    setLoading('ranking')
    const { data: pub } = await supabase
      .from('ranking_publications')
      .select('id, title')
      .eq('edition_id', edition.id)
      .eq('status', 'publicado')
      .order('published_at', { ascending: false })
      .limit(1)
      .maybeSingle()
    if (!pub) {
      setLoading(null)
      toast.error('Nenhum ranking publicado ainda.')
      return
    }
    const { data, error } = await supabase
      .from('ranking_entries')
      .select('*')
      .eq('publication_id', pub.id)
      .order('position')
    setLoading(null)
    if (error) return toast.error(error.message)
    downloadCsv(
      `azvfit_ranking_${edition.year}.csv`,
      (data ?? []).map((r) => ({
        posicao: r.position,
        nome: r.participant_name,
        pontos: r.total_points,
        atividades: r.approved_activities,
        totalpass: r.totalpass_checkins,
        missoes: r.extra_missions,
      })),
    )
  }

  const reports = [
    { key: 'participants', label: 'Participantes', description: 'Nome, e-mail, departamento e pontuação.', action: exportParticipants },
    { key: 'records', label: 'Registros por status', description: 'Todos os registros de atividade da edição.', action: exportRecords },
    { key: 'missions', label: 'Missões', description: 'Participações em missões e pontuação.', action: exportMissions },
    { key: 'totalpass', label: 'TotalPass', description: 'Check-ins enviados e status.', action: exportTotalPass },
    { key: 'ranking', label: 'Ranking publicado', description: 'Snapshot da última publicação.', action: exportRanking },
  ]

  return (
    <AppShell admin>
      <div className="grid gap-4">
        <div className="flex items-center justify-between">
          <h1 className="text-lg font-bold">Relatórios</h1>
          <Button variant="outline" onClick={() => window.print()} className="gap-1.5 no-print">
            <Printer className="size-4" /> Imprimir / PDF
          </Button>
        </div>

        <div className="grid gap-3 sm:grid-cols-2">
          {reports.map((r) => (
            <Card key={r.key}>
              <CardHeader>
                <CardTitle className="text-base">{r.label}</CardTitle>
                <CardDescription>{r.description}</CardDescription>
              </CardHeader>
              <CardContent>
                <Button onClick={r.action} disabled={loading === r.key} className="gap-1.5">
                  <Download className="size-4" /> {loading === r.key ? 'Exportando…' : 'Exportar CSV'}
                </Button>
              </CardContent>
            </Card>
          ))}
        </div>
      </div>
    </AppShell>
  )
}
