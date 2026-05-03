# VaultX Supabase + Vercel Setup

## Supabase project

Project name: `phewrun2`

Set these values in `.env` locally and in Vercel Project Settings:

```env
DATABASE_URL="postgresql://postgres.etmrgphkomagszfezsxf:[YOUR-PASSWORD]@aws-0-eu-west-1.pooler.supabase.com:6543/postgres?pgbouncer=true&connection_limit=1"
DIRECT_URL="postgresql://postgres.etmrgphkomagszfezsxf:[YOUR-PASSWORD]@aws-0-eu-west-1.pooler.supabase.com:5432/postgres"
SUPABASE_URL="https://etmrgphkomagszfezsxf.supabase.co"
SUPABASE_ANON_KEY="sb_publishable_CBv8Gmyx9g3Lrl9LLk_6vg_G6Qg6KPV"
SUPABASE_SERVICE_ROLE_KEY="..."
NEXT_PUBLIC_SUPABASE_URL="https://etmrgphkomagszfezsxf.supabase.co"
NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY="sb_publishable_CBv8Gmyx9g3Lrl9LLk_6vg_G6Qg6KPV"
ASSET_STORAGE_PROVIDER="supabase"
```

`DATABASE_URL` is for runtime/serverless connection pooling. `DIRECT_URL` is for Prisma migration commands. Replace `[YOUR-PASSWORD]` with the database password from Supabase.

This repo uses Prisma 7, so connection URLs live in `backend/prisma.config.ts` and environment variables. Do not add `url` or `directUrl` to `backend/prisma/schema.prisma`; Prisma 7 rejects those fields in schema files.

## Deploy schema

```powershell
npm run db:generate
npm run db:migrate:deploy
npm run db:verify:generator
```

The baseline migration is in `backend/prisma/migrations/20260503120000_init/migration.sql`.

## Create preview storage bucket

Run `supabase/storage.sql` in the Supabase SQL editor. It creates the public `generator-previews` bucket used by the backend when `ASSET_STORAGE_PROVIDER=supabase`.

## Vercel

The root `vercel.json` builds both workspaces and exposes the Nest API through `api/[...path].ts`.

Use:

```env
NEXT_PUBLIC_API_BASE_URL="/api"
NEXT_PUBLIC_APP_URL="https://your-vercel-domain"
FRONTEND_ORIGIN="https://your-vercel-domain"
```

For local development with the standalone Nest server:

```env
NEXT_PUBLIC_API_BASE_URL="http://localhost:4000"
FRONTEND_ORIGIN="http://localhost:3000"
```
