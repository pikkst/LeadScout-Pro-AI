# LeadScout PRO AI - REST API Documentation

Base URL: `/api`

All endpoints require authentication via an `Authorization: Bearer <token>` header.

## Notifications

```text
GET /api/auth/notifications
PATCH /api/auth/notifications/read-all
```

The list includes a persisted `read` flag. The mutation marks all notifications belonging to the authenticated user as read.

## Leads

### List leads
```
GET /api/leads
```

Query params:
- `stage` - Filter by stage (Discovered, Contacted, Negotiation, Signed, Active, Archived)
- `focus` - Filter by focus segment
- `mine` - Boolean, only leads assigned to current user
- `search` - Search in name, email, website

### Get lead
```
GET /api/leads/:id
```

### Create lead
```
POST /api/leads
```

Body:
```json
{
  "name": "Acme Corp",
  "website": "https://acme.com",
  "email": "info@acme.com",
  "category": "voip_carriers",
  "description": "Leading VoIP provider",
  "phone": "+37212345678",
  "focus": "voip_carriers",
  "source": "MANUAL",
  "estimatedValue": 5000
}
```

### Update lead
```
PUT /api/leads/:id
```

### Delete lead
```
DELETE /api/leads/:id
```

### Bulk update stage
```
POST /api/leads/bulk-stage
```

Body:
```json
{
  "leadIds": ["id1", "id2"],
  "stage": "CONTACTED"
}
```

### Check duplicates
```
POST /api/leads/check-duplicate
```

Body:
```json
{
  "name": "Acme",
  "email": "info@acme.com",
  "domain": "acme.com"
}
```

## Pitches

### List pitches
```
GET /api/pitches
```

### Create pitch
```
POST /api/pitches
```

### Send pitch
```
POST /api/pitches/:id/send
```

Manual sends use the authenticated sender's email as `Reply-To`. Scheduled sends use the configured inbound mailbox so replies can be matched automatically.

### Schedule pitch
```
POST /api/pitches/:id/schedule
```

Response: updated pitch with `scheduledSendAt` set to the AI-recommended delivery time.

```json
{
  "id": "pitch-id",
  "status": "DRAFT",
  "scheduledSendAt": "2026-07-22T10:00:00.000Z",
  ...
}
```

### Generate pitches for leads
```
POST /api/pitches/generate
```

Body:
```json
{
  "leadIds": ["id1", "id2"],
  "language": "English",
  "templateId": "template-id"
}
```

## AI Intelligence

### Calculate AI lead score
```
POST /api/ai/score/:leadId
```

Body:
```json
{
  "leadId": "lead-id"
}
```

Response: updated lead with `aiScore` (0-100) and `aiScoreReason`.

### Enrich lead data
```
POST /api/ai/enrich/:leadId
```

Body:
```json
{
  "leadId": "lead-id"
}
```

Response: updated lead with `enrichmentData` (company size, tech stack, recent news, decision makers).

### Predict stage transition
```
POST /api/ai/predict/:leadId
```

Body:
```json
{
  "leadId": "lead-id"
}
```

Response:
```json
{
  "predictedStage": "Negotiation",
  "probability": 75,
  "estimatedDays": 5,
  "reasoning": "Lead has high engagement and verified contacts."
}
```

### Generate meeting prep
```
POST /api/ai/meeting-prep/:meetingId
```

Body:
```json
{
  "meetingId": "meeting-id"
}
```

Response:
```json
{
  "talkingPoints": ["Review their current setup", "Discuss integration timeline"],
  "winThemes": ["Cost savings", "Scalability"],
  "potentialObjections": ["Budget", "Timing"],
  "recommendedApproach": "Lead with ROI data and offer a pilot program."
}
```

## Optimization

### Get send-time recommendation
```
POST /api/optimization/send-time/:leadId
```

Body:
```json
{
  "leadId": "lead-id",
  "agentId": "agent-id"
}
```

Response:
```json
{
  "id": "rec-id",
  "leadId": "lead-id",
  "recommendedHour": 10,
  "recommendedDay": "Tuesday",
  "confidence": 85,
  "reason": "Historical open rates peak at this time",
  "createdAt": "2026-07-21T..."
}
```

### List send-time recommendations
```
GET /api/optimization/send-time/:leadId
```

### Generate coaching insights
```
POST /api/optimization/coaching/generate
```

Response:
```json
[
  {
    "id": "coaching-id",
    "agentId": "agent-id",
    "insightType": "CONVERSION_RATE",
    "title": "Improve follow-up timing",
    "description": "Your conversion rate is below average...",
    "priority": "MEDIUM",
    "isRead": false,
    "isResolved": false,
    "createdAt": "2026-07-21T..."
  }
]
```

### Get my coaching insights
```
GET /api/optimization/coaching/me
```

### Mark coaching insight as read
```
PATCH /api/optimization/coaching/:id/read
```

### Resolve coaching insight
```
PATCH /api/optimization/coaching/:id/resolve
```

## Monitoring

### Get monitoring alerts for lead
```
GET /api/monitoring/lead/:leadId
```

### Check competitors for lead
```
POST /api/monitoring/lead/:leadId/check
```

Body:
```json
{
  "leadId": "lead-id"
}
```

Response:
```json
[
  {
    "id": "alert-id",
    "leadId": "lead-id",
    "type": "COMPETITOR",
    "title": "Competitor alert: Test Corp",
    "description": "Test Corp launched a new product...",
    "source": "AI Generated",
    "isRead": false,
    "createdAt": "2026-07-21T..."
  }
]
```

### Mark alert as read
```
PATCH /api/monitoring/:id/read
```

## Sequences

### List sequences
```
GET /api/sequences
```

### Create sequence
```
POST /api/sequences
```

Body:
```json
{
  "name": "Cold Outreach",
  "description": "Initial outreach sequence",
  "triggerStage": "Discovered",
  "isActive": true,
  "steps": [
    {
      "order": 0,
      "delayDays": 2,
      "actionType": "TASK",
      "taskName": "Send initial email",
      "isActive": true,
      "triggerEvent": "OPENED",
      "eventDelayDays": 1,
      "stopOnEvent": false
    }
  ]
}
```

Step fields:
- `delayDays` — days to wait before executing step (default)
- `triggerEvent` — pitch event that triggers this step (OPENED, CLICKED, REPLIED, etc.)
- `eventDelayDays` — delay in days when trigger event fires (overrides `delayDays`)
- `stopOnEvent` — if true, complete sequence when trigger event fires

### Start sequence for lead
```
POST /api/sequences/:id/start/:leadId
```

## Revenue

### Get stats
```
GET /api/revenue/stats
```

### List deals
```
GET /api/revenue/deals?agentId=<id>&startDate=<date>&endDate=<date>
```

### Create deal
```
POST /api/revenue/deals
```

Body:
```json
{
  "leadId": "lead-id",
  "value": 10000,
  "commissionRate": 10,
  "agentId": "agent-id",
  "notes": "Enterprise deal"
}
```

### Leaderboard
```
GET /api/revenue/leaderboard
```

## Calendar

### Weekly availability

```text
GET /api/calendar/availability?agentId=<id>
POST /api/calendar/availability
```

The POST route stores recurring weekly work hours and materializes conflict-safe slots for up to 26 weeks. Agents may update themselves; admins and managers may update another user.

```json
{
  "startDate": "2026-07-27",
  "weeks": 12,
  "slotDuration": 30,
  "timezone": "Europe/Tallinn",
  "days": [
    { "weekday": 1, "startTime": "08:00", "endTime": "17:00" },
    { "weekday": 2, "startTime": "08:00", "endTime": "17:00" },
    { "weekday": 3, "startTime": "08:00", "endTime": "17:00" },
    { "weekday": 4, "startTime": "08:00", "endTime": "17:00" },
    { "weekday": 5, "startTime": "08:00", "endTime": "17:00" }
  ]
}
```

### List available slots
```
GET /api/calendar/slots?agentId=<id>&date=<YYYY-MM-DD>
```

### Create slot
```
POST /api/calendar/slots
```

Body:
```json
{
  "date": "2026-07-25",
  "startTime": "09:00",
  "endTime": "17:00",
  "agentId": "agent-id"
}
```

### Book meeting
```
POST /api/calendar/book
```

Body:
```json
{
  "slotId": "slot-id",
  "leadId": "lead-id",
  "title": "Demo Meeting",
  "agenda": "Product demo",
  "pitchId": "optional-pitch-id"
}
```

`pitchId`, when supplied, must be a non-empty string. Agents may book only their own slots; admins and managers may book any agent's slot.

### List meetings
```
GET /api/calendar/meetings?agentId=<id>&leadId=<id>
```

### Public booking page

```text
GET /api/public/booking/:token
POST /api/public/booking/:token
```

Each sent pitch receives a 256-bit, expiring, single-use capability token and a `/book/:token` call-to-action. The public GET returns only future unbooked slots and masked attendee details. The POST atomically claims both the link and one slot, creates the meeting, notifies the agent, sends both parties a timezone-aware ICS calendar invitation, and advances the lead from `DISCOVERED` to `CONTACTED` or `CONTACTED` to `NEGOTIATION`.

```json
{
  "slotId": "slot-id",
  "agenda": "Topics to discuss"
}
```

## Documents

### List templates
```
GET /api/documents/templates
```

### Create template
```
POST /api/documents/templates
```

### Generate document
```
POST /api/documents/generate
```

Body:
```json
{
  "templateId": "template-id",
  "leadId": "lead-id",
  "title": "Proposal for Acme",
  "variables": {"custom_field": "value"}
}
```

## Stats

### Dashboard stats
```
GET /api/stats
```

### Forecast
```
GET /api/stats/forecast
```

### AI Forecast
```
GET /api/stats/forecast/ai
```

Response:
```json
{
  "next30Days": { "estimatedDeals": 12, "estimatedValue": 45000 },
  "next90Days": { "estimatedDeals": 35, "estimatedValue": 120000 },
  "confidence": 78,
  "assumptions": ["Conversion rates stable", "No major market shifts"]
}
```

### Conversion by segment
```
GET /api/stats/conversion
```

### Agent performance
```
GET /api/stats/agent-performance
```

## Webhooks

### Resend webhook
```
POST /api/webhooks/resend
```

Headers:
- `svix-id` - unique webhook delivery ID (also used for replay protection)
- `svix-signature` - Resend signature for verification
- `svix-timestamp` - Timestamp for signature verification

`RESEND_WEBHOOK_SECRET` is required. Missing configuration returns `503`; invalid or replayed signatures return `401`.

## Inbound

### Resend inbound webhook
```
POST /api/inbound/resend
```

Accepts Resend `email.received` events. The server fetches the full email via Resend API, parses `In-Reply-To`/`References`, and if it matches a sent pitch’s `Message-ID`, updates the pitch status to `REPLIED` and advances the lead to `NEGOTIATION`.

Request body shape:
```json
{
  "type": "email.received",
  "data": {
    "email_id": "resend-email-id"
  }
}
```

The `svix-id`, `svix-timestamp`, and `svix-signature` headers are required and are verified against the unmodified raw request body before the inbound event is processed.

Response:
```json
{
  "ok": true,
  "matched": true,
  "pitchId": "pitch-id"
}
```

## Events

### List events
```
GET /api/events
```

### Create event
```
POST /api/events
```

## Authentication

### Login
```
POST /api/auth/login
```

Body:
```json
{
  "email": "user@example.com",
  "password": "password"
}
```

### Register
```
POST /api/auth/register
```

Body:
```json
{
  "name": "John Doe",
  "email": "user@example.com",
  "password": "password",
  "role": "AGENT"
}
```

### Logout
```
POST /api/auth/logout
```

### Current user
```
GET /api/auth/me
```

## Admin — User Management
All admin endpoints require the `ADMIN` role.

### List all users
```
GET /api/admin/users
```

### Create user
```
POST /api/admin/users
```

Body:
```json
{
  "name": "Jane Agent",
  "email": "jane@unitelglobal.com",
  "password": "securePassword123",
  "role": "AGENT",
  "isActive": true
}
```

### Update user
```
PATCH /api/admin/users/:id
```

Body (all fields optional):
```json
{
  "name": "Jane Agent",
  "email": "jane@unitelglobal.com",
  "role": "MANAGER",
  "isActive": false,
  "password": "newSecurePassword123"
}
```

### Delete user
```
DELETE /api/admin/users/:id
```

## Settings

### Get settings
```
GET /api/settings
```

### Update AI settings
```
POST /api/settings/ai
```

Body:
```json
{
  "geminiApiKey": "key",
  "geminiModel": "gemini-2.5-flash"
}
```

### Update email settings
```
POST /api/settings/email
```

Body:
```json
{
  "smtpHost": "smtp.gmail.com",
  "smtpPort": 587,
  "smtpUser": "user@gmail.com",
  "smtpPassword": "app-password",
  "fromEmail": "noreply@example.com",
  "fromName": "LeadScout"
}
```

## Health Check

```
GET /api/health
```

Response:
```json
{
  "status": "ok",
  "time": "2026-07-20T...",
  "aiConfigured": true,
  "emailConfigured": true
}
```
