// Cadastro de usuários pelo admin (painel /admin/usuarios).
//
// Criar login de terceiros exige a service role key (auth.admin.createUser),
// que nunca pode ir pro browser — por isso isso roda como Edge Function, não
// como código client. A service role key é injetada automaticamente pelo
// runtime do Supabase (SUPABASE_SERVICE_ROLE_KEY), não precisa configurar nada.
//
// Aceita um usuário só ou um lote (importação em massa), sempre no mesmo
// formato — cada item do array é processado independentemente, então uma
// falha isolada (e-mail duplicado, por exemplo) não derruba o lote inteiro.
import { createClient } from 'jsr:@supabase/supabase-js@2'

const SUPABASE_URL = Deno.env.get('SUPABASE_URL')!
const SERVICE_ROLE_KEY = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
const ANON_KEY = Deno.env.get('SUPABASE_ANON_KEY')!

const CORS_HEADERS = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

const ROLES = new Set(['admin', 'comissao', 'colaborador'])

function json(body: unknown, status = 200) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...CORS_HEADERS, 'Content-Type': 'application/json' },
  })
}

function randomPassword(len = 10) {
  // Sem caracteres ambíguos (0/O, 1/l/I) — vai ser digitada por gente, não só copiada.
  const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZabcdefghijkmnpqrstuvwxyz23456789'
  const bytes = new Uint8Array(len)
  crypto.getRandomValues(bytes)
  return Array.from(bytes, (b) => chars[b % chars.length]).join('')
}

interface IncomingUser {
  email?: string
  full_name?: string
  password?: string
  role?: string
  phone?: string
  department?: string
  unit?: string
  job_title?: string
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: CORS_HEADERS })
  if (req.method !== 'POST') return json({ error: 'Método não suportado.' }, 405)

  // Confere quem está chamando: token válido (verify_jwt já barra token
  // inválido/ausente na borda) + papel admin checado no próprio banco —
  // nunca confiar em nada vindo do client para decidir isso.
  const authHeader = req.headers.get('Authorization') ?? ''
  const callerClient = createClient(SUPABASE_URL, ANON_KEY, {
    global: { headers: { Authorization: authHeader } },
  })
  const { data: isAdmin, error: authErr } = await callerClient.rpc('is_admin')
  if (authErr || !isAdmin) {
    return json({ error: 'Apenas administradores podem cadastrar usuários.' }, 403)
  }

  let body: { users?: IncomingUser[] }
  try {
    body = await req.json()
  } catch {
    return json({ error: 'JSON inválido.' }, 400)
  }

  const users = Array.isArray(body.users) ? body.users : []
  if (users.length === 0) return json({ error: 'Nenhum usuário informado.' }, 400)
  if (users.length > 500) return json({ error: 'Máximo de 500 usuários por importação.' }, 400)

  const adminClient = createClient(SUPABASE_URL, SERVICE_ROLE_KEY)

  const results: Array<{ email: string | null; ok: boolean; error?: string; user_id?: string; password?: string }> = []

  for (const raw of users) {
    const email = String(raw?.email ?? '').trim().toLowerCase()
    const full_name = String(raw?.full_name ?? '').trim()

    if (!email || !email.includes('@')) {
      results.push({ email: email || null, ok: false, error: 'E-mail inválido.' })
      continue
    }
    if (!full_name) {
      results.push({ email, ok: false, error: 'Nome completo é obrigatório.' })
      continue
    }

    const password = raw?.password && String(raw.password).length >= 8 ? String(raw.password) : randomPassword()
    const role = ROLES.has(raw?.role ?? '') ? (raw!.role as string) : 'colaborador'

    const { data, error } = await adminClient.auth.admin.createUser({
      email,
      password,
      email_confirm: true,
      user_metadata: {
        full_name,
        role,
        phone: raw?.phone?.trim() || null,
        department: raw?.department?.trim() || null,
        unit: raw?.unit?.trim() || null,
        job_title: raw?.job_title?.trim() || null,
      },
    })

    if (error) {
      results.push({ email, ok: false, error: error.message })
      continue
    }

    results.push({ email, ok: true, user_id: data.user?.id, password })
  }

  return json({ results })
})
