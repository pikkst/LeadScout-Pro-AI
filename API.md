# LeadScout PRO AI - REST API Documentation

Base URL: `/api`

All endpoints require authentication via session cookie or `Authorization: Bearer <token>` header.

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

## Sequences

### List sequences
```
GET /api/sequences
```

### Create sequence
```
POST /api/sequences
```

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
  "agenda": "Product demo"
}
```

### List meetings
```
GET /api/calendar/meetings?agentId=<id>&leadId=<id>
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
- `svix-signature` - Resend signature for verification
- `svix-timestamp` - Timestamp for signature verification

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
