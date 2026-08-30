import { createFileRoute } from '@tanstack/react-router'
import { useQuery } from '@tanstack/react-query'
import { useState } from 'react'
import { History } from 'lucide-react'
import { AppShell } from '#/components/layout/AppShell'
import { Card, CardContent } from '#/components/ui/card'
import { Badge } from '#/components/ui/badge'
import { Input } from '#/components/ui/input'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '#/components/ui/table'
import { supabase } from '#/integrations/supabase/client'
import { useCurrentEdition, formatDateTimeBR } from '#/lib/programa'

export const Route = createFileRoute('/_authenticated/admin/auditoria')({
  ssr: false,
  head: () => ({ meta: [{ title: 'Auditoria — Admin AZVFIT' }] }),
  component: AuditoriaPage,
})

function AuditoriaPage() {
  const { data: edition } = useCurrentEdition()
  const [entityFilter, setEntityFilter] = useState('')

  const { data: logs, isLoading } = useQuery({
    queryKey: ['audit-logs', edition?.id, entityFilter],
    queryFn: async () => {
      let query = supabase
        .from('audit_logs')
        .select('*, profiles:actor_id(full_name)')
        .order('created_at', { ascending: false })
        .limit(200)
      if (edition?.id) query = query.eq('edition_id', edition.id)
      if (entityFilter) query = query.ilike('entity_table', `%${entityFilter}%`)
      const { data, error } = await query
      if (error) throw error
      return data
    },
  })

  return (
    <AppShell admin>
      <div className="grid gap-4">
        <div className="flex items-center justify-between gap-2">
          <h1 className="flex items-center gap-2 text-lg font-bold">
            <History className="size-5 text-primary" /> Auditoria
          </h1>
          <Input
            placeholder="Filtrar por tabela"
            className="w-48"
            value={entityFilter}
            onChange={(e) => setEntityFilter(e.target.value)}
          />
        </div>
        <p className="text-xs text-muted-foreground">
          Histórico somente leitura. Toda alteração de pontos registra autor, ação, valor anterior, valor novo e
          justificativa.
        </p>

        <Card>
          <CardContent className="p-0">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Data</TableHead>
                  <TableHead>Autor</TableHead>
                  <TableHead>Tabela</TableHead>
                  <TableHead>Ação</TableHead>
                  <TableHead>Motivo</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {isLoading && (
                  <TableRow>
                    <TableCell colSpan={5}>Carregando…</TableCell>
                  </TableRow>
                )}
                {logs?.map((log: any) => (
                  <TableRow key={log.id}>
                    <TableCell className="whitespace-nowrap text-xs">{formatDateTimeBR(log.created_at)}</TableCell>
                    <TableCell>{log.profiles?.full_name ?? 'Sistema'}</TableCell>
                    <TableCell>
                      <Badge variant="muted">{log.entity_table}</Badge>
                    </TableCell>
                    <TableCell className="text-xs">{log.action}</TableCell>
                    <TableCell className="max-w-xs truncate text-xs text-muted-foreground" title={log.reason ?? ''}>
                      {log.reason ?? '—'}
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </CardContent>
        </Card>
      </div>
    </AppShell>
  )
}
