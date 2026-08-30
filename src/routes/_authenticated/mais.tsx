import { createFileRoute, Link } from '@tanstack/react-router'
import { AppShell } from '#/components/layout/AppShell'
import { Card, CardContent } from '#/components/ui/card'
import { COLABORADOR_NAV } from '#/components/layout/nav-items'
import { ChevronRight } from 'lucide-react'

export const Route = createFileRoute('/_authenticated/mais')({
  ssr: false,
  head: () => ({ meta: [{ title: 'Mais — AZVFIT' }] }),
  component: MaisPage,
})

function MaisPage() {
  return (
    <AppShell>
      <div className="grid gap-4">
        <h1 className="text-lg font-bold">Mais</h1>
        <Card>
          <CardContent className="divide-y divide-border p-0">
            {COLABORADOR_NAV.map((item) => (
              <Link key={item.to} to={item.to} className="flex items-center gap-3 px-4 py-3 text-sm hover:bg-muted">
                <item.icon className="size-4 text-primary" />
                <span className="flex-1">{item.label}</span>
                <ChevronRight className="size-4 text-muted-foreground" />
              </Link>
            ))}
          </CardContent>
        </Card>
      </div>
    </AppShell>
  )
}
