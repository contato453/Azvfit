import { createServerFn } from '@tanstack/react-start'

/**
 * Upload de evidências direto para o Google Drive — nenhum byte de arquivo
 * fica no Supabase. Autentica como Service Account via JWT assinado com
 * Web Crypto (sem o pacote `googleapis`, que é pesado e não roda bem em
 * runtimes de Worker/edge — foi exatamente isso que quebrou a integração
 * com Drive na versão anterior do sistema).
 *
 * Variáveis de ambiente exigidas (definidas só no servidor, nunca com
 * prefixo VITE_):
 *   GOOGLE_DRIVE_CLIENT_EMAIL   — client_email da Service Account
 *   GOOGLE_DRIVE_PRIVATE_KEY    — private_key da Service Account (PEM)
 *   GOOGLE_DRIVE_ROOT_FOLDER_ID — id da pasta "AZVFIT - IA" (compartilhada
 *                                 com a Service Account como Editor)
 */

const DRIVE_SCOPE = 'https://www.googleapis.com/auth/drive'
const TOKEN_URL = 'https://oauth2.googleapis.com/token'
const DRIVE_API = 'https://www.googleapis.com/drive/v3/files'
const DRIVE_UPLOAD_API = 'https://www.googleapis.com/upload/drive/v3/files'

function base64url(input: ArrayBuffer | string): string {
  const bytes = typeof input === 'string' ? new TextEncoder().encode(input) : new Uint8Array(input)
  let binary = ''
  for (const b of bytes) binary += String.fromCharCode(b)
  return btoa(binary).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '')
}

async function importPrivateKey(pem: string): Promise<CryptoKey> {
  const normalized = pem.includes('\\n') ? pem.replace(/\\n/g, '\n') : pem
  const der = normalized
    .replace('-----BEGIN PRIVATE KEY-----', '')
    .replace('-----END PRIVATE KEY-----', '')
    .replace(/\s/g, '')
  const raw = atob(der)
  const bytes = new Uint8Array(raw.length)
  for (let i = 0; i < raw.length; i++) bytes[i] = raw.charCodeAt(i)
  return crypto.subtle.importKey('pkcs8', bytes.buffer, { name: 'RSASSA-PKCS1-v1_5', hash: 'SHA-256' }, false, [
    'sign',
  ])
}

async function getAccessToken(): Promise<string> {
  const clientEmail = process.env.GOOGLE_DRIVE_CLIENT_EMAIL
  const privateKey = process.env.GOOGLE_DRIVE_PRIVATE_KEY
  if (!clientEmail || !privateKey) {
    throw new Error(
      'Integração com o Google Drive não configurada: defina GOOGLE_DRIVE_CLIENT_EMAIL e GOOGLE_DRIVE_PRIVATE_KEY no servidor.',
    )
  }

  const now = Math.floor(Date.now() / 1000)
  const header = base64url(JSON.stringify({ alg: 'RS256', typ: 'JWT' }))
  const claims = base64url(
    JSON.stringify({
      iss: clientEmail,
      scope: DRIVE_SCOPE,
      aud: TOKEN_URL,
      iat: now,
      exp: now + 3600,
    }),
  )
  const unsigned = `${header}.${claims}`

  const key = await importPrivateKey(privateKey)
  const signature = await crypto.subtle.sign('RSASSA-PKCS1-v1_5', key, new TextEncoder().encode(unsigned))
  const jwt = `${unsigned}.${base64url(signature)}`

  const res = await fetch(TOKEN_URL, {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body: new URLSearchParams({
      grant_type: 'urn:ietf:params:oauth:grant-type:jwt-bearer',
      assertion: jwt,
    }),
  })

  if (!res.ok) {
    throw new Error(`Falha ao autenticar com o Google Drive (${res.status}): ${await res.text()}`)
  }
  const json = (await res.json()) as { access_token: string }
  return json.access_token
}

function sanitizeFolderName(name: string): string {
  return name.trim().replace(/[\\/]/g, '-').slice(0, 120) || 'colaborador'
}

async function ensureUserFolder(accessToken: string, rootFolderId: string, userId: string, userName: string) {
  const folderName = sanitizeFolderName(`${userName} — ${userId.slice(0, 8)}`)
  const query = encodeURIComponent(
    `'${rootFolderId}' in parents and name = '${folderName.replace(/'/g, "\\'")}' and mimeType = 'application/vnd.google-apps.folder' and trashed = false`,
  )
  const searchRes = await fetch(`${DRIVE_API}?q=${query}&fields=files(id,name)`, {
    headers: { Authorization: `Bearer ${accessToken}` },
  })
  if (!searchRes.ok) throw new Error(`Falha ao buscar pasta no Drive: ${await searchRes.text()}`)
  const searchJson = (await searchRes.json()) as { files: { id: string }[] }
  if (searchJson.files?.length) return searchJson.files[0].id

  const createRes = await fetch(`${DRIVE_API}?fields=id`, {
    method: 'POST',
    headers: { Authorization: `Bearer ${accessToken}`, 'Content-Type': 'application/json' },
    body: JSON.stringify({ name: folderName, mimeType: 'application/vnd.google-apps.folder', parents: [rootFolderId] }),
  })
  if (!createRes.ok) throw new Error(`Falha ao criar pasta no Drive: ${await createRes.text()}`)
  const createJson = (await createRes.json()) as { id: string }
  return createJson.id
}

export const uploadEvidenceToDrive = createServerFn({ method: 'POST' })
  .validator((data: FormData) => data)
  .handler(async ({ data }) => {
    const file = data.get('file')
    const userId = data.get('userId')
    const userName = data.get('userName')

    if (!(file instanceof File) || typeof userId !== 'string' || typeof userName !== 'string') {
      throw new Error('Requisição de upload inválida.')
    }

    const rootFolderId = process.env.GOOGLE_DRIVE_ROOT_FOLDER_ID
    if (!rootFolderId) {
      throw new Error('Integração com o Google Drive não configurada: defina GOOGLE_DRIVE_ROOT_FOLDER_ID no servidor.')
    }

    const accessToken = await getAccessToken()
    const folderId = await ensureUserFolder(accessToken, rootFolderId, userId, userName)

    const metadata = {
      name: `${Date.now()}_${file.name}`,
      parents: [folderId],
    }
    const boundary = `azvfit-${crypto.randomUUID()}`
    const fileBuffer = await file.arrayBuffer()

    const encoder = new TextEncoder()
    const preamble = encoder.encode(
      `--${boundary}\r\nContent-Type: application/json; charset=UTF-8\r\n\r\n${JSON.stringify(metadata)}\r\n` +
        `--${boundary}\r\nContent-Type: ${file.type || 'application/octet-stream'}\r\n\r\n`,
    )
    const closing = encoder.encode(`\r\n--${boundary}--`)
    const body = new Blob([preamble, fileBuffer, closing])

    const uploadRes = await fetch(`${DRIVE_UPLOAD_API}?uploadType=multipart&fields=id,webViewLink`, {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${accessToken}`,
        'Content-Type': `multipart/related; boundary=${boundary}`,
      },
      body,
    })

    if (!uploadRes.ok) {
      throw new Error(`Falha ao enviar o arquivo para o Drive: ${await uploadRes.text()}`)
    }

    const result = (await uploadRes.json()) as { id: string; webViewLink: string }
    return result
  })
