# LeadScout Express runtime on Neon

The Neon project `bitter-breeze-79499355`, branch `production`, database
`leadscout` has all 29 tracked Prisma migrations deployed. Runtime deployment
is separate from schema deployment.

## Required before public traffic

- Deploy the existing Express entry point with Node.js 22 using
  `npm ci && npm run prisma:generate && npm run build` and
  `npm start`. The `start` script serves both `dist/` and `/api`
  from the same origin, preserving HttpOnly SameSite=Strict cookie auth.
- Provision a **runtime-only** secret `DATABASE_URL` with Neon pooled
  PostgreSQL connection, appropriate for your service's lifetime and
  concurrency. Never use a browser-exposed `VITE_*` variable. Keep the direct
  URL reserved for manual schema migrations.
- Set `NODE_ENV=production`, `JWT_SECRET` (long random value),
  `SETTINGS_ENCRYPTION_KEY` (long random value), `BASE_URL` and
  `CORS_ORIGIN` to the **actual HTTPS origin** used by the service,
  `ALLOW_PUBLIC_REGISTRATION=false`, and `TRUST_PROXY` to the number of
  trusted reverse-proxy hops, not an arbitrary true value.
- Provision durable file storage or confirm `/uploads` persistence before
  enabling logo/file uploads. The current implementation uses local disk.
- Do **not** run `npm run setup` or `npm run db:seed` in production:
  the tracked seed script installs known demo data and a fallback default
  administrator credential.

## Health and smoke

- `GET /api/health` — process liveness only; no database guarantee.
- `GET /api/ready` — executes a real read-only Prisma query against Neon;
  returns HTTP 200 and `{"status":"ready"}` or HTTP 503 with
  `{"status":"unavailable"}`. No credentials or driver errors are exposed.
- Production startup refuses to listen if the initial Neon connection fails.
- After deployment, smoke authentication using a controlled administrator
  bootstrap and test a read/write CRM flow with explicit test records and
  cleanup. Verify backup/restore, request logs and graceful shutdown.
- The registration endpoint creates the first account as ADMIN even with
  `ALLOW_PUBLIC_REGISTRATION=false`; **do not expose a freshly deployed
  instance publicly before the legitimate owner creates this account over a
  restricted access path**. Follow up with an explicit bootstrapping policy
  before general availability.
- The scheduler can send real email if SMTP is configured and work is due.
  Keep outgoing credentials and webhook routes disabled until the email
  integration has been separately smoke-tested.

## Deployment topology

The frontend API client currently uses relative `/api` URLs with
`credentials: "same-origin"`. Host the React bundle and Express API on
the same HTTPS origin or provide a same-origin reverse proxy. Simply moving
the static frontend to a different host without routing `/api` will break
authentication, CRM and AI features.

Changing DNS / Cloudflare Pages / the public domain and switching live user
traffic are independent rollout steps and are not performed by this PR.
