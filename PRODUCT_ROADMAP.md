# Product Roadmap: From LeadScout to the B2B Revenue Cockpit

## Product thesis

LeadScout should become the fastest trustworthy path from a target market to a qualified meeting for a solo founder or a small B2B team.

The product should not compete by becoming another generic, heavyweight CRM. Its wedge is one connected loop:

1. Find and qualify the right account.
2. Understand why it is relevant now.
3. Draft a specific, evidence-backed message.
4. Send through a deliverable channel with human control.
5. Capture the reply or booking automatically.
6. Put the next best action in front of the owner.
7. Learn which playbooks create meetings and revenue.

The promise should be measurable: **from market idea to qualified meeting without spreadsheets or tool switching**.

## Primary users

### Solo operator

A founder, consultant, broker, recruiter, agency owner, or independent seller needs a guided daily system, minimal setup, strong defaults, and automation that is safe to approve. The product must replace a spreadsheet, a cold-email tool, and a booking tool without feeling like enterprise CRM administration.

### Small revenue team

A 2–25 person team needs shared ownership, routing, approval rules, repeatable playbooks, manager visibility, handoffs, and outcome analytics. Collaboration must not make the solo workflow slower.

## North-star metric

**Qualified meetings held per active workspace per week.**

Supporting metrics:

- activation: first verified lead, first sent message, and first published booking page;
- time to value: minutes from signup to first approved outreach;
- funnel: delivered → positive reply → booked → attended → opportunity → revenue;
- quality: bounce, spam complaint, unsubscribe, no-show, and duplicate rates;
- execution: next-action completion and median lead response time;
- retention: workspaces with a completed revenue action in weeks 1, 4, 8, and 12;
- trust: percentage of AI actions approved without correction and automation exception rate.

Email opens should remain diagnostic rather than a primary success metric because privacy protections make them unreliable.

## Current product baseline

LeadScout already has a useful connected foundation:

- AI discovery, verification, enrichment, scoring, prediction, and pitch drafting;
- shared lead pipeline with assignments, custom fields, custom stages, tasks, meetings, and activity;
- templates, SMTP sending, scheduled sends, reply/delivery webhooks, and event history;
- email/task sequences with persisted triggers and concurrency-safe execution;
- weekly availability, public booking, notifications, ICS invitations, and pipeline advancement;
- revenue, routing, documents, monitoring, coaching, analytics, extension capture, and scoped API keys;
- role/ownership enforcement, secure browser sessions, encrypted settings, webhook replay protection, and production-safe frontend delivery.

## Honest current limitations

These are product gaps, not documentation footnotes:

- the data model is lead/company-centric; it does not yet model accounts, multiple contacts, buying committees, or relationships cleanly;
- email is SMTP/Resend-oriented; there is no full Gmail or Microsoft inbox synchronization and unified conversation inbox;
- calendar booking produces standard ICS invitations but has no Google Calendar or Outlook OAuth free/busy synchronization;
- sequences support email and task actions, not a complete multichannel cadence or visual workflow builder;
- consent provenance is not yet modeled per contact, and domain guidance does not yet query external reputation or DNS providers;
- analytics do not yet connect sequence variants and individual steps to meetings, opportunities, and revenue;
- the application is a single shared installation, not a SaaS-grade multi-tenant workspace/billing platform;
- there is no public OpenAPI contract, outbound webhook system, or broad integration marketplace;
- mobile workflows, offline capture, SSO, audit export, retention policies, and enterprise controls are incomplete.

## Roadmap

### Phase 0 — Trustworthy activation (0–6 weeks)

**Implementation status (July 2026): delivered in the `feat/trustworthy-activation` milestone.** The product now includes the launch checklist, five playbooks, daily command center, enforced sender verification and suppression controls, one-click unsubscribe, funnel events, route-contract and browser E2E coverage, accessibility recovery states, and route-level code splitting. The exit criterion still requires measurement with new users in production rather than being inferred from implementation alone.

Goal: a new solo user reaches the first quality outreach and booking without technical help.

- Add a setup wizard with progress: company profile, sender, test email, availability, first target, first pitch.
- Build a daily command center: overdue replies, approvals, meetings, failed sends, and highest-value next actions.
- Add a deliverability and compliance center: sender verification, unsubscribe links, suppression lists, bounce/complaint thresholds, rate controls, and domain-health guidance.
- Add workspace-level onboarding templates for founder sales, agencies, partnerships, recruiting, and channel sales.
- Instrument the complete activation and meeting funnel.
- Add route integration tests and browser E2E tests for login, settings, pitch send, booking, and custom stages.
- Improve accessibility, empty states, error recovery, and perceived performance; split the large frontend bundle by route.

Exit criteria: a non-technical user can send a compliant message and publish bookable availability in under 15 minutes.

### Phase 1 — One relationship timeline (6–12 weeks)

Goal: eliminate the need to check a separate inbox or calendar.

- Introduce Account, Contact, Opportunity, and Relationship records while preserving existing lead imports.
- Add Gmail and Microsoft OAuth inbox sync, threaded conversations, sent-mail sync, and reply classification.
- Add Google Calendar and Outlook Calendar OAuth with real free/busy checks, conflict sync, rescheduling, cancellation, reminders, and round-robin/team pages.
- Unify email, reply, meeting, task, note, document, and stage history on one timeline.
- Add a focused inbox with AI summaries, sentiment/intent, suggested reply, owner, SLA, and snooze.
- Automatically stop sequences on reply, unsubscribe, bounce, meeting, or configurable success event.

Exit criteria: every prospect interaction is visible and actionable from one record without duplicate sends or bookings.

### Phase 2 — Playbooks that learn (3–6 months)

Goal: turn individual selling knowledge into repeatable team performance by replacing ad-hoc outreach with governed, measurable, and improvable playbooks.

#### Visual workflow editor

- Build a trigger/condition/action workflow editor for sequences and multipath cadences.
- Support test mode with fake leads, sandbox execution, and step-by-step preview before publishing.
- Add playbook versioning with diff, rollout, rollback, and approval gates.
- Capture execution logs with replay, retry policy (exponential backoff with max attempts), and terminal failure states.
- Allow branching on engagement signals: reply type, meeting booked, link clicked, form submitted, or stage change.

#### Sequence optimization

- Add sequence versioning so teams can experiment without breaking live automation.
- Support A/B tests on subject lines, body copy, CTAs, and send times with statistical significance tracking.
- Add delivery windows and recipient timezone detection to respect working hours and local best-practice send times.
- Introduce thread mode to keep follow-ups in existing email threads when appropriate.
- Add sender rotation across verified team inboxes to improve deliverability and avoid spam-filter clustering.
- Require manager approval for high-volume or high-risk sequence changes before they go live.
- Surface step-level analytics: drop-off rate, reply rate, positive reply rate, and conversion to next stage per step.

#### Attribution and learning

- Attribute messages and sequence steps to downstream outcomes: positive reply, qualified meeting, stage velocity, win, and revenue.
- Connect playbook performance to account, contact, and opportunity records in a single attribution graph.
- Learn at playbook and step level without leaking customer data between tenants.
- Highlight top-performing steps and playbooks with confidence intervals and sample-size warnings.

#### Qualification playbooks

- Add reusable qualification frameworks: BANT, MEDDPICC, SPICED, and a custom builder.
- Model required exit criteria per stage so deals cannot advance without captured evidence.
- Tie qualification data to sequence branching and routing rules automatically.
- Let managers audit how well each playbook is being followed and where deals stall.

#### Manager visibility and queue governance

- Create shared queues and manager dashboards for approvals, stalled deals, handoffs, team workload, and SLA breaches.
- Add workload balancing across owners with configurable caps and alerts.
- Provide deal desk views for stalled opportunities, missing qualification data, and overdue next actions.

#### Integrations and API

- Add outbound webhooks for playbook events, stage changes, attribution updates, and approval actions.
- Release Zapier and Make connectors with pre-built actions and triggers for common sales workflows.
- Add import mappings for playbooks, sequences, and qualification data from CSV and external CRMs.
- Publish a versioned OpenAPI contract scoped to authenticated API keys.

Exit criteria: a manager can identify the playbook and step producing qualified pipeline, then roll it out safely to the team.

### Phase 3 — Signal-driven revenue agents (6–12 months)

Goal: make LeadScout proactive while keeping humans in control of consequential actions.

- Ingest verified signals: hiring, funding, leadership changes, technology, intent, product usage, renewal, and relationship activity.
- Rank accounts by fit × timing × relationship × value and explain every score with evidence and freshness.
- Let users describe a play in plain language, then generate a reviewable audience, workflow, messages, and success criteria.
- Add research, routing, briefing, follow-up, and CRM-hygiene agents with budgets, permissions, audit trails, and approval thresholds.
- Learn at workspace and vertical-playbook level without leaking customer data between tenants.
- Add a playbook marketplace with private team templates and curated vertical packs.

Exit criteria: the system consistently surfaces and executes the right next action before the user manually searches for it.

## Defensible differentiation

The durable moat is not generic text generation. It is the closed-loop outcome dataset and operating model:

- vertical-specific discovery and qualification playbooks;
- evidence-linked AI recommendations with freshness and confidence;
- one graph connecting accounts, people, messages, meetings, tasks, stages, and revenue;
- learning based on qualified meetings and revenue rather than opens;
- automation that is observable, permissioned, reversible where possible, and easy to approve;
- a solo-first interface that expands into team governance without migration to another product.

## What not to build yet

- A broad marketing suite, help desk, website builder, or generic ERP.
- High-volume cold-email infrastructure before suppression, consent, domain health, and abuse controls are first-class.
- Autonomous sending that hides evidence, cost, audience selection, or failure state from the user.
- A native mobile application before the daily web workflow and responsive experience are excellent.
- Dozens of shallow integrations before Gmail/Microsoft, calendar, outbound webhooks, and a stable API are dependable.

## Product decision rule

Prioritize work that improves one of three outcomes:

1. fewer minutes to a quality first touch;
2. more qualified meetings from the same number of prospects;
3. fewer leads lost because the next action was unclear or late.

If a feature does not improve one of these outcomes or strengthen trust, it should wait.
