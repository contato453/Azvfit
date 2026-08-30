import { useQuery } from '@tanstack/react-query'
import { supabase } from '#/integrations/supabase/client'
import { useAuth } from '#/lib/auth'
import type { Database } from '#/integrations/supabase/types'

export const SAO_PAULO_TZ = 'America/Sao_Paulo'

/** Hora local de São Paulo via Intl — nunca usar `new Date()` cru para regras de negócio. */
export function saoPauloNow(): { date: string; time: string } {
  const now = new Date()
  const dateFmt = new Intl.DateTimeFormat('en-CA', {
    timeZone: SAO_PAULO_TZ,
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  })
  const timeFmt = new Intl.DateTimeFormat('pt-BR', {
    timeZone: SAO_PAULO_TZ,
    hour: '2-digit',
    minute: '2-digit',
    hourCycle: 'h23',
  })
  return { date: dateFmt.format(now), time: timeFmt.format(now) }
}

export function todayISO(): string {
  return saoPauloNow().date
}

export function formatDateBR(iso: string | null | undefined): string {
  if (!iso) return '—'
  const [y, m, d] = iso.split('-')
  return `${d}/${m}/${y}`
}

export function formatDateTimeBR(iso: string | null | undefined): string {
  if (!iso) return '—'
  return new Intl.DateTimeFormat('pt-BR', {
    timeZone: SAO_PAULO_TZ,
    dateStyle: 'short',
    timeStyle: 'short',
  }).format(new Date(iso))
}

export type RecordStatus = Database['public']['Enums']['record_status']

export const STATUS_LABEL: Record<RecordStatus, string> = {
  rascunho: 'Rascunho',
  enviado: 'Enviado',
  em_analise: 'Em análise',
  correcao_solicitada: 'Correção solicitada',
  aprovado: 'Aprovado',
  recusado: 'Recusado',
  cancelado: 'Cancelado',
}

export const STATUS_TONE: Record<RecordStatus, 'muted' | 'secondary' | 'warning' | 'success' | 'destructive'> = {
  rascunho: 'muted',
  enviado: 'secondary',
  em_analise: 'warning',
  correcao_solicitada: 'warning',
  aprovado: 'success',
  recusado: 'destructive',
  cancelado: 'destructive',
}

export const EDITABLE_STATUSES: RecordStatus[] = ['rascunho', 'correcao_solicitada']
export const COUNTING_STATUSES: RecordStatus[] = ['enviado', 'em_analise', 'correcao_solicitada', 'aprovado']

export function useCurrentEdition() {
  return useQuery({
    queryKey: ['edition', 'current'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('editions')
        .select('*')
        .eq('is_current', true)
        .maybeSingle()
      if (error) throw error
      return data
    },
    staleTime: 5 * 60 * 1000,
  })
}

export function useRegulationAcceptance(editionId: string | undefined) {
  const { user } = useAuth()
  return useQuery({
    queryKey: ['regulation-acceptance', editionId, user?.id],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('regulation_acceptances')
        .select('*')
        .eq('edition_id', editionId!)
        .eq('user_id', user!.id)
        .maybeSingle()
      if (error) throw error
      return data
    },
    enabled: !!editionId && !!user,
  })
}

export function useActivityCategories(editionId: string | undefined) {
  return useQuery({
    queryKey: ['activity-categories', editionId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('activity_categories')
        .select('*')
        .eq('edition_id', editionId!)
        .eq('is_active', true)
        .order('sort_order')
      if (error) throw error
      return data
    },
    enabled: !!editionId,
  })
}

export function useActivities(editionId: string | undefined) {
  return useQuery({
    queryKey: ['activities', editionId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('activities')
        .select('*, activity_categories(*)')
        .eq('edition_id', editionId!)
        .eq('is_active', true)
        .order('name')
      if (error) throw error
      return data
    },
    enabled: !!editionId,
  })
}

export function useMyRecords(editionId: string | undefined) {
  const { user } = useAuth()
  return useQuery({
    queryKey: ['my-records', editionId, user?.id],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('activity_records')
        .select('*, activities(*, activity_categories(*))')
        .eq('edition_id', editionId!)
        .eq('user_id', user!.id)
        .order('activity_date', { ascending: false })
        .order('created_at', { ascending: false })
      if (error) throw error
      return data
    },
    enabled: !!editionId && !!user,
  })
}

/** Réplica no cliente do limite de 1 registro/dia nas categorias movimento e bem-estar
 *  (o servidor é a fonte de verdade — trigger validate_activity_record). */
export function useMovementLimit(editionId: string | undefined, categorySlug: string | undefined) {
  const { data: records } = useMyRecords(editionId)
  const today = todayISO()
  if (!records || !categorySlug) return { reached: false, count: 0 }
  const count = records.filter(
    (r) =>
      r.activity_date === today &&
      COUNTING_STATUSES.includes(r.status) &&
      (r as any).activities?.activity_categories?.slug === categorySlug,
  ).length
  return { reached: count >= 1, count }
}

/** Hash SHA-256 do arquivo, calculado no browser, para detectar evidência reutilizada. */
export async function fileSha256(file: File): Promise<string> {
  const buffer = await file.arrayBuffer()
  const hashBuffer = await crypto.subtle.digest('SHA-256', buffer)
  const bytes = Array.from(new Uint8Array(hashBuffer))
  return bytes.map((b) => b.toString(16).padStart(2, '0')).join('')
}
