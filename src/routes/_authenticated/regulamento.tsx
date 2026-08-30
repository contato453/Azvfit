import { createFileRoute, useNavigate } from '@tanstack/react-router'
import { useState } from 'react'
import { toast } from 'sonner'
import { AppShell } from '#/components/layout/AppShell'
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '#/components/ui/card'
import { Button } from '#/components/ui/button'
import { Checkbox } from '#/components/ui/checkbox'
import { Skeleton } from '#/components/ui/skeleton'
import { supabase } from '#/integrations/supabase/client'
import { useAuth } from '#/lib/auth'
import { useCurrentEdition, useRegulationAcceptance } from '#/lib/programa'
import { useQueryClient } from '@tanstack/react-query'

export const Route = createFileRoute('/_authenticated/regulamento')({
  ssr: false,
  head: () => ({ meta: [{ title: 'Regulamento — AZVFIT' }] }),
  component: RegulamentoPage,
})

function RegulamentoPage() {
  const { user } = useAuth()
  const navigate = useNavigate()
  const queryClient = useQueryClient()
  const { data: edition, isLoading } = useCurrentEdition()
  const { data: acceptance } = useRegulationAcceptance(edition?.id)

  const [voluntary, setVoluntary] = useState(false)
  const [terms, setTerms] = useState(false)
  const [privacy, setPrivacy] = useState(false)
  const [submitting, setSubmitting] = useState(false)

  const allChecked = voluntary && terms && privacy

  async function handleAccept() {
    if (!edition || !user) return
    setSubmitting(true)
    const { error } = await supabase.from('regulation_acceptances').insert({
      edition_id: edition.id,
      user_id: user.id,
      voluntary_confirmed: voluntary,
      terms_accepted: terms,
      privacy_accepted: privacy,
    })
    setSubmitting(false)
    if (error) {
      toast.error('Não foi possível registrar o aceite', { description: error.message })
      return
    }
    toast.success('Regulamento aceito. Bem-vindo ao AZVFIT!')
    await queryClient.invalidateQueries({ queryKey: ['regulation-acceptance'] })
    void navigate({ to: '/dashboard' })
  }

  if (isLoading) {
    return (
      <AppShell>
        <Skeleton className="h-64 w-full" />
      </AppShell>
    )
  }

  return (
    <AppShell>
      <div className="grid gap-4">
        <Card>
          <CardHeader>
            <CardTitle>Regulamento — {edition?.name}</CardTitle>
            <CardDescription>Leia com atenção antes de aceitar.</CardDescription>
          </CardHeader>
          <CardContent className="prose prose-sm max-w-none whitespace-pre-wrap text-sm text-foreground">
            {edition?.regulation ?? 'Regulamento ainda não publicado.'}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="text-base">Termo de participação voluntária</CardTitle>
          </CardHeader>
          <CardContent className="whitespace-pre-wrap text-sm text-muted-foreground">
            {edition?.participation_term}
          </CardContent>
        </Card>

        {acceptance ? (
          <Card className="border-success/40 bg-success/10">
            <CardContent className="p-4 text-sm">
              Você já aceitou o regulamento em {new Date(acceptance.accepted_at).toLocaleDateString('pt-BR')}.
            </CardContent>
          </Card>
        ) : (
          <Card>
            <CardContent className="grid gap-3 p-4">
              <label className="flex items-start gap-2 text-sm">
                <Checkbox checked={voluntary} onCheckedChange={(v) => setVoluntary(!!v)} className="mt-0.5" />
                Confirmo que minha participação é voluntária.
              </label>
              <label className="flex items-start gap-2 text-sm">
                <Checkbox checked={terms} onCheckedChange={(v) => setTerms(!!v)} className="mt-0.5" />
                Li e aceito o regulamento e o termo de participação.
              </label>
              <label className="flex items-start gap-2 text-sm">
                <Checkbox checked={privacy} onCheckedChange={(v) => setPrivacy(!!v)} className="mt-0.5" />
                Li e aceito a{' '}
                <a href="/privacidade" className="underline">
                  política de privacidade
                </a>
                .
              </label>
              <Button disabled={!allChecked || submitting} onClick={handleAccept} className="mt-2">
                {submitting ? 'Registrando…' : 'Aceitar e continuar'}
              </Button>
            </CardContent>
          </Card>
        )}
      </div>
    </AppShell>
  )
}
