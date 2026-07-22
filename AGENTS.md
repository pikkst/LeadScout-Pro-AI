# LeadScout PRO AI — Agent Guidelines

## Project Mission
Build the most reliable AI-native B2B sales platform. Every feature must be testable, documented, and secure.

## Core Principles
1. **Tests first, code second** — every function needs backend + frontend tests.
2. **Docs are part of the feature** — update README/API docs after each stage.
3. **Review before merge** — every stage ends with security, DB integrity, nesting, and duplication review.
4. **English only** — all code, docs, UI strings, commit messages, and comments must be in English.
5. **Rules evolve** — when a bug is found, update these rules to prevent recurrence.


## Lessons Learned
- Prisma schema changes require migration + regenerate cycle on Windows (file locking may block generate; stop node processes first)
- Always export utility functions if they need unit testing
- When adding event-driven logic to schedulers, always update `lastEventCheckedAt` to avoid reprocessing
- Duplicated include objects across route files are acceptable when imports would create circular deps
- AI service functions should always have safe fallbacks for malformed responses
- New AI endpoints should reuse existing lead/meeting includes to avoid extra DB queries
- Tailwind CDN must be bundled in production builds; do not whitelist external CDNs in production CSP script-src
- Dev CSP connect-src must derive WebSocket origins from configuration (e.g. config.port) rather than hardcoding arbitrary port numbers
- Always provide a favicon.ico in public/ to prevent avoidable 404 noise in browser console
- After every PR review (human or bot), update AGENTS.md Lessons Learned and checklist with any new findings so future sessions avoid repeating the same mistake
- Resend inbound `email.received` webhook delivers metadata only; full raw email must be fetched via Resend API using the email_id
- Scheduled pitch senders must use absolute image URLs on the sending domain to avoid spam-filter issues in Gmail and other clients
- Pitch scheduler idempotency requires both in-memory locks and DB-level recheck, because job loops can run across multiple server restarts
- New inbound/webhook routes need raw-body middleware mounted before the global JSON parser
- When adding settings-backed secrets, extend both `SETTING_DEFS` and the returned settings object, otherwise callers will get type errors
- Verify every external webhook against the exact raw body with the provider-supported library; fail closed when the signing secret is missing
- Scheduled external side effects need an atomic database claim before the provider call and a terminal failure state for permanent errors
- Authorization must be checked against the target resource owner, not only at router level
- Persist notification read state and expose a mutation endpoint before displaying unread counts
- Public booking links must be unguessable, expiring capability tokens and must expose only masked attendee data
- Slot booking must claim availability atomically inside the same transaction that creates the meeting
- Calendar confirmations should use provider-neutral ICS invitations before adding vendor-specific OAuth integrations

## Testing Rules
- **Backend**: unit tests for services, integration tests for routes, DB seed scripts for reproducibility
- **Frontend**: component tests for critical UI, E2E smoke tests for core workflows
- **Coverage target**: minimum 80% for new code
- **Run before commit**: `npm run typecheck && npm run test`

## Code Review Checklist (After Every Stage)
- [ ] Security: input validation, auth checks, SQL injection, XSS, secrets exposure
- [ ] Webhooks: raw-body signature verification, replay protection, and fail-closed secret configuration
- [ ] Background jobs: atomic claim, crash behavior, and terminal failure handling
- [ ] DB: migrations safe, indexes present, no N+1 queries, cascade rules correct
- [ ] Calendar: recurring rules validated, slot uniqueness enforced, booking races tested, public tokens expire
- [ ] Nesting: no deep callback hell, async/await used correctly
- [ ] Duplicates: no repeated logic, shared utilities extracted
- [ ] Best practices: error handling, logging, rate limiting, idempotency
- [ ] English: no Estonian/Russian/other strings in code or UI
- [ ] Security vulnerabilities: SQL injection, XSS, etc.
- [ ] Performance issues: slow queries, memory leaks, high CPU usage, inefficient loops.
- [ ] Bug detection: edge cases, race conditions, data corruption, invalid inputs, etc.
- [ ] Code style: consistency, readability, maintainability, formatting, naming conventions, etc.
- [ ] Test coverage: minimum 80% for new code, edge cases covered, proper assertions
- [ ] Documentation: API docs updated, inline comments added, changelog updated, readme updated


## Bug Fix Protocol
1. Reproduce and log the bug
2. Fix the code
3. Add a test that catches the bug
4. Update AGENTS.md rules if the bug reveals a systemic gap
5. Update docs if user-facing behavior changed

## Documentation Rules
- README stays the single source of truth for setup and workflows
- API.md must be updated for every new/changed route
- Inline comments only for non-obvious business logic
- Changelog section in README for every release

## Commit Rules
- Conventional commits: `feat:`, `fix:`, `docs:`, `test:`, `refactor:`, `chore:`
- One logical change per commit
- Never commit secrets, `.env`, or `dist/`

## Branch & Pull Request Rules
- Every update, change, or git push must be made on a new branch, not directly on `main`
- After pushing, open a Pull Request for review before merging
- Branch naming: `<type>/<short-description>` (e.g. `feat/lead-search-filter`, `fix/auth-timeout`)
- Do not merge your own PR without at least one review or CI approval
- PR description must reference the related issue or task, include a changelog summary, and pass all checks
- After every PR review (human or bot), update AGENTS.md `Lessons Learned` and review checklist with any new findings or anti-patterns surfaced, so future agents/tasks avoid the same mistakes
