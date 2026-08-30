import { createFileRoute } from '@tanstack/react-router'
import { AppShell } from '#/components/layout/AppShell'
import { Card, CardContent, CardHeader, CardTitle } from '#/components/ui/card'
import { useCurrentEdition } from '#/lib/programa'

export const Route = createFileRoute('/_authenticated/privacidade')({
  ssr: false,
  head: () => ({ meta: [{ title: 'Privacidade — AZVFIT' }] }),
  component: PrivacidadePage,
})

function PrivacidadePage() {
  const { data: edition } = useCurrentEdition()

  return (
    <AppShell>
      <div className="grid gap-4">
        <Card>
          <CardHeader>
            <CardTitle>Política de privacidade</CardTitle>
          </CardHeader>
          <CardContent className="grid gap-4 text-sm text-muted-foreground">
            <p>{edition?.participation_term}</p>
            <ul className="list-disc space-y-1 pl-5">
              <li>Cada usuário só enxerga o que lhe é permitido — regras aplicadas no próprio banco de dados.</li>
              <li>Evidências nunca são públicas: ficam em armazenamento privado, abertas por links temporários.</li>
              <li>Pontuação é calculada no servidor; nada pode ser alterado pelo navegador do participante.</li>
              <li>Cadastro público e login anônimo estão desativados; senhas verificadas contra bases de vazamento.</li>
              <li>Evidências podem ser expurgadas após o prazo de retenção definido pelo administrador.</li>
              <li>Aceites de termo e política ficam registrados com data e versão.</li>
            </ul>
          </CardContent>
        </Card>
      </div>
    </AppShell>
  )
}
