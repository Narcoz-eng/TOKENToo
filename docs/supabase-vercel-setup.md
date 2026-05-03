# VaultX Supabase + Vercel Setup

## Supabase project

Project name: `phewrun2`

Supabase URL:

```env
SUPABASE_URL="https://etmrgphkomagszfezsxf.supabase.co"
NEXT_PUBLIC_SUPABASE_URL="https://etmrgphkomagszfezsxf.supabase.co"
```

## Mode 1: Vercel Supabase integration

Use this mode on Vercel. Do not manually look up the database password. The Vercel Supabase integration provides these variables:

```env
POSTGRES_URL=
POSTGRES_PRISMA_URL=
POSTGRES_URL_NON_POOLING=
POSTGRES_USER=
POSTGRES_HOST=
POSTGRES_PASSWORD=
POSTGRES_DATABASE=
SUPABASE_URL=
SUPABASE_ANON_KEY=
SUPABASE_SERVICE_ROLE_KEY=
NEXT_PUBLIC_SUPABASE_URL=
NEXT_PUBLIC_SUPABASE_ANON_KEY=
```

VaultX maps them this way:

```env
DATABASE_URL = POSTGRES_PRISMA_URL
DIRECT_URL = POSTGRES_URL_NON_POOLING
```

Implementation details:
- Runtime Prisma uses `DATABASE_URL`, then `POSTGRES_PRISMA_URL`, then `POSTGRES_URL`.
- Prisma migrations use `DIRECT_URL`, then `POSTGRES_URL_NON_POOLING`, then the runtime URL.
- `NEXT_PUBLIC_SUPABASE_ANON_KEY` is the preferred browser public key name. `NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY` remains supported as an alias in env templates.

Set these app-specific values in Vercel:

```env
NEXT_PUBLIC_API_BASE_URL="/api"
NEXT_PUBLIC_APP_URL="https://your-vercel-domain"
FRONTEND_ORIGIN="https://your-vercel-domain"
NODE_ENV=production
GENERATOR_SEED_SALT="<random-secret>"
GENERATOR_DEFAULT_PRESET="mystic-pixel-cult"
DESIGN_MODEL_PROVIDER=mock
ASSET_STORAGE_PROVIDER=supabase
```

## Mode 2: Manual Supabase mode

Use this only outside Vercel integration or for local development with manually copied credentials:

```env
DATABASE_URL="postgresql://postgres.etmrgphkomagszfezsxf:[YOUR-PASSWORD]@aws-0-eu-west-1.pooler.supabase.com:6543/postgres?pgbouncer=true&connection_limit=1"
DIRECT_URL="postgresql://postgres.etmrgphkomagszfezsxf:[YOUR-PASSWORD]@aws-0-eu-west-1.pooler.supabase.com:5432/postgres"
SUPABASE_URL="https://etmrgphkomagszfezsxf.supabase.co"
SUPABASE_ANON_KEY="sb_publishable_CBv8Gmyx9g3Lrl9LLk_6vg_G6Qg6KPV"
NEXT_PUBLIC_SUPABASE_URL="https://etmrgphkomagszfezsxf.supabase.co"
NEXT_PUBLIC_SUPABASE_ANON_KEY="sb_publishable_CBv8Gmyx9g3Lrl9LLk_6vg_G6Qg6KPV"
SUPABASE_SERVICE_ROLE_KEY="..."
```

## Prisma 7 note

This repo uses Prisma 7. Connection URLs live in `backend/prisma.config.ts` and runtime code, not in `backend/prisma/schema.prisma`. Do not add `url` or `directUrl` to the schema file; Prisma 7 rejects those fields.

## Deploy schema

Run after Vercel/Supabase env vars are available locally or in CI:

```powershell
npm run db:generate
npm run db:migrate:deploy
npm run db:verify:generator
```

The baseline migration is in `backend/prisma/migrations/20260503120000_init/migration.sql`.

## Create preview storage bucket

Run `supabase/storage.sql` in the Supabase SQL editor. It creates the public `generator-previews` bucket used by the backend when `ASSET_STORAGE_PROVIDER=supabase`.

## Local development

With standalone Nest backend:

```env
NEXT_PUBLIC_API_BASE_URL="http://localhost:4000"
NEXT_PUBLIC_APP_URL="http://localhost:3000"
FRONTEND_ORIGIN="http://localhost:3000"
```

