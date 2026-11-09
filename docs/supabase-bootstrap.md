# Supabase bootstrap — LeadScout dedicated deployment

Target: a **dedicated**, empty Supabase PostgreSQL project. Do not reuse the Krunditark or EventNexus database.

## Architecture and scope

- The existing Express backend and Prisma client connect to Supabase PostgreSQL.
- Browser clients still authenticate against Express with the existing HttpOnly JWT session. **Do not expose** a privileged Supabase key or DATABASE_URL to Cloudflare Pages.
- The Supabase URL is **not** the Express API base URL. Hosting the API and its background workers remains a separate deployment step.
- Deployment of this PR does **not** configure a frontend, email sending, seed users, or run migrations automatically.

## Canonical migration procedure

The repository contains 28 Prisma migrations predating the Supabase isolation migration.
They contain enum changes and legacy-data backfills. Preserve the order and use
`prisma migrate deploy`; do **not** apply them through Supabase's separate
migration-history service or substitute `prisma db push`.

1. Create the GitHub Actions environment `leadscout-database`; configure required reviewers if desired.
2. Add the environment secret `LEADSCOUT_SUPABASE_DIRECT_URL` containing the **direct or session-pooled PostgreSQL connection string**, including the DB password and SSL configuration. Do not use the public Supabase REST URL or an HTTP API key.
3. Restrict the environment to trusted branches, and merge this PR **after review/CI**.
4. Run **LeadScout Supabase Prisma bootstrap** manually on `main`, typing `DEPLOY`.
5. Check that `prisma migrate status` is clean and the final DB privilege check passes.
6. Verify the expected app tables exist and there are no unexpected grants to `anon` or `authenticated`.
7. Configure a **separate** runtime database URL for Express. Use appropriate Supabase connection pooling for the hosting model; use direct/session mode for migrations.
8. Configure `JWT_SECRET`, `SETTINGS_ENCRYPTION_KEY`, `CORS_ORIGIN`, `BASE_URL`, and service credentials in the **backend** secret store, never in browser environment variables.
9. Seed an administrator only with an explicitly supplied strong secret and immediately test login. Never publish the example password from the README.

## Security model

The app's own JWT and Prisma authorization do **not** map to Supabase `auth.uid()`.
The final Prisma migration revokes data privileges on named Prisma-managed\ntables and enables RLS without public policies. It also revokes privileges on\nsequences attached to those tables. It does not alter global schema rights,\nunrelated objects, or database default privileges. Future Prisma model tables\nmust be added to the isolation migration/checks by a new migration.

The app must continue to enforce authorization at the Express route/service
layer. DB grants protect against accidental Data API exposure, but they do not
replace row-level authorization in Prisma. Do not point a public browser at
PostgREST tables.

### Verify manually

```sql
select
  count(*) filter (where has_table_privilege('anon', c.oid, 'SELECT')) as anon_readable,
  count(*) filter (where has_table_privilege('authenticated', c.oid, 'SELECT')) as authenticated_readable
from pg_class c
join pg_namespace n on n.oid = c.relnamespace
where n.nspname = 'public' and c.relkind in ('r', 'p');
```

Both counts must be zero. Run `psql -v ON_ERROR_STOP=1 -f scripts/db/verify-leadscout-isolation.sql` to verify all mapped Prisma tables and RLS. The PostgreSQL 17 clean-start CI also checks that unrelated `public` objects are unchanged. Inspect the Supabase Security Advisor before exposing an endpoint.

## Rollout and recovery

- Do not run this workflow against a database that already contains application tables unless its Prisma migration history was reconciled and backed up.
- The job uses GitHub Actions concurrency and confirmation, but the DB itself must not be targeted by other migration runners concurrently.
- Before later schema upgrades, take a tested DB backup/restore point.
- Prisma migrations may be non-reversible. On failure, diagnose the failed migration and use Prisma's documented recovery workflow; do not blindly rerun raw SQL.
- Production outreach stays disabled pending consent/legal basis, approved sending provider, and dedicated sender configuration.

## Smoke checklist

- Prisma migration status and table counts
- Data API role access is denied
- Express DB connection and authenticated login
- Create/read/update lead and duplicate prevention
- AI discovery with API budget and evidence checks
- No email sends to external prospects during initial infrastructure smoke
