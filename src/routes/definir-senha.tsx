import { createFileRoute, useNavigate } from '@tanstack/react-router'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import { toast } from 'sonner'
import { useState } from 'react'
import { supabase } from '#/integrations/supabase/client'
import { Logo } from '#/components/brand/Logo'
import { Button } from '#/components/ui/button'
import { Input } from '#/components/ui/input'
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '#/components/ui/card'
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from '#/components/ui/form'

// Primeiro acesso (convite do admin) e redefinição via link de /recuperar-senha
// caem aqui: o Supabase já autentica a sessão temporária a partir do token do link.
const schema = z
  .object({
    password: z.string().min(8, 'Mínimo de 8 caracteres.'),
    confirm: z.string(),
  })
  .refine((v) => v.password === v.confirm, { message: 'As senhas não coincidem.', path: ['confirm'] })

export const Route = createFileRoute('/definir-senha')({
  ssr: false,
  head: () => ({ meta: [{ title: 'Definir senha — AZVFIT' }] }),
  component: DefinirSenhaPage,
})

function DefinirSenhaPage() {
  const navigate = useNavigate()
  const [submitting, setSubmitting] = useState(false)
  const form = useForm<z.infer<typeof schema>>({
    resolver: zodResolver(schema),
    defaultValues: { password: '', confirm: '' },
  })

  async function onSubmit(values: z.infer<typeof schema>) {
    setSubmitting(true)
    const { error } = await supabase.auth.updateUser({ password: values.password })
    setSubmitting(false)
    if (error) {
      toast.error('Não foi possível definir a senha', { description: error.message })
      return
    }
    toast.success('Senha definida com sucesso.')
    void navigate({ to: '/dashboard' })
  }

  return (
    <div className="flex min-h-screen items-center justify-center bg-gradient-to-b from-secondary to-background px-4">
      <Card className="w-full max-w-sm">
        <CardHeader className="items-center gap-2 text-center">
          <Logo size="md" />
          <CardTitle>Defina sua senha</CardTitle>
          <CardDescription>Escolha uma senha para acessar o AZVFIT.</CardDescription>
        </CardHeader>
        <CardContent>
          <Form {...form}>
            <form onSubmit={form.handleSubmit(onSubmit)} className="grid gap-4">
              <FormField
                control={form.control}
                name="password"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Nova senha</FormLabel>
                    <FormControl>
                      <Input type="password" autoComplete="new-password" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={form.control}
                name="confirm"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Confirme a senha</FormLabel>
                    <FormControl>
                      <Input type="password" autoComplete="new-password" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <Button type="submit" disabled={submitting}>
                {submitting ? 'Salvando…' : 'Salvar e entrar'}
              </Button>
            </form>
          </Form>
        </CardContent>
      </Card>
    </div>
  )
}
