# AZVFIT — AZVD em Equilíbrio

> Corpo saudável. Mente saudável. Pessoas mais felizes.

Aplicativo corporativo de saúde, qualidade de vida e gamificação. Reconstruído do zero (TanStack Start + Supabase próprio), sem nenhum vínculo com ferramentas de terceiros.

## Stack

- **TanStack Start v1** (React 19 + Vite) — SSR + roteamento por arquivos em `src/routes/`
- **TanStack Query** — estado de servidor
- **Supabase** (Postgres + Auth) — projeto dedicado, ver `supabase/migrations/`
- **Google Drive** (evidências) — nenhum arquivo fica no Supabase; upload vai direto para a pasta "AZVFIT - IA" no Drive, em uma subpasta por colaborador
- **Tailwind CSS v4** (`src/styles.css`, tokens semânticos AZVFIT) + componentes estilo shadcn/ui em `src/components/ui/`
- **recharts**, **qrcode**, **date-fns**, **zod** + **react-hook-form**, **sonner**

## Rodando localmente

```bash
npm install
cp .env.example .env   # preencha VITE_SUPABASE_URL e VITE_SUPABASE_PUBLISHABLE_KEY
npm run dev
```

## Banco de dados

Todo o schema (enums, tabelas, RLS, funções de segurança e o motor de pontuação) vive em `supabase/migrations/`, aplicado via Supabase MCP/CLI. O projeto Supabase é próprio do AZVFIT — nada é compartilhado com outros sistemas.

Documentação completa da arquitetura, regras de negócio e histórico de decisões: ver o material técnico entregue junto com este repositório.

## Evidências no Google Drive

Todo upload de foto/print (registro de atividade, missão, check-in TotalPass) vai direto do navegador para uma
server function (`src/server/drive.ts`) que envia o arquivo para o Google Drive — nenhum byte passa pelo Supabase.
O Postgres guarda só o ponteiro (`evidences.drive_file_id` / `drive_view_url`), necessário para a fila de
validação, auditoria e a detecção de evidência reutilizada (hash SHA-256).

Isso exige uma **Service Account do Google Cloud** com acesso de escrita à pasta do Drive. Passo a passo:

1. Em [console.cloud.google.com](https://console.cloud.google.com), crie (ou reutilize) um projeto.
2. Ative a **Google Drive API** (menu "APIs e serviços" → "Ativar APIs e serviços").
3. Em "Credenciais" → "Criar credenciais" → "Conta de serviço". Dê um nome (ex.: `azvfit-drive`) e conclua.
4. Abra a conta de serviço criada → aba "Chaves" → "Adicionar chave" → "Criar nova chave" → tipo **JSON**. Isso baixa um arquivo `.json`.
5. No Google Drive, abra a pasta **"AZVFIT - IA"** e compartilhe com o e-mail da conta de serviço
   (campo `client_email` do JSON, algo como `azvfit-drive@SEU-PROJETO.iam.gserviceaccount.com`) como **Editor**.
6. No `.env` (ou nas variáveis de ambiente do deploy), preencha a partir do JSON:
   - `GOOGLE_DRIVE_CLIENT_EMAIL` = campo `client_email`
   - `GOOGLE_DRIVE_PRIVATE_KEY` = campo `private_key` (mantenha as quebras de linha ou use `\n` — o código aceita os dois formatos)
   - `GOOGLE_DRIVE_ROOT_FOLDER_ID` = id da pasta "AZVFIT - IA" (já preenchido em `.env.example`)

Sem essas variáveis, o upload falha com uma mensagem clara pedindo a configuração — o resto do app funciona normalmente.

## Build

```bash
npm run build
npm run preview
```

## Qualidade

```bash
npm run lint
npm run format
npm run check
```
