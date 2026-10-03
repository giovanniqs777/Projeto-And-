# Controle de Rebanho — Gabriel Back

App Next.js (App Router) para cadastro de animais, produção de leite, reprodução e saúde do rebanho.

Stack:

- **Next.js 16** (App Router, Route Handlers) — deploy na **Vercel**
- **Supabase Postgres** via [Drizzle ORM](https://orm.drizzle.team/) (`drizzle-orm/postgres-js`)
- **Supabase Storage** para as fotos dos animais (bucket privado, servido via `/api/photos/[id]`)

> Este projeto já foi hospedado em Cloudflare Workers (D1 + R2 + Wrangler + vinext). Essa camada foi
> removida: o app agora é um Next.js padrão, sem dependência de Cloudflare.

## Pré-requisitos

- Node.js `>=22.13.0`
- Uma conta e um projeto no [Supabase](https://supabase.com)
- `pnpm` (ou `npm`/`corepack`)

## Configuração

1. Copie `.env.example` para `.env.local` e preencha:
   - `DATABASE_URL`: connection string do Supabase (Settings → Database → Connection string). Use a
     **Transaction pooler** (porta `6543`) — é a que funciona em ambientes serverless como a Vercel.
   - `SUPABASE_URL` e `SUPABASE_SERVICE_ROLE_KEY`: Settings → API. A service role key é secreta,
     nunca a exponha no cliente.
   - `SUPABASE_STORAGE_BUCKET`: nome do bucket privado para as fotos (padrão `herd-photos`).

2. Crie o bucket de fotos no Supabase (Storage → New bucket), **privado** (sem acesso público), com
   o mesmo nome configurado em `SUPABASE_STORAGE_BUCKET`.

3. Aplique o schema no banco:

   ```sh
   pnpm install
   pnpm db:push      # cria/atualiza as tabelas `cows` e `events` a partir de db/schema.ts
   ```

   (Alternativamente: `pnpm db:generate` gera SQL de migração em `drizzle/`, e `pnpm db:migrate`
   aplica as migrations geradas — use esse fluxo se preferir versionar o SQL.)

4. Rode o app:

   ```sh
   pnpm dev
   ```

   Acesse `http://localhost:3000`.

## Deploy na Vercel

1. Suba o repositório no GitHub/GitLab/Bitbucket e importe o projeto na Vercel (ou use `vercel`/`vercel --prod`
   via CLI).
2. Configure as mesmas variáveis de ambiente (`DATABASE_URL`, `SUPABASE_URL`, `SUPABASE_SERVICE_ROLE_KEY`,
   `SUPABASE_STORAGE_BUCKET`) em Project Settings → Environment Variables.
3. Garanta que `DATABASE_URL` usa a connection string com **pooler** (porta `6543`), pois funções
   serverless abrem muitas conexões curtas — a conexão direta (porta `5432`) esgota o limite do Postgres.
4. Deploy. Next.js é detectado automaticamente pela Vercel; não é necessário configurar build command.

## Estrutura

- `app/page.tsx` — UI principal (client component)
- `app/api/herd/route.ts` — CRUD de animais e eventos (produção, inseminação, ultrassom, etc.)
- `app/api/photos/route.ts` e `app/api/photos/[id]/route.ts` — upload/download de fotos via Supabase
  Storage (as fotos não são servidas direto do Storage: passam por esta rota para manter o bucket
  privado)
- `db/schema.ts` — schema Drizzle (Postgres) das tabelas `cows` e `events`
- `db/index.ts` — client Drizzle/postgres.js (lê `DATABASE_URL`)
- `lib/herd-db.ts` — helpers compartilhados pelas rotas (acesso ao banco, tratamento de erro, checagem
  de origem)
- `lib/storage.ts` — client do Supabase Storage

## Scripts

- `pnpm dev` / `pnpm build` / `pnpm start` — padrão Next.js
- `pnpm db:generate` — gera SQL de migração a partir de `db/schema.ts`
- `pnpm db:push` — aplica o schema diretamente no banco (sem gerar arquivo de migração)
- `pnpm db:migrate` — aplica as migrations geradas em `drizzle/`
