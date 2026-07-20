# Unitel Global — CarrierScout AI

An AI-powered B2B partner scouting and outreach platform for the Unitel Global team.
Scout VoIP/SMS carriers and other B2B segments, verify contacts, manage a shared
sales pipeline (CRM), and generate + send personalized outreach emails.

Everything runs from a single Node server that serves both the API and the web app.

## Features

- **Team accounts & roles** — email/password login (JWT), roles `ADMIN` / `MANAGER` / `AGENT`.
  The first user created automatically becomes the admin.
- **Shared PostgreSQL database** — leads, pitches, meetings, follow-up tasks and an
  activity log are stored server-side and shared across the whole team (no more
  browser-only `localStorage`).
- **AI scouting** (Google Gemini) — find cities, discover leads, verify emails,
  and generate localized outreach pitches.
- **CRM pipeline** — stages, assignment, notes, estimated value, follow-up tasks, meetings.
- **Real email sending** — send outreach via configurable SMTP (Nodemailer).
- **Security** — Helmet, CORS, rate limiting, input validation (Zod), hashed passwords (bcrypt).

## Tech stack

- Frontend: React 19 + Vite + TypeScript + Tailwind (CDN)
- Backend: Express 5 + Prisma ORM + PostgreSQL
- AI: `@google/genai` (Gemini)
- Email: Nodemailer (SMTP)

## Prerequisites

- Node.js 20+
- A PostgreSQL database (local or hosted)
- A Google Gemini API key (for AI features)
- Optional: SMTP credentials (for real email sending)

## Setup

1. **Install dependencies**
   ```bash
   npm install
   ```

2. **Configure environment**
   ```bash
   cp .env.example .env
   ```
   Then edit `.env`:
   - `DATABASE_URL` — your PostgreSQL connection string
   - `JWT_SECRET` — a long random secret
   - `GEMINI_API_KEY` — your Gemini key
   - (optional) `SMTP_*` — to enable real email sending

3. **Create the database schema & seed the first admin**
   ```bash
   npm run prisma:generate      # generate the Prisma client
   npm run prisma:migrate       # create tables (development)
   npm run db:seed              # create the initial admin user
   ```
   > For production use `npm run prisma:deploy` instead of `prisma:migrate`.
   > Or run everything at once: `npm run setup`.

4. **Run the app**
   ```bash
   npm run dev
   ```
   Open http://localhost:3000

   Sign in with the seeded admin (defaults: `admin@unitelglobal.com` / `ChangeMe123!`) —
   **change this password after first login.**

## Production

```bash
npm run build     # builds the web app + bundles the server to dist/server.cjs
npm run prisma:deploy
npm start
```

## API overview

All non-auth routes require a Bearer token (or the auth cookie).

| Method | Route | Description |
| ------ | ----- | ----------- |
| POST | `/api/auth/register` | Create user (first user = admin; otherwise admin-only) |
| POST | `/api/auth/login` | Log in, returns JWT |
| POST | `/api/auth/logout` | Log out |
| GET  | `/api/auth/me` | Current user |
| GET  | `/api/auth/team` | List team (admin/manager) |
| GET/POST | `/api/leads` | List / create leads |
| POST | `/api/leads/bulk` | Bulk import (after a scouting run) |
| PATCH | `/api/leads/:id` | Update lead |
| PATCH | `/api/leads/:id/stage` | Move pipeline stage |
| PATCH | `/api/leads/:id/assign` | Assign to an agent |
| PUT/DELETE | `/api/leads/:id/follow-up` | Manage follow-up task |
| POST/DELETE | `/api/leads/:id/meetings` | Manage meetings |
| GET | `/api/pitches` | List pitches |
| POST | `/api/pitches/generate` | Generate + save a pitch for a lead |
| PATCH | `/api/pitches/:id` | Edit a pitch |
| POST | `/api/pitches/:id/send` | Send via SMTP |
| POST | `/api/ai/cities` \| `/leads` \| `/verify` \| `/pitch` | AI helpers |
| GET | `/api/stats` \| `/stats/activity` | Dashboard analytics |
| GET | `/api/health` | Health / config status |

## In-app Settings (Admin)

Runtime configuration (AI key/model, SMTP, security) is managed from the UI — **no
editing of `.env` is required after deployment.** Admins open the **Settings** tab and
change values that are stored in the database (encrypted at rest for secrets) and applied
instantly, overriding any matching `.env` value. No server restart needed.

Settings sections:
- **AI Engine (Google Gemini)** — API key (masked, leave blank to keep the saved value)
  and model. Includes a *Test AI Connection* button.
- **Email Sending (SMTP)** — provider presets (Gmail, Microsoft 365/Outlook, SendGrid,
  Mailgun, Brevo, Zoho, Amazon SES) that auto-fill host/port, plus custom fields and a
  *Test Email Connection* button.
- **Company Profile** — your organization's identity (name, website, logo, what you do,
  products/services, value proposition, contact email, preferred language). The AI agents
  read this to personalize every pitch and email in your brand voice, so the tool works for
  **any** company — not just the original Unitel Global deployment. Leave the logo URL blank
  to use a clean text header (no broken images).
- **Security & Access** — toggle public self-registration.
- **System** — read-only bootstrap values (`NODE_ENV`, `PORT`, database, JWT secret)
  that intentionally stay in `.env` for safety.

API:
| Method | Route | Description |
| ------ | ----- | ----------- |
| GET  | `/api/settings` | Definitions + masked values + bootstrap info (admin) |
| PUT  | `/api/settings` | Update settings (blank secrets are ignored) |
| POST | `/api/settings/test/ai` | Verify Gemini config (ad-hoc or saved) |
| POST | `/api/settings/test/email` | Verify SMTP config (ad-hoc or saved) |

> Bootstrap values (`DATABASE_URL`, `JWT_SECRET`, `PORT`, `NODE_ENV`) cannot be stored in
> the database because they are needed to start it, so they remain in `.env`.
> Secrets are encrypted with AES-256-GCM; the client only ever receives a `__set` boolean
> flag, never the secret itself.

### Email delivery tracking (Resend webhooks)

To know whether an outreach email actually reached the prospect (B2B confirmation), point
a **Resend webhook** at:

```
POST https://<your-domain>/api/webhooks/resend
```

Every sent pitch is tagged with its `pitchId`, so Resend events map back automatically:
- `email.delivered` → pitch status **Delivered**
- `email.opened` / `email.clicked` → pitch marked **opened**
- `email.bounced` / `email.complained` → pitch status **Failed**

Set `RESEND_WEBHOOK_SECRET` (the Resend Signing Secret) in `.env` to verify inbound
signatures; without it the endpoint still accepts events (useful for local testing).

## Notes

- The Gemini API key is used **only** on the server and is never bundled into the client.
- If SMTP is not configured, the “send” endpoint returns a clear error and the UI can
  fall back to simulated sending.
