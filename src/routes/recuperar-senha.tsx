import { createFileRoute } from '@tanstack/react-router'
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

// Fluxo interno de recuperação de senha — não exposto no /login (regra de negócio:
// convites são administrados pela comissão/RH), mas a rota continua ativa para
// quem tiver o link direto.
const schema = z.object({ email: z.string().min(1, 'Informe o e-mail.').email('E-mail inválido.') })

export const Route = createFileRoute('/recuperar-senha')({
  ssr: false,
  head: () => ({ meta: [{ title: 'Recuperar senha — AZVFIT' }] }),
  component: RecuperarSenhaPage,
})

function RecuperarSenhaPage() {
  const [sent, setSent] = useState(false)
  const [submitting, setSubmitting] = useState(false)
  const form = useForm<z.infer<typeof schema>>({ resolver: zodResolver(schema), defaultValues: { email: '' } })

  async function onSubmit(values: z.infer<typeof schema>) {
    setSubmitting(true)
    const { error } = await supabase.auth.resetPasswordForEmail(values.email, {
      redirectTo: `${window.location.origin}/definir-senha`,
    })
    setSubmitting(false)
    if (error) {
      toast.error('Não foi possível enviar o link', { description: error.message })
      return
    }
    setSent(true)
  }

  return (
    <div className="flex min-h-screen items-center justify-center bg-gradient-to-b from-secondary to-background px-4">
      <Card className="w-full max-w-sm">
        <CardHeader className="items-center gap-2 text-center">
          <Logo size="md" />
          <CardTitle>Recuperar senha</CardTitle>
          <CardDescription>Enviaremos um link para redefinir sua senha por e-mail.</CardDescription>
        </CardHeader>
        <CardContent>
          {sent ? (
            <p className="text-center text-sm text-muted-foreground">
              Se o e-mail informado estiver cadastrado, você receberá um link em instantes. Confira também a caixa de
              spam.
            </p>
          ) : (
            <Form {...form}>
              <form onSubmit={form.handleSubmit(onSubmit)} className="grid gap-4">
                <FormField
                  control={form.control}
                  name="email"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>E-mail</FormLabel>
                      <FormControl>
                        <Input type="email" autoComplete="email" placeholder="voce@empresa.com" {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <Button type="submit" disabled={submitting}>
                  {submitting ? 'Enviando…' : 'Enviar link'}
                </Button>
              </form>
            </Form>
          )}
        </CardContent>
      </Card>
    </div>
  )
}
