# LeadScout PRO AI

<p align="center">
  <strong>Autonomous B2B Partner Scouting & AI-Powered Outreach</strong><br/>
  Real-time company discovery, contact verification, shared CRM pipeline, and localized email outreach — for any industry.
</p>

<p align="center">
  <a href="#features"><img alt="Features" src="https://img.shields.io/badge/features-8%2B-blue" /></a>
  <a href="#tech-stack"><img alt="Tech" src="https://img.shields.io/badge/stack-React%20%2B%20Express%20%2B%20PostgreSQL-green" /></a>
  <a href="#license"><img alt="License" src="https://img.shields.io/badge/license-Proprietary-red" /></a>
</p>

---

## Table of Contents

1. [Overview](#overview)
2. [Features](#features)
3. [Tech Stack](#tech-stack)
4. [Prerequisites](#prerequisites)
5. [Installation & Setup](#installation--setup)
6. [Configuration](#configuration)
7. [Usage Workflow](#usage-workflow)
8. [In-App Settings (Admin)](#in-app-settings-admin)
9. [Screenshots Guide](#screenshots-guide)
10. [API Overview](#api-overview)
11. [Development](#development)
12. [Production Deployment](#production-deployment)
13. [Troubleshooting](#troubleshooting)
14. [License](#license)

---

## Overview

LeadScout PRO AI is a full-stack B2B partner scouting and outreach platform. It combines AI-powered lead discovery (Google Gemini), real-time contact verification, a shared team CRM pipeline, and configurable SMTP email sending into a single deployable application.

Designed for teams that need to:
- Scout B2B partners across any industry (telecom, fintech, manufacturing, healthcare, logistics, etc.)
- Verify contact authenticity before outreach
- Manage a shared sales pipeline with stages, follow-ups, and meetings
- Generate and send personalized, localized outreach emails at scale

Unlike browser-only demos, LeadScout PRO AI uses a **shared PostgreSQL database** — all leads, pitches, and activity logs are stored server-side and visible to every authorized team member.

---

## Features

### 1. Team Accounts & Roles
- Email/password authentication with JWT
- Three roles: **ADMIN**, **MANAGER**, **AGENT**
- First registered user becomes ADMIN automatically
- Role-based access control throughout the UI

### 2. AI-Powered Scouting (Google Gemini)
- **City discovery**: Find major cities in any country or region
- **Lead generation**: Discover companies, websites, and contact emails
- **Contact verification**: Live domain pulse check + email authenticity validation
- **24 industry segments**: VoIP carriers, fintech, manufacturing, healthcare, logistics, automotive, and more
- **Duplicate prevention**: Skips already-imported leads by normalized domain or email
- **Lead source tracking**: AI_SCOUT, MANUAL, CSV_IMPORT, PITCH_REPLY

### 3. Shared CRM Pipeline
- Visual Kanban board with pipeline stages: Discovered → Contacted → Negotiation → Signed → Active
- Follow-up task scheduling with due dates and completion tracking
- Meeting notes and activity logging
- **My Pipeline filter**: view only leads assigned to you or created by you
- **Bulk stage updates**: select multiple leads and move them across stages
- **Lead scoring**: 0-100 point score based on verification, value, stage, tasks, and meetings
- **Overdue follow-up alerts** with action center
- CSV export and JSON backup/restore

### 4. AI Outreach Generator
- Generates localized partnership pitch emails in 7 languages
- Uses your **Company Profile** (name, offerings, value prop) for brand-consistent messaging
- **Template-based generation**: select a saved template as the structural base for AI personalization
- HTML preview with live iframe and raw source editor
- Bulk send, retry failed sends, and track delivery status
- **Pitch Event Timeline**: see SENT → DELIVERED → OPENED → CLICKED → REPLIED events per pitch

### 5. Real Email Delivery (SMTP)
- Configurable from the UI — no `.env` editing after deployment
- Provider presets: Gmail, Microsoft 365/Outlook, SendGrid, Mailgun, Brevo, Zoho, Amazon SES, Resend
- Live connection test button
- Optional Resend webhook for delivery/open/bounce tracking
- Auto-scheduled follow-up tasks after sending

### 6. Pitch Templates
- Save reusable email structures for faster outreach drafting
- CRUD operations from Settings page
- Templates can be focused by industry segment
- AI uses templates as structural base while personalizing content

### 7. Team Collaboration
- **Team Activity Feed**: see who did what and when across the shared pipeline
- Shared database — all leads, pitches, and logs visible to authorized team members
- Lead assignment and ownership tracking

### 8. Data Management
- **CSV Import**: bulk import leads from CSV files
- **CSV Export**: export pipeline to CSV for external analysis
- JSON backup and restore
- Column sorting in leads table
- Lead source tracking (AI scouting, manual entry, CSV import, pitch reply)

### 9. Dashboard & Analytics
- Real-time stats: scouted profiles, selected targets, outreach sent, response rate
- Communications log with status tracking
- Overdue follow-up alerts with action center
- **Browser notifications** for pitch sends and stage changes

### 10. Security
- Helmet, CORS, rate limiting
- Input validation (Zod)
- Hashed passwords (bcrypt)
- AES-256-GCM encryption for secrets at rest
- Optional public self-registration toggle

---

## Tech Stack

| Layer | Technology |
|-------|-----------|
| Frontend | React 19 + Vite 6 + TypeScript + Tailwind CSS (CDN) |
| Backend | Express 5 (Node.js) |
| Database | PostgreSQL + Prisma ORM |
| AI | Google Gemini (`@google/genai`) |
| Email | Nodemailer (SMTP) |
| Auth | JWT + bcrypt |
| Validation | Zod |

---

## Prerequisites

- **Node.js** 20+ ([download](https://nodejs.org/))
- **PostgreSQL** 14+ (local or hosted)
- **Google Gemini API key** ([get one](https://aistudio.google.com/app/apikey))
- **SMTP credentials** (optional, for real email sending)

> **Windows note:** All commands below work in PowerShell or Command Prompt.

---

## Installation & Setup

### 1. Clone the repository

```bash
git clone https://github.com/pikkst/LeadScout-Pro-AI.git
cd LeadScout-Pro-AI
```

### 2. Install dependencies

```bash
npm install
```

### 3. Configure environment

```bash
copy .env.example .env
```

Edit `.env` with your values (see [Configuration](#configuration) below).

### 4. Create the database schema and seed the first admin

```bash
npm run prisma:generate
npm run prisma:migrate
npm run db:seed
```

Or run everything at once:

```bash
npm run setup
```

### 5. Start the development server

```bash
npm run dev
```

Open [http://localhost:3000](http://localhost:3000).

Sign in with the seeded admin:
- **Email:** `admin@unitelglobal.com`
- **Password:** `ChangeMe123!`

> **Important:** Change the admin password after first login.

---

## Configuration

### Required `.env` variables

| Variable | Description |
|----------|-------------|
| `DATABASE_URL` | PostgreSQL connection string |
| `JWT_SECRET` | Long random secret for token signing |
| `GEMINI_API_KEY` | Google Gemini API key (server-side only) |

### Optional `.env` variables

| Variable | Description |
|----------|-------------|
| `PORT` | Server port (default: `3000`) |
| `NODE_ENV` | `development` or `production` |
| `JWT_EXPIRES_IN` | Token expiry (default: `7d`) |
| `ALLOW_PUBLIC_REGISTRATION` | `true` to allow self-registration |
| `SMTP_HOST` / `SMTP_PORT` / `SMTP_USER` / `SMTP_PASS` | SMTP settings for real email |
| `SMTP_FROM_NAME` / `SMTP_FROM_EMAIL` | Sender identity |
| `RESEND_WEBHOOK_SECRET` | Resend signing secret for webhook verification |

> **Security note:** The Gemini API key and SMTP password are **never** sent to the browser. They stay on the server.

---

## Usage Workflow

### Step 1: Configure Company Profile (Admin)

1. Log in as ADMIN
2. Go to **Settings** → **Company Profile**
3. Fill in:
   - Company name
   - Logo (upload or URL)
   - Website
   - What you do / offerings
   - Value proposition
   - Contact email
   - Preferred language

> This profile is used by the AI agents to personalize every pitch and email.

### Step 2: Configure AI & Email (Admin)

1. Go to **Settings** → **AI Engine**
   - Enter your Gemini API key (or leave blank to keep the saved one)
   - Select model (default: `gemini-2.5-flash`)
   - Click **Test AI Connection**

2. Go to **Settings** → **Email Sending**
   - Select a provider preset (Gmail, Outlook, SendGrid, etc.)
   - Enter SMTP credentials
   - Click **Test Email Connection**

### Step 3: Scout Leads

1. Go to **AI Partner Scout** tab
2. Select **Partnership Market Segment** (e.g., "VoIP Carriers", "Fintech", "Manufacturing")
3. Enter **Target Territory** (e.g., "Germany", "UK", "Baltics")
4. Choose **Scanning Grid Depth**: Standard (5 zones) or Deep Scan (15 zones)
5. Click **Launch AI Scout**

The AI will:
- Discover major cities in the target region
- For each city, find relevant companies and contact emails
- Verify domain liveliness and email authenticity
- Save results live to the CRM pipeline

### Step 4: Select Leads & Generate Pitches

1. In the **Scouted Partners** table, select leads (checkbox or **Select All**)
2. Go to **AI Outreach Generator** panel (left side)
3. Choose target output language (Auto-Detect, English, Estonian, German, etc.)
4. Click **Draft Custom Pitch**

The AI generates personalized outreach emails for each selected lead using your Company Profile.

### Step 5: Review & Send Emails

1. Go to **AI Campaigns** tab
2. Review each pitch card:
   - Subject and recipient
   - Language detected
   - Status (Draft / Sent / Delivered / Replied)
3. Click **Edit** to open the HTML preview editor
   - Toggle between Live Preview and Raw Source Editor
   - Modify subject and body
   - Save changes
4. Click **Send Email** to dispatch via SMTP
5. Use **Bulk Send All Drafts** for batch sending

### Step 6: Track Outreach & Advance Pipeline

1. Go to **Executive Analytics** tab to view:
   - Delivery status logs
   - Sent outreach tracking
2. When a partner replies, click **Mark as Replied**
   - Lead automatically advances to **Negotiation** stage
3. Use **CRM Client Database** tab to:
   - Drag leads across pipeline stages
   - Add follow-up tasks
   - Schedule meetings
   - Add notes and update estimated value

### Step 7: Chrome Extension (Quick Add)

1. Open `chrome://extensions/` in Chrome
2. Enable "Developer mode"
3. Click "Load unpacked" and select the `extension` folder
4. The extension icon appears in your toolbar
5. Visit any LinkedIn company page, Google Maps listing, or website
6. Click the extension icon and:
   - Click **Auto-fill from Page** to extract company info
   - Or fill in details manually
   - Click **Save Lead** to add to your pipeline

## In-App Settings (Admin)

All runtime configuration is managed from the **Settings** tab — **no `.env` editing is required after deployment.**

### AI Engine (Google Gemini)
- API key (masked; leave blank to keep saved value)
- Model selection (default: `gemini-2.5-flash`)
- **Test AI Connection** button

### Email Sending (SMTP)
- Provider presets with auto-fill:
  - Gmail
  - Microsoft 365 / Outlook
  - SendGrid
  - Mailgun
  - Brevo (formerly Sendinblue)
  - Zoho Mail
  - Amazon SES
  - Resend
- Custom host/port/secure fields
- **Test Email Connection** button

> **Resend note:** Defaults to port 587 + STARTTLS (`secure: false`). Do not enable TLS/SSL (port 465) with the Resend preset — it will cause a "wrong version number" error.

### Company Profile
- Company name, logo, website
- Offerings / products
- Value proposition
- Contact email
- Preferred language

The AI agents read this to personalize every pitch and email in your brand voice.

### Security & Access
- Toggle public self-registration on/off

### System (Read-Only)
- Bootstrap values that stay in `.env`: `NODE_ENV`, `PORT`, database URL, JWT secret
- These cannot be moved to the database because they are needed to start the server

---

## Screenshots Guide

Place screenshots in the `docs/screenshots/` folder (create it if needed) and reference them below.

### Recommended screenshots

#### 1. Login Screen
**File:** `docs/screenshots/01-login.png`
- Show the clean login form with LeadScout PRO AI branding

#### 2. Scout Tab — Empty State
**File:** `docs/screenshots/02-scout-empty.png`
- Show the left panel with Strategic Directives (focus, location, intensity)
- Show the empty state with "No Active Mission" and quick-start buttons

#### 3. Scout Tab — Results Table
**File:** `docs/screenshots/03-scout-results.png`
- Show the scouted leads table with verification badges, estimated values, and action buttons

#### 4. Outreach Tab — Pitch Cards
**File:** `docs/screenshots/04-outreach-cards.png`
- Show the grid of generated pitch cards with status badges (Draft, Sent, Delivered, Replied)

#### 5. Pitch Preview Modal
**File:** `docs/screenshots/05-pitch-preview.png`
- Show the HTML preview modal with Live Preview / Raw Source Editor tabs

#### 6. CRM Pipeline Board
**File:** `docs/screenshots/06-crm-pipeline.png`
- Show the Kanban board with pipeline stages and lead cards

#### 7. Dashboard Analytics
**File:** `docs/screenshots/07-dashboard.png`
- Show the stats ticker, communications log, and sent outreach tracking

#### 8. Settings Page
**File:** `docs/screenshots/08-settings.png`
- Show the Settings tab with AI Engine, Email Sending, Company Profile sections

#### 9. Agent Terminal
**File:** `docs/screenshots/09-agent-terminal.png`
- Show the live activity feed with scout agent logs

#### 10. Bulk Send & Tracking
**File:** `docs/screenshots/10-bulk-send.png`
- Show the bulk send button and sent outreach tracking with "Mark as Replied" actions

---

## API Overview

All non-auth routes require a Bearer token (or the `unitel_token` auth cookie).

### Authentication

| Method | Route | Description |
|--------|-------|-------------|
| POST | `/api/auth/register` | Create user (first user = admin; otherwise admin-only) |
| POST | `/api/auth/login` | Log in, returns JWT |
| POST | `/api/auth/logout` | Log out |
| GET | `/api/auth/me` | Current user |
| GET | `/api/auth/team` | List team (admin/manager) |

### Leads

| Method | Route | Description |
|--------|-------|-------------|
| GET | `/api/leads` | List leads (with optional filters) |
| POST | `/api/leads` | Create lead |
| PATCH | `/api/leads/:id` | Update lead |
| PATCH | `/api/leads/:id/stage` | Move pipeline stage |
| PATCH | `/api/leads/:id/assign` | Assign to an agent |
| POST | `/api/leads/bulk` | Bulk import with duplicate detection |
| DELETE | `/api/leads/:id` | Delete lead |
| PUT | `/api/leads/:id/follow-up` | Manage follow-up task |
| POST/DELETE | `/api/leads/:id/meetings` | Manage meetings |
| GET | `/api/leads/export/csv` | Export leads as CSV |

### Pitches

| Method | Route | Description |
|--------|-------|-------------|
| GET | `/api/pitches` | List pitches |
| POST | `/api/pitches/generate` | Generate + save a pitch for a lead |
| PATCH | `/api/pitches/:id` | Edit a pitch |
| POST | `/api/pitches/:id/send` | Send via SMTP |
| DELETE | `/api/pitches/:id` | Delete pitch |

### AI

| Method | Route | Description |
|--------|-------|-------------|
| POST | `/api/ai/cities` | Find major cities in a region |
| POST | `/api/ai/leads` | Discover leads in a city |
| POST | `/api/ai/verify` | Verify email authenticity |
| POST | `/api/ai/pitch` | Generate outreach pitch |

### Settings (Admin)

| Method | Route | Description |
|--------|-------|-------------|
| GET | `/api/settings` | Definitions + masked values + bootstrap info |
| PUT | `/api/settings` | Update settings (blank secrets are ignored) |
| POST | `/api/settings/test/ai` | Verify Gemini config |
| POST | `/api/settings/test/email` | Verify SMTP config |
| POST | `/api/settings/company-logo` | Upload company logo |
| DELETE | `/api/settings/company-logo` | Remove company logo |

### Webhooks

| Method | Route | Description |
|--------|-------|-------------|
| POST | `/api/webhooks/resend` | Resend delivery tracking webhook |

### Other

| Method | Route | Description |
|--------|-------|-------------|
| GET | `/api/stats` | Dashboard analytics |
| GET | `/api/stats/activity` | Activity log |
| GET | `/api/health` | Health / config status |

---

## Development

### Project Structure

```
LeadScout-Pro-AI/
├── server/
│   ├── routes/          # Express route handlers
│   ├── services/        # Business logic (AI, email, settings, CRM)
│   ├── utils/           # Helpers (normalize, API client)
│   └── middleware/      # Auth, validation, error handling
├── components/          # React UI components
│   ├── AppHeader.tsx
│   ├── AppFooter.tsx
│   ├── ScoutTab.tsx
│   ├── OutreachTab.tsx
│   ├── PitchPreviewModal.tsx
│   ├── AppModals.tsx
│   └── ...
├── hooks/               # Custom React hooks
├── services/            # Frontend service layer (API calls)
├── types.ts             # TypeScript type definitions
├── constants.ts         # Shared constants (focus options, languages)
├── App.tsx              # Main app component
├── server.ts            # Express server entry point
├── index.html           # Vite entry HTML
└── prisma/
    └── schema.prisma    # Database schema
```

### Scripts

| Command | Description |
|---------|-------------|
| `npm run dev` | Start dev server with hot reload |
| `npm run build` | Build frontend + bundle server to `dist/` |
| `npm run start` | Run production server |
| `npm run typecheck` | Run TypeScript compiler (no emit) |
| `npm run prisma:generate` | Generate Prisma client |
| `npm run prisma:migrate` | Create migration (development) |
| `npm run prisma:deploy` | Apply migrations (production) |
| `npm run prisma:studio` | Open Prisma Studio |
| `npm run db:seed` | Seed initial admin user |
| `npm run setup` | Run generate + migrate + seed |

### Adding a New Industry Focus

1. Add the new value to `LeadFocus` union in `types.ts`
2. Add an entry to `FOCUS_OPTIONS` in `constants.ts`
3. Add prompts to `FOCUS_LEAD_PROMPTS` and `FOCUS_PITCH_DESCRIPTIONS` in `server/services/ai.service.ts`

The dropdown UI updates automatically.

---

## Production Deployment

### 1. Build

```bash
npm run build
```

This creates:
- `dist/server.cjs` — bundled server
- `dist/` — static frontend assets

### 2. Run migrations

```bash
npm run prisma:deploy
```

### 3. Start

```bash
npm start
```

### 4. Configure reverse proxy (recommended)

Use Nginx or Caddy to proxy `https://your-domain.com` → `http://localhost:3000`.

### 5. Set production environment variables

Ensure these are set in your production environment:
- `DATABASE_URL` — production PostgreSQL
- `JWT_SECRET` — strong random secret
- `GEMINI_API_KEY` — production Gemini key
- `SMTP_*` — production SMTP credentials
- `RESEND_WEBHOOK_SECRET` — if using Resend webhooks
- `NODE_ENV=production`

---

## Troubleshooting

### Port already in use

```bash
# Find what's using port 3000 (Windows)
netstat -ano | findstr :3000
# Kill the process
taskkill /PID <PID> /F
```

Or change the port in `.env`:
```
PORT=3001
```

### Database connection errors

- Verify PostgreSQL is running:
  ```bash
  # Windows (if installed as service)
  Get-Service -Name "postgresql*"
  ```
- Check `DATABASE_URL` format: `postgresql://USER:PASSWORD@localhost:5432/DATABASE?schema=public`
- Ensure the database exists:
  ```bash
  psql -U postgres -c "CREATE DATABASE carrierscout;"
  ```

### Gemini API errors

- Verify `GEMINI_API_KEY` is set in `.env`
- Check API key permissions in [Google AI Studio](https://aistudio.google.com/)
- Use the **Test AI Connection** button in Settings for diagnostics

### SMTP / Email not sending

- Verify SMTP credentials in Settings → Email Sending
- Use the **Test Email Connection** button
- Check spam folder for test emails
- For Gmail, use an [App Password](https://support.google.com/accounts/answer/185833) if 2FA is enabled
- For Outlook/365, ensure SMTP is enabled in the admin portal

### Resend webhook not working

- Verify webhook URL is `https://your-domain/api/webhooks/resend`
- Check `RESEND_WEBHOOK_SECRET` matches the Resend signing secret
- Check server logs for incoming webhook requests
- Without the secret, the endpoint accepts all events (useful for local testing)

### Prisma migration issues

```bash
# Reset database (WARNING: deletes all data)
npx prisma migrate reset

# Or manually drop and recreate
npm run prisma:generate
npm run prisma:migrate
npm run db:seed
```

---

## License

Proprietary. All rights reserved.

---

<p align="center">
  Built with React, Express, PostgreSQL, Prisma, and Google Gemini.
</p>
