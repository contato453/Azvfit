import { createFileRoute } from '@tanstack/react-router'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import { toast } from 'sonner'
import { useEffect, useState } from 'react'
import { AppShell } from '#/components/layout/AppShell'
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '#/components/ui/card'
import { Button } from '#/components/ui/button'
import { Input } from '#/components/ui/input'
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from '#/components/ui/form'
import { Avatar, AvatarFallback } from '#/components/ui/avatar'
import { supabase } from '#/integrations/supabase/client'
import { useAuth } from '#/lib/auth'

const schema = z.object({
  full_name: z.string().min(2, 'Informe seu nome.'),
  phone: z.string().optional(),
  department: z.string().optional(),
  unit: z.string().optional(),
  job_title: z.string().optional(),
})

export const Route = createFileRoute('/_authenticated/perfil')({
  ssr: false,
  head: () => ({ meta: [{ title: 'Meu perfil — AZVFIT' }] }),
  component: PerfilPage,
})

function PerfilPage() {
  const { profile, refresh } = useAuth()
  const [submitting, setSubmitting] = useState(false)
  const form = useForm<z.infer<typeof schema>>({
    resolver: zodResolver(schema),
    defaultValues: {
      full_name: profile?.full_name ?? '',
      phone: profile?.phone ?? '',
      department: profile?.department ?? '',
      unit: profile?.unit ?? '',
      job_title: profile?.job_title ?? '',
    },
  })

  useEffect(() => {
    if (profile) {
      form.reset({
        full_name: profile.full_name,
        phone: profile.phone ?? '',
        department: profile.department ?? '',
        unit: profile.unit ?? '',
        job_title: profile.job_title ?? '',
      })
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [profile?.id])

  async function onSubmit(values: z.infer<typeof schema>) {
    if (!profile) return
    setSubmitting(true)
    const { error } = await supabase.from('profiles').update(values).eq('id', profile.id)
    setSubmitting(false)
    if (error) {
      toast.error('Não foi possível salvar', { description: error.message })
      return
    }
    toast.success('Perfil atualizado.')
    await refresh()
  }

  return (
    <AppShell>
      <div className="grid gap-4">
        <Card>
          <CardHeader className="flex-row items-center gap-4">
            <Avatar className="size-14">
              <AvatarFallback className="bg-primary text-lg text-primary-foreground">
                {profile?.full_name?.[0]?.toUpperCase() ?? '?'}
              </AvatarFallback>
            </Avatar>
            <div>
              <CardTitle>{profile?.full_name}</CardTitle>
              <CardDescription>{profile?.email}</CardDescription>
            </div>
          </CardHeader>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="text-base">Dados do colaborador</CardTitle>
          </CardHeader>
          <CardContent>
            <Form {...form}>
              <form onSubmit={form.handleSubmit(onSubmit)} className="grid gap-4 sm:grid-cols-2">
                <FormField
                  control={form.control}
                  name="full_name"
                  render={({ field }) => (
                    <FormItem className="sm:col-span-2">
                      <FormLabel>Nome completo</FormLabel>
                      <FormControl>
                        <Input {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <FormField
                  control={form.control}
                  name="phone"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Telefone</FormLabel>
                      <FormControl>
                        <Input {...field} />
                      </FormControl>
                    </FormItem>
                  )}
                />
                <FormField
                  control={form.control}
                  name="job_title"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Cargo</FormLabel>
                      <FormControl>
                        <Input {...field} />
                      </FormControl>
                    </FormItem>
                  )}
                />
                <FormField
                  control={form.control}
                  name="department"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Departamento</FormLabel>
                      <FormControl>
                        <Input {...field} />
                      </FormControl>
                    </FormItem>
                  )}
                />
                <FormField
                  control={form.control}
                  name="unit"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Unidade</FormLabel>
                      <FormControl>
                        <Input {...field} />
                      </FormControl>
                    </FormItem>
                  )}
                />
                <Button type="submit" disabled={submitting} className="sm:col-span-2">
                  {submitting ? 'Salvando…' : 'Salvar alterações'}
                </Button>
              </form>
            </Form>
          </CardContent>
        </Card>
      </div>
    </AppShell>
  )
}
