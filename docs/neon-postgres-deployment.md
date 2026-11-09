# LeadScout PostgreSQL deployment — Neon

## Project

- Neon project: `bitter-breeze-79499355` (`leadscout-production`)
- Region: `aws-eu-central-1` (Frankfurt)
- PostgreSQL: 17
- Primary branch: `production`
- Database: `leadscout`
- Existing Express JWT/Prisma stack is unchanged; Neon Auth and Data API are **not** enabled.

The original Supabase instance is preserved, but its old GitHub database-deploy
workflow is retired. No existing application deployment switches database
automatically when this PR is merged.

## Database URLs

Use Neon **direct, non-pooled** connection for Prisma migrations. Use a
pooled connection for a serverless or bursty Express runtime if required.
Do not embed passwords in committed files or frontend `VITE_*` variables.

GitHub environment:
- name: `leadscout-neon-database`
- deployment branch protection: `main` only
- environment secret: `LEADSCOUT_NEON_DIRECT_URL` (full direct PostgreSQL URL
  from Neon, **not** a `-pooler` hostname; database `leadscout`)

After merge, manually dispatch `.github/workflows/neon-prisma-bootstrap.yml`
on `main`, input `DEPLOY`. The job validates the target Neon hostname and
database, authenticates with `psql`, applies the canonical Prisma migration
chain with `prisma migrate deploy`, checks Prisma's ledger, then verifies RLS.

Never apply the existing Prisma SQL chain through Neon MCP SQL calls or Supabase
migrations: that would bypass Prisma's canonical `_prisma_migrations` ledger.

## Historical migration adjustment

The earlier migration `20261109233000_supabase_data_api_isolation` assumed that
Postgres has `anon` and `authenticated` roles, which is true for Supabase
but false for Neon. Its role-specific grants are now conditional, while RLS
is enabled on all 77 mapped model tables plus the Prisma migration ledger.

**Migration checksum warning**: altering a previously committed Prisma migration
is normally prohibited. This change is valid only because the original
Supabase database was verified to have no application tables and this
migration has not been applied to any managed LeadScout database. If another
environment has already applied that migration, do not run the modified
migration history there; reconcile that environment separately.

## Validation / rollout gates

1. Both jobs in `prisma-clean-start.yml` must pass: generic PostgreSQL 17
   without Supabase roles; PostgreSQL 17 with Supabase-style roles and
   unrelated public objects.
2. Merge only after the PR code checks pass.
3. Set the dedicated GitHub environment and secret before dispatching the
   manual migration workflow. Never put database credentials in PR text.
4. On successful workflow completion, inspect the Neon table inventory and
   `_prisma_migrations` results read-only.
5. Set separate runtime `DATABASE_URL` only when deploying the Express API.
   Frontend static hosting, DNS, production traffic and database credentials
   are separate deployment tasks.
6. Do not run `prisma db push`, `prisma migrate dev` or seed against production.

## Security

- Database access is server-only. The React browser never receives a database URL.
- Table owners bypass RLS by default; Express remains responsible for scoped
  authorization, JWT validation, tenant isolation and query filtering.
- All schema objects are scoped to the existing Prisma-managed objects.
- If the application needs a least-privilege runtime role, provision and test
  its grants separately rather than granting the owner password to the frontend.
