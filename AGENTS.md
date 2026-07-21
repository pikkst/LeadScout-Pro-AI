# LeadScout PRO AI — Agent Guidelines

## Project Mission
Build the most reliable AI-native B2B sales platform. Every feature must be testable, documented, and secure.

## Core Principles
1. **Tests first, code second** — every function needs backend + frontend tests.
2. **Docs are part of the feature** — update README/API docs after each stage.
3. **Review before merge** — every stage ends with security, DB integrity, nesting, and duplication review.
4. **English only** — all code, docs, UI strings, commit messages, and comments must be in English.
5. **Rules evolve** — when a bug is found, update these rules to prevent recurrence.

## Stage Plan

### Stage 1 — AI Lead Intelligence (Completed)
### Stage 2 — Predictive Analytics (Completed)
### Stage 3 — Autonomous Optimization (Completed)

## Lessons Learned
- Prisma schema changes require migration + regenerate cycle on Windows (file locking may block generate; stop node processes first)
- Always export utility functions if they need unit testing
- When adding event-driven logic to schedulers, always update `lastEventCheckedAt` to avoid reprocessing
- Duplicated include objects across route files are acceptable when imports would create circular deps
- AI service functions should always have safe fallbacks for malformed responses
- New AI endpoints should reuse existing lead/meeting includes to avoid extra DB queries

## Testing Rules
- **Backend**: unit tests for services, integration tests for routes, DB seed scripts for reproducibility
- **Frontend**: component tests for critical UI, E2E smoke tests for core workflows
- **Coverage target**: minimum 80% for new code
- **Run before commit**: `npm run typecheck && npm run test`

## Code Review Checklist (After Every Stage)
- [ ] Security: input validation, auth checks, SQL injection, XSS, secrets exposure
- [ ] DB: migrations safe, indexes present, no N+1 queries, cascade rules correct
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
