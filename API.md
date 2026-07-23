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
| PUT | `/compliance/public-booking-url` | Admin/manager | Set the validated HTTPS origin used for booking and unsubscribe links |
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

## Phase 2 — Playbooks that learn

### Playbooks

| Method | Route | Access | Purpose |
|---|---|---|---|
| GET/POST | `/playbooks` | Signed in | List or create governed playbooks |
| GET/PATCH/DELETE | `/playbooks/:id` | Signed in / admin-manager write | Read, update, or archive a playbook |
| GET | `/playbooks/:id/versions` | Signed in | List all versions of a playbook |
| POST | `/playbooks/:id/versions` | Admin/manager | Create a new playbook version with steps, conditions, actions, and branches |
| POST | `/playbooks/:id/versions/:versionId/publish` | Admin/manager | Publish a version and set it as active |
| POST | `/playbooks/:id/versions/:versionId/rollback` | Admin/manager | Rollback to a previous version |
| POST | `/playbooks/:id/versions/:versionId/test` | Signed in | Start a sandbox test run |
| PATCH | `/playbooks/:id/versions/:versionId/test-runs/:runId` | Signed in | Update test run status or log |
| GET | `/playbooks/:id/versions/:versionId/test-runs` | Signed in | List test runs for a version |
| POST | `/playbooks/:id/versions/:versionId/approve` | Admin/manager | Approve a version for publication |
| POST | `/playbooks/:id/versions/:versionId/reject` | Admin/manager | Reject a version with a comment |
| GET | `/playbooks/:id/versions/:versionId/approvals` | Signed in | List approval history |

Playbook versioning uses `playbookId` + `version` integer uniqueness. Publishing a version deactivates all other active versions for the same playbook atomically.

### Qualification playbooks

| Method | Route | Access | Purpose |
|---|---|---|---|
| GET/POST | `/qualification/playbooks` | Signed in / admin-manager write | List or create qualification frameworks |
| GET/PATCH/DELETE | `/qualification/playbooks/:id` | Signed in / admin-manager write | Manage playbooks (BANT, MEDDPICC, SPICED, CUSTOM) |
| POST | `/qualification/playbooks/:id/stages` | Admin/manager | Add a stage to a playbook |
| PATCH/DELETE | `/qualification/stages/:stageId` | Admin/manager | Update or remove a stage |
| POST | `/qualification/stages/:stageId/criterions` | Admin/manager | Add an evidence criterion to a stage |
| PATCH/DELETE | `/qualification/criterions/:criterionId` | Admin/manager | Manage criteria |
| GET | `/qualification/deals/:dealId` | Signed in | Read deal qualification state |
| POST | `/qualification/deals/:dealId` | Admin/manager | Upsert deal qualification evidence |

Exit criteria per deal stage are enforced by the `isRequired` flag on `QualificationStage`. Deals cannot advance through automated routing if required qualification data is missing.

### Manager queues and workload

| Method | Route | Access | Purpose |
|---|---|---|---|
| GET/POST | `/queues/queues` | Signed in / admin-manager write | List or create shared queues (approvals, stalled, handoffs, SLA breaches) |
| GET/PATCH/DELETE | `/queues/queues/:id` | Signed in / admin-manager write | Manage a queue |
| GET | `/queues/items` | Signed in | List queue items with optional filters |
| POST | `/queues/items` | Admin/manager | Add an item to a queue |
| PATCH/DELETE | `/queues/items/:itemId` | Admin/manager | Update or remove a queue item |
| GET | `/queues/workload` | Admin/manager | Read all workload caps |
| GET | `/queues/workload/me` | Signed in | Read or auto-create current user's cap |
| POST/PATCH | `/queues/workload` | Admin/manager | Upsert workload caps with configurable thresholds |

Queue items support priority levels `LOW`, `MEDIUM`, `HIGH`, and `CRITICAL`. SLA due dates and resolution timestamps are tracked.

### Attribution

| Method | Route | Access | Purpose |
|---|---|---|---|
| POST | `/attribution` | Signed in | Record a playbook outcome (positive reply, qualified meeting, stage change, win, revenue) |
| GET | `/attribution/playbook/:playbookId` | Signed in | Read aggregated attributions and summary for a playbook |
| GET | `/attribution/step/:stepId` | Signed in | Read attributions for a specific step |

Attribution records link outcomes to `accountId`, `contactId`, `opportunityId`, `leadId`, `pitchId`, and `stepId`. When no active playbook version exists, attribution POST returns `400`.

### Outbound webhooks and integrations

| Method | Route | Access | Purpose |
|---|---|---|---|
| GET/POST | `/webhooks/webhooks` | Signed in / admin-manager write | List or create outbound webhooks |
| GET/PATCH/DELETE | `/webhooks/webhooks/:id` | Signed in / admin-manager write | Manage webhooks (events, retry, timeout) |
| GET/POST | `/webhooks/mappings` | Signed in / admin-manager write | List or create import mappings for Zapier, Make, and custom integrations |

Webhook delivery uses configurable retry with exponential backoff, up to `retryCount` attempts and a `timeoutMs` ceiling. Failed deliveries are surfaced via `lastError`.

### Sequence enhancements

| Method | Route | Purpose |
|---|---|---|
| GET | `/sequences/:id/versions` | List sequence versions |
| POST | `/sequences/:id/versions` | Create a new version from a steps snapshot |
| POST | `/sequences/:id/versions/:version/publish` | Publish a version (deactivates others atomically) |
| POST | `/sequences/:id/versions/:version/rollback` | Rollback to a previous version |
| GET | `/sequences/:id/versions/:version/ab-tests` | List A/B tests for a sequence version |
| POST | `/sequences/:id/versions/:version/ab-tests` | Create an A/B test with variants |
| PATCH | `/sequences/:id/versions/:version/ab-tests/:abTestId` | Update A/B test status |
| GET/POST/DELETE | `/sequences/:id/delivery-windows` | Manage timezone-aware delivery windows and recipient local send-time respect |
| GET/POST | `/sequences/:id/sender-rotation` | Manage verified sender inbox rotation (round-robin, random, performance) |

A/B tests track `impressions` and `conversions` per variant with configurable `minSampleSize` and `confidenceLevel`. Delivery windows support per-recipient timezone detection and weekday restrictions.

## Phase 3 — Signal-driven revenue agents

### Signal ingestion

| Method | Route | Access | Purpose |
|---|---|---|---|
| POST | `/signals` | Signed in | Ingest a verified revenue signal |
| GET | `/signals` | Signed in | List signals with optional filters (`accountId`, `type`, `isVerified`, `limit`) |
| POST | `/signals/:id/verify` | Signed in | Mark a signal as verified or unverified |
| DELETE | `/signals/:id` | Signed in | Remove a signal and its account associations |
| GET | `/signals/accounts/:accountId` | Signed in | List signals linked to an account |
| POST | `/signals/accounts/:accountId` | Signed in | Attach a manual signal to an account |

Supported signal types: `HIRING`, `FUNDING`, `LEADERSHIP_CHANGE`, `TECHNOLOGY`, `INTENT`, `PRODUCT_USAGE`, `RENEWAL`, `RELATIONSHIP_ACTIVITY`.

### Account ranking

| Method | Route | Access | Purpose |
|---|---|---|---|
| GET | `/rankings` | Signed in | List account rankings ordered by composite score |
| POST | `/rankings/accounts/:accountId/recalculate` | Signed in | Recalculate rank for a specific account |
| GET | `/rankings/accounts/:accountId` | Signed in | Read a single account's ranking and evidence |

Composite score weights: fit (35%), timing (25%), relationship (25%), value (15%). Evidence includes freshness, confidence, relevance, and context snippets.

### Revenue agents

| Method | Route | Access | Purpose |
|---|---|---|---|
| GET | `/agents/definitions` | Signed in | List agent definitions |
| POST | `/agents/definitions` | Admin/manager | Create a research, routing, briefing, follow-up, or CRM-hygiene agent |
| PATCH | `/agents/definitions/:id` | Admin/manager | Update agent config, budget, permissions, or threshold |
| DELETE | `/agents/definitions/:id` | Admin/manager | Remove an agent definition |
| POST | `/agents/definitions/:id/run` | Admin/manager | Execute an agent with optional input payload |
| GET | `/agents/definitions/:id/runs` | Signed in | List recent runs for an agent |
| POST | `/agents/runs/:runId/approve` | Admin/manager | Approve or reject an agent run awaiting human review |

Agent runs exceeding `approvalThreshold` enter `AWAITING_APPROVAL` status. Approval records store reviewer, comment, and timestamp. Budget consumption is tracked per definition.

### Playbook marketplace

| Method | Route | Access | Purpose |
|---|---|---|---|
| GET | `/marketplace/packs` | Signed in | List marketplace packs with optional `visibility` and `vertical` filters |
| POST | `/marketplace/packs` | Admin/manager | Create a private or curated pack |
| GET | `/marketplace/packs/:slug` | Signed in | Read a pack with its playbook items |
| PATCH | `/marketplace/packs/:slug` | Admin/manager | Update pack metadata |
| POST | `/marketplace/packs/:slug/items` | Admin/manager | Add a playbook to a pack |
| DELETE | `/marketplace/packs/:slug/items/:playbookId` | Admin/manager | Remove a playbook from a pack |
| DELETE | `/marketplace/packs/:slug` | Admin/manager | Delete a pack |
| POST | `/marketplace/packs/:slug/apply` | Admin/manager | Apply a pack to the current workspace |

Pack visibility: `PRIVATE` (team-only) and `CURATED` (vertical marketplace). Packs can carry a `vertical` tag for marketplace discovery.
