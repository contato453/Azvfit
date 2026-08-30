import { createFileRoute } from '@tanstack/react-router'
import { useState } from 'react'
import { Utensils, Activity as ActivityIcon, HeartPulse, ChevronRight } from 'lucide-react'
import { AppShell } from '#/components/layout/AppShell'
import { Card, CardContent } from '#/components/ui/card'
import { Badge } from '#/components/ui/badge'
import { Skeleton } from '#/components/ui/skeleton'
import { RecordFormDialog } from '#/components/records/RecordFormDialog'
import { useCurrentEdition, useActivities } from '#/lib/programa'
import type { Database } from '#/integrations/supabase/types'

export const Route = createFileRoute('/_authenticated/atividades')({
  ssr: false,
  head: () => ({ meta: [{ title: 'Atividades — AZVFIT' }] }),
  component: AtividadesPage,
})

type Activity = Database['public']['Tables']['activities']['Row'] & {
  activity_categories: Database['public']['Tables']['activity_categories']['Row'] | null
}

const ICONS: Record<string, typeof Utensils> = {
  alimentacao: Utensils,
  movimento: ActivityIcon,
  'bem-estar': HeartPulse,
}

function AtividadesPage() {
  const { data: edition } = useCurrentEdition()
  const { data: activities, isLoading } = useActivities(edition?.id)
  const [selected, setSelected] = useState<Activity | null>(null)

  const grouped = (activities ?? []).reduce<Record<string, { name: string; slug: string; items: Activity[] }>>(
    (acc, a) => {
      const cat = (a as Activity).activity_categories
      const slug = cat?.slug ?? 'outros'
      if (!acc[slug]) acc[slug] = { name: cat?.name ?? 'Outros', slug, items: [] }
      acc[slug].items.push(a as Activity)
      return acc
    },
    {},
  )

  return (
    <AppShell>
      <div className="grid gap-6">
        <div>
          <h1 className="text-lg font-bold">Atividades</h1>
          <p className="text-sm text-muted-foreground">Toque em uma atividade para registrar.</p>
        </div>

        {isLoading && (
          <div className="grid gap-3">
            <Skeleton className="h-20 w-full" />
            <Skeleton className="h-20 w-full" />
          </div>
        )}

        {Object.values(grouped).map((group) => {
          const Icon = ICONS[group.slug] ?? Utensils
          return (
            <div key={group.slug} className="grid gap-2">
              <h2 className="flex items-center gap-2 text-sm font-semibold text-muted-foreground">
                <Icon className="size-4" /> {group.name}
              </h2>
              <div className="grid gap-2 sm:grid-cols-2">
                {group.items.map((activity) => (
                  <Card
                    key={activity.id}
                    className="cursor-pointer transition-shadow hover:shadow-md"
                    onClick={() => setSelected(activity)}
                  >
                    <CardContent className="flex items-center justify-between gap-3 p-4">
                      <div>
                        <p className="font-medium">{activity.name}</p>
                        {activity.description && (
                          <p className="text-xs text-muted-foreground">{activity.description}</p>
                        )}
                      </div>
                      <div className="flex shrink-0 items-center gap-2">
                        <Badge variant="accent">+{activity.base_points} pts</Badge>
                        <ChevronRight className="size-4 text-muted-foreground" />
                      </div>
                    </CardContent>
                  </Card>
                ))}
              </div>
            </div>
          )
        })}
      </div>

      {edition && (
        <RecordFormDialog
          activity={selected}
          editionId={edition.id}
          open={!!selected}
          onOpenChange={(o) => !o && setSelected(null)}
        />
      )}
    </AppShell>
  )
}
