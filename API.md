# LeadScout PRO AI API

## Authentication

Browser clients authenticate with the HttpOnly `unitel_session` cookie created by `POST /api/auth/login`. Cookie-authenticated `POST`, `PUT`, `PATCH`, and `DELETE` requests must include an allowed `Origin` header.

CLI clients may send `X-Auth-Mode: bearer` when logging in and then use the returned token as `Authorization: Bearer <token>`. Public registration never accepts a privileged role; only an authenticated administrator can create administrators or managers through `/api/admin/users`.

## External integrations

Administrators create keys under Settings → API Keys. The raw key is returned once and only its SHA-256 hash is retained.

| Method | Route | Required scope | Purpose |
|---|---|---|---|
| GET | `/api/integrations/leads` | `read` | List leads for an integration |
| POST | `/api/integrations/leads` | `write` | Create or deduplicate a lead |

Send the key as `X-API-Key: lsp_...`. The integration routes also accept `Authorization: Bearer lsp_...` for compatible clients.

## Calendar and public booking

Authenticated calendar routes are mounted at `/api/calendar`. Users can create individual availability slots or bulk-generate validated weekly work hours. Meeting cancellation is restricted to the slot owner, managers, and administrators.

Recipients use `/api/public/booking/:token`. Tokens are random, expiring capabilities. Booking atomically reserves the slot, creates the meeting, consumes the token, notifies the owner, and advances an early-stage lead.

## Webhooks

`POST /api/webhooks/resend` and `POST /api/inbound/resend` require a valid Resend signature over the raw body and a unique `svix-id`. Missing configuration fails closed and duplicate event IDs return success without reprocessing.

## Main authenticated resources

- `/api/leads` — leads, assignments, meetings, custom values and bulk operations
- `/api/pitches` — drafts, atomic send claims, scheduling and ownership controls
- `/api/custom-fields` — administrator/manager-defined lead fields
- `/api/custom-fields/stages` — administrator/manager-defined pipeline stages
- `/api/sequences` — follow-up definitions and concurrency-safe executions
- `/api/revenue` — deals and commissions
- `/api/routing` — assignment rules
- `/api/documents` — templates and generated documents
- `/api/settings` — runtime settings; secret values are encrypted at rest

Unexpected production errors return a generic response. Credential and expensive AI endpoints are rate-limited.
