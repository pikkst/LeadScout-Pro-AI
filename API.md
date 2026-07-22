# LeadScout PRO AI API

All routes are prefixed with `/api`. JSON request bodies use `Content-Type: application/json` unless a route explicitly accepts multipart upload or a signed raw webhook body.

## Authentication and security

Browser clients authenticate with the HttpOnly, SameSite `unitel_session` cookie created by `POST /auth/login`. Cookie-authenticated `POST`, `PUT`, `PATCH`, and `DELETE` requests must include an allowed `Origin` header.

CLI clients may send `X-Auth-Mode: bearer` when logging in, then use the returned token as `Authorization: Bearer <token>`. Public self-registration always creates an `AGENT`; only an authenticated administrator can create privileged users through `/admin/users`.

Credential endpoints allow 10 attempts per 15 minutes. General API traffic is limited to 200 requests per minute, and expensive AI operations have an additional shared limit. Unexpected production errors return a generic response.

### Session and team routes

| Method | Route | Access | Purpose |
|---|---|---|---|
| POST | `/auth/register` | Public when enabled | Register; the first user becomes administrator |
| POST | `/auth/login` | Public | Create a browser session or optional bearer token |
| POST | `/auth/logout` | Public | Clear the browser session cookie |
| GET/PATCH | `/auth/me` | Signed in | Read or update profile/password |
| GET | `/auth/team` | Admin/manager | List the team |
| GET | `/auth/users` | Signed in | List assignable users |
| GET | `/auth/notifications` | Signed in | Read the current user's activity notifications |
| PATCH | `/auth/notifications/read-all` | Signed in | Mark notifications read |
| GET/POST | `/admin/users` | Admin | List or create users |
| PATCH/DELETE | `/admin/users/:id` | Admin | Update or deactivate a user and revoke their keys |

## Leads and pipeline

| Method | Route | Purpose |
|---|---|---|
| GET/POST | `/leads` | List or create leads |
| POST | `/leads/bulk` | Import leads with duplicate handling |
| GET/PATCH/DELETE | `/leads/:id` | Read, update, or delete a lead |
| PATCH | `/leads/:id/stage` | Move a lead to a built-in or custom stage |
| PATCH | `/leads/:id/assign` | Assign a lead; admin/manager only |
| POST | `/leads/bulk/assign` | Bulk assignment; admin/manager only |
| PUT/DELETE | `/leads/:id/follow-up` | Upsert or remove a follow-up task |
| POST/DELETE | `/leads/:id/meetings[/:meetingId]` | Create or cancel a legacy lead meeting |
| POST | `/leads/check-duplicate` | Check normalized email/domain matches |
| GET/PUT | `/leads/:id/custom-fields` | Read or replace validated custom values |

### CRM customization

| Method | Route | Access | Purpose |
|---|---|---|---|
| GET | `/custom-fields` | Signed in | List custom field definitions |
| POST/PATCH/DELETE | `/custom-fields[/:id]` | Admin/manager | Manage custom fields |
| GET | `/custom-fields/stages` | Signed in | List deal stages |
| POST/PATCH/DELETE | `/custom-fields/stages[/:id]` | Admin/manager | Manage stages; keys migrate transactionally |

A deal stage cannot be deleted while leads use it. Field values are replaced transactionally and rejected when definitions do not exist or field IDs are duplicated.

## Outreach and automation

| Method | Route | Purpose |
|---|---|---|
| GET | `/pitches` | List pitches |
| POST | `/pitches/generate` | Generate and persist a pitch |
| PATCH/DELETE | `/pitches/:id` | Modify or delete an owned pitch |
| POST | `/pitches/:id/send` | Atomically claim and send a draft/failed pitch |
| POST | `/pitches/:id/schedule` | Queue a draft for scheduled sending |
| GET | `/events/pitch/:pitchId` | Read a pitch event timeline |
| GET/POST | `/templates` | List or create pitch templates |
| PATCH/DELETE | `/templates/:id` | Manage an owned template |
| GET/POST | `/sequences` | List or create follow-up sequences |
| PATCH/DELETE | `/sequences/:id` | Manage a sequence; admin/manager writes |
| POST | `/sequences/:id/start/:leadId` | Enroll a lead once |
| POST | `/sequences/:id/stop/:leadId` | Stop an active execution |
| GET | `/sequences/lead/:leadId` | List a lead's executions |

Sequence actions currently support `EMAIL` and `TASK`. The worker uses database claims, persists trigger state, pauses incomplete executions, and prevents more than one active execution per lead/sequence.

Every outgoing pitch includes a workspace booking link when available and a unique unsubscribe capability. Manual, scheduled, and sequence sends all enforce sender verification, the suppression list, rolling send limits, and bounce/complaint pause thresholds before delivery.

## Activation, command center, and compliance

| Method | Route | Access | Purpose |
|---|---|---|---|
| GET | `/activation/state` | Signed in | Return launch checklist and progress |
| GET | `/activation/templates` | Signed in | List workspace onboarding playbooks |
| POST | `/activation/template` | Admin/manager | Apply a playbook, pitch template, and follow-up sequence |
| PATCH | `/activation/wizard` | Signed in | Hide or restore the launch checklist for the current user |
| GET | `/activation/command-center` | Signed in | Prioritized actions, health, meetings, and funnel totals |
| GET | `/compliance/status` | Signed in | Sender health, rates, thresholds, pauses, and guidance |
| GET/POST/DELETE | `/compliance/suppressions[/:email]` | Admin/manager | Manage the recipient do-not-contact list |
| PUT | `/compliance/policy` | Admin/manager | Update daily, bounce, and complaint safety limits |
| GET/POST | `/public/unsubscribe/:token` | Public capability | Inspect or apply a one-click recipient opt-out |

## Calendar and public booking

| Method | Route | Access | Purpose |
|---|---|---|---|
| GET | `/calendar/availability` | Signed in | Read weekly availability rules |
| POST | `/calendar/availability` | Owner or manager | Save weekly rules and generate 1–26 weeks of slots |
| GET | `/calendar/slots` | Signed in | List unbooked slots by agent/date range |
| POST | `/calendar/slots` | Owner or manager | Create one validated future slot |
| POST | `/calendar/slots/bulk` | Owner or manager | Generate 15/30/45/60-minute slots in a date range |
| GET | `/calendar/my-slots` | Signed in | List the current user's slots |
| GET | `/calendar/meetings` | Signed in | List meetings by agent or lead |
| POST | `/calendar/book` | Slot owner or manager | Book a workspace slot atomically |
| DELETE | `/calendar/meetings/:id` | Owner or manager | Cancel and release a booked slot |
| GET | `/public/booking/:token` | Public capability | Return masked invitation details and future slots |
| POST | `/public/booking/:token` | Public capability | Book once, notify both sides, and advance the lead |

Booking tokens are random, expiring capabilities. Successful bookings produce timezone-aware ICS invitations compatible with Google Calendar, Outlook, Apple Calendar, and local calendar applications. Direct Google/Outlook OAuth synchronization is not implemented yet.

## AI, analytics, and operations

| Method | Route | Purpose |
|---|---|---|
| POST | `/ai/cities`, `/ai/leads`, `/ai/verify`, `/ai/pitch` | Discovery, verification, and pitch generation |
| POST | `/ai/score/:leadId`, `/ai/enrich/:leadId`, `/ai/predict/:leadId` | Lead intelligence |
| POST | `/ai/meeting-prep/:meetingId` | Meeting briefing |
| GET | `/stats`, `/stats/activity`, `/stats/forecast`, `/stats/conversion`, `/stats/agent-performance` | Workspace analytics |
| GET | `/stats/forecast/ai` | Rate-limited AI forecast |
| GET/POST | `/optimization/send-time/:leadId` | Read/generate send-time advice |
| GET/POST | `/optimization/coaching/me`, `/optimization/coaching/generate` | Personal coaching |
| PATCH | `/optimization/coaching/:id/read`, `/optimization/coaching/:id/resolve` | Owner or manager mutation |
| GET/POST | `/monitoring/lead/:leadId[/check]` | Read or run lead monitoring |
| PATCH | `/monitoring/:id/read` | Mark a monitoring alert read |

## Revenue, routing, and documents

| Resource | Routes | Write access |
|---|---|---|
| Revenue | `/revenue/deals`, `/revenue/stats`, `/revenue/leaderboard`, `/revenue/commissions` | Admin/manager for deal creation and commission payment |
| Routing | `/routing/rules`, `/routing/auto-assign/:leadId` | Admin/manager |
| Documents | `/documents/templates`, `/documents/generate`, `/documents/:id/pdf`, `/documents` | Admin/manager for template changes; signed-in generation |

Generated HTML is previewed in sandboxed iframes. The PDF endpoint is `POST /documents/:id/pdf`.

## Settings, API keys, and integrations

| Method | Route | Access | Purpose |
|---|---|---|---|
| GET/PUT | `/settings` | Admin | Read masked settings or update allowed runtime values |
| POST | `/settings/test/ai`, `/settings/test/email` | Admin | Verify effective provider settings |
| POST/DELETE | `/settings/company-logo` | Admin | Upload (multipart `logo`, max 2 MB) or remove logo |
| GET/POST | `/api-keys` | Signed in | List keys or issue a raw key once |
| DELETE | `/api-keys/:id` | Key owner | Revoke/delete a key |
| GET | `/integrations/leads` | API key with `read` | List up to 200 recent leads |
| POST | `/integrations/leads` | API key with `write` | Create or return a normalized duplicate |

Send integration keys as `X-API-Key: lsp_...`; `Authorization: Bearer lsp_...` is also accepted. Only server-keyed HMAC-SHA-256 digests are stored. Keys created before the keyed-hash migration are revoked and must be recreated.

## Webhooks and health

`POST /webhooks/resend` and `POST /inbound/resend` require a valid Resend/Svix signature over the exact raw request body and a unique `svix-id`. Missing configuration fails closed. Duplicate event IDs return success without reprocessing, and replay receipts older than 90 days are cleaned periodically. Bounce and complaint events are recorded separately and automatically suppress the recipient; matched inbound replies advance the lead and the activation funnel.

`GET /health` returns only `{ status, time }`. Chrome's `/.well-known/appspecific/com.chrome.devtools.json` probe is outside `/api` and intentionally returns `204 No Content`.
