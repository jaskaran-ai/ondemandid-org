# Supabase PostgreSQL setup

Production uses **Supabase Postgres** via `DATABASE_URL` and Drizzle ORM. SQLite remains for local-only development.

## Linked project (MCP)

| Field | Value |
|-------|--------|
| Name | `ondemandid` |
| Project ref | `eestgozsmtjhegixwgac` |
| Region | `us-east-1` |
| API URL | `https://eestgozsmtjhegixwgac.supabase.co` |
| Status | ACTIVE_HEALTHY |
| Tables | `customers`, `ondemand_requests` (migration `initial_ivalt_ondemand_schema`) |

## 1. Create the Supabase project

1. [Supabase Dashboard](https://supabase.com/dashboard) → **New project**.
2. Save the database password.

## 2. Connection string (use transaction pooler)

**Project Settings → Database → Connection string → URI → Transaction pooler** (port **6543**).

Set in `.env`:

```bash
DB_TYPE=postgres
DATABASE_URL=postgresql://postgres.[project-ref]:[YOUR-PASSWORD]@aws-0-[region].pooler.supabase.com:6543/postgres
```

Legacy `DB_TYPE=neon` or `supabase` still works; prefer `postgres`.

The app uses `postgres-js` with `prepare: false` and `max: 1` for serverless (Vercel).

## 3. Push schema

```bash
export $(grep -v '^#' .env | xargs)   # or use dotenv
DB_TYPE=postgres pnpm db:push
```

Optional seed (Postgres):

```bash
DB_TYPE=postgres pnpm db:seed
```

## 4. Migrate data from Neon (optional)

```bash
pg_dump "$NEON_DATABASE_URL" --no-owner --no-acl -f neon-backup.sql
psql "$SUPABASE_DATABASE_URL" -f neon-backup.sql
```

Use the **direct** connection (port 5432) for `psql` if the pooler rejects DDL.

## 5. Vercel environment variables

Link the repo (once):

```bash
npx vercel link
```

Set production (and preview if needed):

```bash
npx vercel env add DB_TYPE production
# Enter: postgres

npx vercel env add DATABASE_URL production
# Paste Supabase transaction pooler URI (6543)
```

Redeploy after updating env vars.

## 6. Local development options

| Mode | Config |
|------|--------|
| Local SQLite | `DB_TYPE=sqlite`, `SQLITE_DB_PATH=./local.db` |
| Local → Supabase | `DB_TYPE=postgres` + `DATABASE_URL` (same as production) |

If `DB_TYPE=postgres` but `DATABASE_URL` is missing, the app **falls back to SQLite** with a console warning.
