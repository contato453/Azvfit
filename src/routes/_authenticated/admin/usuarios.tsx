import { createFileRoute } from '@tanstack/react-router'
import { useQuery, useQueryClient } from '@tanstack/react-query'
import { useState } from 'react'
import { toast } from 'sonner'
import { Search, UserPlus, Upload, Copy, Pencil } from 'lucide-react'
import { AppShell } from '#/components/layout/AppShell'
import { Card, CardContent } from '#/components/ui/card'
import { Badge } from '#/components/ui/badge'
import { Button } from '#/components/ui/button'
import { Input } from '#/components/ui/input'
import { Textarea } from '#/components/ui/textarea'
import { Label } from '#/components/ui/label'
import { Switch } from '#/components/ui/switch'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '#/components/ui/table'
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from '#/components/ui/dialog'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '#/components/ui/select'
import { supabase } from '#/integrations/supabase/client'
import { useAuth } from '#/lib/auth'
import type { AppRole } from '#/lib/auth'

export const Route = createFileRoute('/_authenticated/admin/usuarios')({
  ssr: false,
  head: () => ({ meta: [{ title: 'Usuários — Admin AZVFIT' }] }),
  component: AdminUsuariosPage,
})

interface UserRow {
  id: string
  full_name: string
  email: string
  phone: string | null
  department: string | null
  unit: string | null
  job_title: string | null
  is_active: boolean
  role: AppRole
}

const ROLE_LABEL: Record<AppRole, string> = {
  admin: 'Administrador',
  comissao: 'Comissão',
  colaborador: 'Colaborador',
}

const EMPTY_NEW_USER = {
  full_name: '',
  email: '',
  password: '',
  role: 'colaborador' as AppRole,
  phone: '',
  department: '',
  unit: '',
  job_title: '',
}

type CreateResult = { email: string | null; ok: boolean; error?: string; password?: string }

function randomPassword(len = 10) {
  const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZabcdefghijkmnpqrstuvwxyz23456789'
  let out = ''
  for (let i = 0; i < len; i++) out += chars[Math.floor(Math.random() * chars.length)]
  return out
}

function copyText(text: string) {
  void navigator.clipboard.writeText(text)
  toast.success('Copiado.')
}

function AdminUsuariosPage() {
  const { user } = useAuth()
  const queryClient = useQueryClient()
  const [search, setSearch] = useState('')

  const [creating, setCreating] = useState(false)
  const [newUser, setNewUser] = useState(EMPTY_NEW_USER)
  const [createResult, setCreateResult] = useState<CreateResult | null>(null)

  const [importing, setImporting] = useState(false)
  const [csv, setCsv] = useState('')
  const [importResults, setImportResults] = useState<CreateResult[] | null>(null)

  const [editing, setEditing] = useState<UserRow | null>(null)

  const { data: users, isLoading } = useQuery({
    queryKey: ['admin-users'],
    queryFn: async () => {
      const [{ data: profiles, error: pErr }, { data: roleRows, error: rErr }] = await Promise.all([
        supabase.from('profiles').select('*').order('full_name'),
        supabase.from('user_roles').select('user_id, role'),
      ])
      if (pErr) throw pErr
      if (rErr) throw rErr
      const roleByUser = new Map<string, AppRole>()
      for (const r of roleRows) roleByUser.set(r.user_id, r.role)
      return profiles.map(
        (p): UserRow => ({
          id: p.id,
          full_name: p.full_name,
          email: p.email,
          phone: p.phone,
          department: p.department,
          unit: p.unit,
          job_title: p.job_title,
          is_active: p.is_active,
          role: roleByUser.get(p.id) ?? 'colaborador',
        }),
      )
    },
  })

  const filtered = users?.filter((u) => {
    const q = search.toLowerCase()
    return (
      u.full_name.toLowerCase().includes(q) ||
      u.email.toLowerCase().includes(q) ||
      (u.department ?? '').toLowerCase().includes(q)
    )
  })

  async function callCreateUsers(payload: Array<Record<string, unknown>>) {
    const { data, error } = await supabase.functions.invoke<{ results: CreateResult[]; error?: string }>(
      'admin-create-users',
      { body: { users: payload } },
    )
    if (error) throw error
    if (data?.error) throw new Error(data.error)
    return data?.results ?? []
  }

  async function handleCreateOne() {
    if (!newUser.full_name || !newUser.email) return
    setCreateResult(null)
    try {
      const [result] = await callCreateUsers([
        {
          email: newUser.email,
          full_name: newUser.full_name,
          password: newUser.password || undefined,
          role: newUser.role,
          phone: newUser.phone || undefined,
          department: newUser.department || undefined,
          unit: newUser.unit || undefined,
          job_title: newUser.job_title || undefined,
        },
      ])
      if (!result.ok) {
        toast.error('Não foi possível cadastrar', { description: result.error })
        return
      }
      setCreateResult(result)
      toast.success('Usuário cadastrado.')
      await queryClient.invalidateQueries({ queryKey: ['admin-users'] })
    } catch (e) {
      toast.error('Não foi possível cadastrar', { description: e instanceof Error ? e.message : undefined })
    }
  }

  function parseCsv(text: string) {
    // Aceita vírgula ou ponto-e-vírgula (Excel BR costuma exportar com ;).
    // Colunas: nome, email, departamento, unidade, cargo, papel (todas menos nome/email opcionais).
    // Linhas curtas (sem todas as colunas) são normais — por isso o acesso por
    // índice com checagem de tamanho, em vez de desestruturar o array direto.
    return text
      .split('\n')
      .map((line) => line.trim())
      .filter(Boolean)
      .map((line) => {
        const sep = line.includes(';') ? ';' : ','
        const cols = line.split(sep)
        const col = (i: number) => (i < cols.length ? cols[i].trim() : undefined)
        return {
          full_name: col(0) ?? '',
          email: col(1) ?? '',
          department: col(2),
          unit: col(3),
          job_title: col(4),
          role: col(5)?.toLowerCase(),
        }
      })
      .filter((row) => row.full_name && row.email && !row.email.includes('@example'))
  }

  async function handleImport() {
    const rows = parseCsv(csv)
    if (rows.length === 0) {
      toast.error('Nenhuma linha válida encontrada.')
      return
    }
    try {
      const results = await callCreateUsers(rows)
      setImportResults(results)
      const ok = results.filter((r) => r.ok).length
      toast.success(`${ok} de ${results.length} usuário(s) cadastrado(s).`)
      await queryClient.invalidateQueries({ queryKey: ['admin-users'] })
    } catch (e) {
      toast.error('Falha na importação', { description: e instanceof Error ? e.message : undefined })
    }
  }

  async function handleToggleActive(u: UserRow) {
    const { error } = await supabase.from('profiles').update({ is_active: !u.is_active }).eq('id', u.id)
    if (error) {
      toast.error('Não foi possível atualizar', { description: error.message })
      return
    }
    toast.success(u.is_active ? 'Usuário desativado.' : 'Usuário reativado.')
    await queryClient.invalidateQueries({ queryKey: ['admin-users'] })
  }

  async function handleSaveEdit() {
    if (!editing) return
    const { error: profileErr } = await supabase
      .from('profiles')
      .update({
        full_name: editing.full_name,
        phone: editing.phone,
        department: editing.department,
        unit: editing.unit,
        job_title: editing.job_title,
      })
      .eq('id', editing.id)
    if (profileErr) {
      toast.error('Não foi possível salvar o cadastro', { description: profileErr.message })
      return
    }
    const { error: roleErr } = await supabase.rpc('admin_set_role', { _user_id: editing.id, _role: editing.role })
    if (roleErr) {
      toast.error('Cadastro salvo, mas o papel não foi alterado', { description: roleErr.message })
      setEditing(null)
      await queryClient.invalidateQueries({ queryKey: ['admin-users'] })
      return
    }
    toast.success('Usuário atualizado.')
    setEditing(null)
    await queryClient.invalidateQueries({ queryKey: ['admin-users'] })
  }

  function openCreate() {
    setNewUser({ ...EMPTY_NEW_USER, password: randomPassword() })
    setCreateResult(null)
    setCreating(true)
  }

  return (
    <AppShell admin>
      <div className="grid gap-4">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <h1 className="text-lg font-bold">Usuários</h1>
          <div className="flex items-center gap-2">
            <div className="relative w-48">
              <Search className="absolute left-2.5 top-2.5 size-4 text-muted-foreground" />
              <Input placeholder="Buscar" className="pl-8" value={search} onChange={(e) => setSearch(e.target.value)} />
            </div>
            <Button variant="outline" className="gap-1.5" onClick={() => setImporting(true)}>
              <Upload className="size-4" /> Importar em lote
            </Button>
            <Button className="gap-1.5" onClick={openCreate}>
              <UserPlus className="size-4" /> Novo usuário
            </Button>
          </div>
        </div>

        <Card>
          <CardContent className="p-0">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Nome</TableHead>
                  <TableHead>E-mail</TableHead>
                  <TableHead>Departamento</TableHead>
                  <TableHead>Papel</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead className="text-right">Ações</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {isLoading && (
                  <TableRow>
                    <TableCell colSpan={6}>Carregando…</TableCell>
                  </TableRow>
                )}
                {filtered?.map((u) => (
                  <TableRow key={u.id}>
                    <TableCell className="font-medium">{u.full_name}</TableCell>
                    <TableCell className="text-muted-foreground">{u.email}</TableCell>
                    <TableCell className="text-muted-foreground">{u.department ?? '—'}</TableCell>
                    <TableCell>
                      <Badge variant={u.role === 'admin' ? 'accent' : u.role === 'comissao' ? 'secondary' : 'muted'}>
                        {ROLE_LABEL[u.role]}
                      </Badge>
                    </TableCell>
                    <TableCell>
                      {u.is_active ? <Badge variant="success">Ativo</Badge> : <Badge variant="destructive">Inativo</Badge>}
                    </TableCell>
                    <TableCell className="flex justify-end gap-1">
                      <Button size="icon" variant="ghost" title="Editar" onClick={() => setEditing(u)}>
                        <Pencil className="size-4" />
                      </Button>
                      <Switch
                        checked={u.is_active}
                        disabled={u.id === user?.id}
                        onCheckedChange={() => handleToggleActive(u)}
                        title={u.id === user?.id ? 'Você não pode desativar sua própria conta.' : 'Ativar/desativar'}
                      />
                    </TableCell>
                  </TableRow>
                ))}
                {!isLoading && filtered?.length === 0 && (
                  <TableRow>
                    <TableCell colSpan={6} className="text-center text-muted-foreground">
                      Nenhum usuário encontrado.
                    </TableCell>
                  </TableRow>
                )}
              </TableBody>
            </Table>
          </CardContent>
        </Card>
      </div>

      {/* Novo usuário */}
      <Dialog
        open={creating}
        onOpenChange={(o) => {
          setCreating(o)
          if (!o) setCreateResult(null)
        }}
      >
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Novo usuário</DialogTitle>
            <DialogDescription>Cria o login e o cadastro. Anote a senha para repassar ao usuário.</DialogDescription>
          </DialogHeader>

          {!createResult ? (
            <div className="grid gap-3">
              <div className="grid gap-1.5">
                <Label>Nome completo</Label>
                <Input value={newUser.full_name} onChange={(e) => setNewUser({ ...newUser, full_name: e.target.value })} />
              </div>
              <div className="grid gap-1.5">
                <Label>E-mail</Label>
                <Input
                  type="email"
                  value={newUser.email}
                  onChange={(e) => setNewUser({ ...newUser, email: e.target.value })}
                />
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div className="grid gap-1.5">
                  <Label>Departamento</Label>
                  <Input value={newUser.department} onChange={(e) => setNewUser({ ...newUser, department: e.target.value })} />
                </div>
                <div className="grid gap-1.5">
                  <Label>Cargo</Label>
                  <Input value={newUser.job_title} onChange={(e) => setNewUser({ ...newUser, job_title: e.target.value })} />
                </div>
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div className="grid gap-1.5">
                  <Label>Unidade</Label>
                  <Input value={newUser.unit} onChange={(e) => setNewUser({ ...newUser, unit: e.target.value })} />
                </div>
                <div className="grid gap-1.5">
                  <Label>Telefone</Label>
                  <Input value={newUser.phone} onChange={(e) => setNewUser({ ...newUser, phone: e.target.value })} />
                </div>
              </div>
              <div className="grid gap-1.5">
                <Label>Papel</Label>
                <Select value={newUser.role} onValueChange={(v) => setNewUser({ ...newUser, role: v as AppRole })}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="colaborador">Colaborador</SelectItem>
                    <SelectItem value="comissao">Comissão</SelectItem>
                    <SelectItem value="admin">Administrador</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="grid gap-1.5">
                <Label>Senha inicial</Label>
                <div className="flex gap-2">
                  <Input value={newUser.password} onChange={(e) => setNewUser({ ...newUser, password: e.target.value })} />
                  <Button type="button" variant="outline" onClick={() => setNewUser({ ...newUser, password: randomPassword() })}>
                    Gerar
                  </Button>
                </div>
                <p className="text-xs text-muted-foreground">Mínimo de 8 caracteres. O usuário pode trocar depois.</p>
              </div>
            </div>
          ) : (
            <div className="grid gap-3 rounded-md border border-border bg-muted/40 p-4 text-sm">
              <p>
                Login criado para <span className="font-medium">{createResult.email}</span>.
              </p>
              <div className="flex items-center justify-between gap-2 rounded-md bg-card px-3 py-2 font-mono">
                {createResult.password}
                <Button size="icon" variant="ghost" onClick={() => copyText(createResult.password ?? '')}>
                  <Copy className="size-4" />
                </Button>
              </div>
              <p className="text-xs text-muted-foreground">Essa senha não fica salva em lugar nenhum — copie e repasse agora.</p>
            </div>
          )}

          <DialogFooter>
            {!createResult ? (
              <Button onClick={handleCreateOne} disabled={!newUser.full_name || !newUser.email || newUser.password.length < 8}>
                Cadastrar
              </Button>
            ) : (
              <Button onClick={() => setCreating(false)}>Concluir</Button>
            )}
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Importação em lote */}
      <Dialog
        open={importing}
        onOpenChange={(o) => {
          setImporting(o)
          if (!o) {
            setCsv('')
            setImportResults(null)
          }
        }}
      >
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle>Importar usuários em lote</DialogTitle>
            <DialogDescription>
              Uma linha por usuário: <code>nome, email, departamento, unidade, cargo, papel</code>. Só nome e e-mail são
              obrigatórios; papel padrão é colaborador. Senha é gerada automaticamente para cada um.
            </DialogDescription>
          </DialogHeader>

          {!importResults ? (
            <div className="grid gap-3">
              <Textarea
                value={csv}
                onChange={(e) => setCsv(e.target.value)}
                rows={10}
                placeholder={'Maria Silva, maria@empresa.com, RH, Matriz, Analista, colaborador\nJoão Souza, joao@empresa.com, TI'}
                className="font-mono text-xs"
              />
            </div>
          ) : (
            <div className="grid gap-2">
              <div className="flex items-center justify-between">
                <p className="text-sm text-muted-foreground">
                  {importResults.filter((r) => r.ok).length} de {importResults.length} cadastrados.
                </p>
                <Button
                  size="sm"
                  variant="outline"
                  className="gap-1.5"
                  onClick={() =>
                    copyText(
                      importResults
                        .filter((r) => r.ok)
                        .map((r) => `${r.email}\t${r.password}`)
                        .join('\n'),
                    )
                  }
                >
                  <Copy className="size-3.5" /> Copiar e-mails e senhas
                </Button>
              </div>
              <div className="max-h-72 overflow-y-auto rounded-md border border-border">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>E-mail</TableHead>
                      <TableHead>Senha</TableHead>
                      <TableHead>Status</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {importResults.map((r, i) => (
                      <TableRow key={i}>
                        <TableCell>{r.email}</TableCell>
                        <TableCell className="font-mono text-xs">{r.password ?? '—'}</TableCell>
                        <TableCell>
                          {r.ok ? <Badge variant="success">OK</Badge> : <Badge variant="destructive">{r.error}</Badge>}
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>
            </div>
          )}

          <DialogFooter>
            {!importResults ? (
              <Button onClick={handleImport} disabled={!csv.trim()}>
                Importar
              </Button>
            ) : (
              <Button onClick={() => setImporting(false)}>Concluir</Button>
            )}
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Editar usuário */}
      <Dialog open={!!editing} onOpenChange={(o) => !o && setEditing(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Editar usuário</DialogTitle>
          </DialogHeader>
          {editing && (
            <div className="grid gap-3">
              <div className="grid gap-1.5">
                <Label>Nome completo</Label>
                <Input value={editing.full_name} onChange={(e) => setEditing({ ...editing, full_name: e.target.value })} />
              </div>
              <div className="grid gap-1.5">
                <Label>E-mail</Label>
                <Input value={editing.email} disabled />
                <p className="text-xs text-muted-foreground">E-mail de login não pode ser trocado por aqui.</p>
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div className="grid gap-1.5">
                  <Label>Departamento</Label>
                  <Input
                    value={editing.department ?? ''}
                    onChange={(e) => setEditing({ ...editing, department: e.target.value })}
                  />
                </div>
                <div className="grid gap-1.5">
                  <Label>Cargo</Label>
                  <Input
                    value={editing.job_title ?? ''}
                    onChange={(e) => setEditing({ ...editing, job_title: e.target.value })}
                  />
                </div>
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div className="grid gap-1.5">
                  <Label>Unidade</Label>
                  <Input value={editing.unit ?? ''} onChange={(e) => setEditing({ ...editing, unit: e.target.value })} />
                </div>
                <div className="grid gap-1.5">
                  <Label>Telefone</Label>
                  <Input value={editing.phone ?? ''} onChange={(e) => setEditing({ ...editing, phone: e.target.value })} />
                </div>
              </div>
              <div className="grid gap-1.5">
                <Label>Papel</Label>
                <Select
                  value={editing.role}
                  onValueChange={(v) => setEditing({ ...editing, role: v as AppRole })}
                  disabled={editing.id === user?.id}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="colaborador">Colaborador</SelectItem>
                    <SelectItem value="comissao">Comissão</SelectItem>
                    <SelectItem value="admin">Administrador</SelectItem>
                  </SelectContent>
                </Select>
                {editing.id === user?.id && (
                  <p className="text-xs text-muted-foreground">Você não pode alterar seu próprio papel.</p>
                )}
              </div>
            </div>
          )}
          <DialogFooter>
            <Button onClick={handleSaveEdit} disabled={!editing?.full_name}>
              Salvar
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </AppShell>
  )
}
