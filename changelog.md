# Changelog

## API performance & reliability (2026-10-06)

- **iVALT client**: `AbortSignal.timeout` via `IVALT_FETCH_TIMEOUT_MS` (default 15s).
- **Poll throttle**: `IVALT_POLL_MIN_INTERVAL_MS` (default 2.5s) on `/api/status/[id]` and admin login-status to cut duplicate iVALT calls.
- **Client polling**: Verification and admin login poll interval 2s → 3s.
- **Admin dashboard stats**: One aggregated query per table (3 DB round-trips total) instead of 9 sequential counts; portable `CASE` counts (Postgres + SQLite).
- **Admin lists**: Customers and requests use SQL `WHERE` + `LIMIT`/`OFFSET` + `count()` instead of loading full tables.
- **Email**: HTML templates cached in memory after first read.
- **Status API**: Verbose logs gated behind `DEBUG_MODE` or development.

## Admin allowlist (env)

- **`AUTHORIZED_ADMIN_NUMBERS`**: Comma-separated `+<country>:<mobile>` in env (`lib/admin/authorized-admins.ts`).
