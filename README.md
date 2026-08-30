# AZVFIT — AZVD em Equilíbrio

> Corpo saudável. Mente saudável. Pessoas mais felizes.

Aplicativo corporativo de saúde, qualidade de vida e gamificação. Reconstruído do zero (TanStack Start + Supabase próprio), sem nenhum vínculo com ferramentas de terceiros.

## Stack

- **TanStack Start v1** (React 19 + Vite) — SSR + roteamento por arquivos em `src/routes/`
- **TanStack Query** — estado de servidor
- **Supabase** (Postgres + Auth + Storage) — projeto dedicado, ver `supabase/migrations/`
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

## Evidências

Todo upload de foto/print (registro de atividade, missão, check-in TotalPass) vai para o bucket privado
`evidences` do Supabase Storage. A comissão acessa via signed URL de curta duração (5 min) — nunca URL pública.

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
