-- CreateSchema
CREATE SCHEMA IF NOT EXISTS "public";

-- CreateEnum
CREATE TYPE "Role" AS ENUM ('ADMIN', 'MANAGER', 'AGENT');

-- CreateEnum
CREATE TYPE "OpportunityStatus" AS ENUM ('OPEN', 'WON', 'LOST');

-- CreateEnum
CREATE TYPE "RelationshipType" AS ENUM ('PROSPECT', 'CUSTOMER', 'PARTNER', 'RECRUITING', 'CHANNEL', 'OTHER');

-- CreateEnum
CREATE TYPE "RelationshipStatus" AS ENUM ('ACTIVE', 'PAUSED', 'CLOSED');

-- CreateEnum
CREATE TYPE "LeadSource" AS ENUM ('AI_SCOUT', 'MANUAL', 'CSV_IMPORT', 'PITCH_REPLY', 'OTHER');

-- CreateEnum
CREATE TYPE "MeetingType" AS ENUM ('CALL', 'MEETING', 'DEMO', 'FOLLOW_UP');

-- CreateEnum
CREATE TYPE "PitchStatus" AS ENUM ('DRAFT', 'SENDING', 'SENT', 'DELIVERED', 'REPLIED', 'FAILED');

-- CreateEnum
CREATE TYPE "IntegrationProvider" AS ENUM ('GOOGLE', 'MICROSOFT');

-- CreateEnum
CREATE TYPE "IntegrationStatus" AS ENUM ('ACTIVE', 'NEEDS_REAUTH', 'DISCONNECTED', 'ERROR');

-- CreateEnum
CREATE TYPE "ConversationStatus" AS ENUM ('OPEN', 'WAITING', 'SNOOZED', 'DONE');

-- CreateEnum
CREATE TYPE "MessageDirection" AS ENUM ('INBOUND', 'OUTBOUND');

-- CreateEnum
CREATE TYPE "RelationshipSentiment" AS ENUM ('POSITIVE', 'NEUTRAL', 'NEGATIVE');

-- CreateEnum
CREATE TYPE "RelationshipIntent" AS ENUM ('INTERESTED', 'MEETING_REQUEST', 'QUESTION', 'OBJECTION', 'UNSUBSCRIBE', 'OTHER');

-- CreateEnum
CREATE TYPE "TimelineEntryType" AS ENUM ('EMAIL', 'REPLY', 'MEETING', 'TASK', 'NOTE', 'DOCUMENT', 'STAGE_CHANGE', 'OPPORTUNITY', 'UNSUBSCRIBE', 'BOUNCE');

-- CreateEnum
CREATE TYPE "ExternalCalendarEventStatus" AS ENUM ('CONFIRMED', 'TENTATIVE', 'CANCELLED');

-- CreateEnum
CREATE TYPE "PitchEventType" AS ENUM ('SENT', 'DELIVERED', 'OPENED', 'CLICKED', 'REPLIED', 'BOUNCED', 'COMPLAINED', 'FAILED');

-- CreateEnum
CREATE TYPE "CustomFieldType" AS ENUM ('TEXT', 'NUMBER', 'DATE', 'SELECT', 'MULTISELECT', 'BOOLEAN');

-- CreateEnum
CREATE TYPE "SequenceActionType" AS ENUM ('EMAIL', 'TASK', 'WEBHOOK');

-- CreateEnum
CREATE TYPE "SequenceExecutionStatus" AS ENUM ('ACTIVE', 'PAUSED', 'COMPLETED', 'STOPPED');

-- CreateEnum
CREATE TYPE "SequenceStopEvent" AS ENUM ('REPLY', 'UNSUBSCRIBE', 'BOUNCE', 'MEETING', 'SUCCESS');

-- CreateEnum
CREATE TYPE "CommissionStatus" AS ENUM ('PENDING', 'PAID', 'CANCELLED');

-- CreateEnum
CREATE TYPE "RoutingRuleType" AS ENUM ('TERRITORY', 'INDUSTRY', 'ROUND_ROBIN', 'MANUAL', 'SCORE_BASED');

-- CreateEnum
CREATE TYPE "DocumentType" AS ENUM ('PROPOSAL', 'CONTRACT', 'NDA', 'QUOTE', 'INVOICE', 'CUSTOM');

-- CreateEnum
CREATE TYPE "MonitoringType" AS ENUM ('NEWS', 'EVENT', 'FUNDING', 'HIRING', 'COMPETITOR', 'CUSTOM');

-- CreateEnum
CREATE TYPE "PlaybookType" AS ENUM ('OUTREACH', 'QUALIFICATION', 'NURTURING', 'CUSTOM');

-- CreateEnum
CREATE TYPE "PlaybookStatus" AS ENUM ('DRAFT', 'TESTING', 'PUBLISHED', 'ARCHIVED');

-- CreateEnum
CREATE TYPE "PlaybookVersionStatus" AS ENUM ('DRAFT', 'PENDING_APPROVAL', 'APPROVED', 'REJECTED', 'PUBLISHED', 'ROLLED_BACK');

-- CreateEnum
CREATE TYPE "TestModeStatus" AS ENUM ('IDLE', 'RUNNING', 'COMPLETED', 'FAILED');

-- CreateEnum
CREATE TYPE "AttributionOutcome" AS ENUM ('POSITIVE_REPLY', 'QUALIFIED_MEETING', 'STAGE_CHANGE', 'WIN', 'REVENUE');

-- CreateEnum
CREATE TYPE "QualificationFramework" AS ENUM ('BANT', 'MEDDPICC', 'SPICED', 'CUSTOM');

-- CreateEnum
CREATE TYPE "ApprovalStatus" AS ENUM ('PENDING', 'APPROVED', 'REJECTED');

-- CreateEnum
CREATE TYPE "WebhookEventType" AS ENUM ('PLAYBOOK_PUBLISHED', 'STAGE_CHANGED', 'ATTRIBUTION_UPDATED', 'APPROVAL_REQUESTED', 'APPROVAL_DECIDED', 'DEAL_STALLED', 'SLA_BREACHED');

-- CreateEnum
CREATE TYPE "RetryPolicy" AS ENUM ('NONE', 'LINEAR', 'EXPONENTIAL');

-- CreateEnum
CREATE TYPE "SignalType" AS ENUM ('HIRING', 'FUNDING', 'LEADERSHIP_CHANGE', 'TECHNOLOGY', 'INTENT', 'PRODUCT_USAGE', 'RENEWAL', 'RELATIONSHIP_ACTIVITY');

-- CreateEnum
CREATE TYPE "AgentType" AS ENUM ('RESEARCH', 'ROUTING', 'BRIEFING', 'FOLLOW_UP', 'CRM_HYGIENE');

-- CreateEnum
CREATE TYPE "AgentStatus" AS ENUM ('IDLE', 'RUNNING', 'PAUSED', 'COMPLETED', 'FAILED', 'AWAITING_APPROVAL');

-- CreateEnum
CREATE TYPE "PackVisibility" AS ENUM ('PRIVATE', 'CURATED');

-- CreateTable
CREATE TABLE "users" (
    "id" TEXT NOT NULL,
    "email" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "passwordHash" TEXT NOT NULL,
    "role" "Role" NOT NULL DEFAULT 'AGENT',
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "users_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "app_settings" (
    "key" TEXT NOT NULL,
    "value" TEXT NOT NULL DEFAULT '',
    "isSecret" BOOLEAN NOT NULL DEFAULT false,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "updatedById" TEXT,

    CONSTRAINT "app_settings_pkey" PRIMARY KEY ("key")
);

-- CreateTable
CREATE TABLE "leads" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "website" TEXT NOT NULL,
    "domain" TEXT NOT NULL,
    "category" TEXT NOT NULL,
    "email" TEXT NOT NULL,
    "description" TEXT NOT NULL DEFAULT '',
    "phone" TEXT,
    "sourceUrl" TEXT,
    "focus" TEXT,
    "source" "LeadSource" NOT NULL DEFAULT 'AI_SCOUT',
    "isVerified" BOOLEAN NOT NULL DEFAULT false,
    "stage" TEXT NOT NULL DEFAULT 'DISCOVERED',
    "notes" TEXT NOT NULL DEFAULT '',
    "estimatedValue" INTEGER NOT NULL DEFAULT 0,
    "aiScore" INTEGER,
    "aiScoreReason" TEXT,
    "enrichmentData" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "lastContactedAt" TIMESTAMP(3),
    "assignedAgentId" TEXT,
    "createdById" TEXT,
    "accountId" TEXT,

    CONSTRAINT "leads_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "accounts" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "domain" TEXT,
    "website" TEXT,
    "industry" TEXT,
    "description" TEXT NOT NULL DEFAULT '',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "ownerId" TEXT,

    CONSTRAINT "accounts_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "contacts" (
    "id" TEXT NOT NULL,
    "fullName" TEXT NOT NULL,
    "firstName" TEXT,
    "lastName" TEXT,
    "email" TEXT NOT NULL,
    "phone" TEXT,
    "title" TEXT,
    "consentStatus" TEXT NOT NULL DEFAULT 'UNKNOWN',
    "consentSource" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "accountId" TEXT NOT NULL,
    "ownerId" TEXT,
    "legacyLeadId" TEXT,

    CONSTRAINT "contacts_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "opportunities" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "stage" TEXT NOT NULL DEFAULT 'DISCOVERY',
    "status" "OpportunityStatus" NOT NULL DEFAULT 'OPEN',
    "value" INTEGER NOT NULL DEFAULT 0,
    "currency" TEXT NOT NULL DEFAULT 'EUR',
    "probability" INTEGER NOT NULL DEFAULT 10,
    "expectedCloseAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "accountId" TEXT NOT NULL,
    "primaryContactId" TEXT,
    "legacyLeadId" TEXT,
    "ownerId" TEXT,

    CONSTRAINT "opportunities_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "relationships" (
    "id" TEXT NOT NULL,
    "type" "RelationshipType" NOT NULL DEFAULT 'PROSPECT',
    "status" "RelationshipStatus" NOT NULL DEFAULT 'ACTIVE',
    "strength" INTEGER NOT NULL DEFAULT 0,
    "lastInteractionAt" TIMESTAMP(3),
    "nextActionAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "accountId" TEXT NOT NULL,
    "contactId" TEXT,
    "opportunityId" TEXT,
    "legacyLeadId" TEXT,
    "ownerId" TEXT,

    CONSTRAINT "relationships_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "follow_up_tasks" (
    "id" TEXT NOT NULL,
    "taskName" TEXT NOT NULL,
    "dueDate" TIMESTAMP(3) NOT NULL,
    "isCompleted" BOOLEAN NOT NULL DEFAULT false,
    "notes" TEXT NOT NULL DEFAULT '',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "leadId" TEXT NOT NULL,

    CONSTRAINT "follow_up_tasks_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "meetings" (
    "id" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "date" TEXT NOT NULL,
    "time" TEXT NOT NULL,
    "duration" INTEGER NOT NULL DEFAULT 30,
    "type" "MeetingType" NOT NULL DEFAULT 'CALL',
    "agenda" TEXT NOT NULL DEFAULT '',
    "link" TEXT,
    "timezone" TEXT NOT NULL DEFAULT 'Europe/Tallinn',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "leadId" TEXT NOT NULL,
    "pitchId" TEXT,
    "agentId" TEXT,

    CONSTRAINT "meetings_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "meeting_slots" (
    "id" TEXT NOT NULL,
    "date" TEXT NOT NULL,
    "startTime" TEXT NOT NULL,
    "endTime" TEXT NOT NULL,
    "timezone" TEXT NOT NULL DEFAULT 'Europe/Tallinn',
    "isAvailable" BOOLEAN NOT NULL DEFAULT true,
    "isBooked" BOOLEAN NOT NULL DEFAULT false,
    "agentId" TEXT NOT NULL,
    "meetingId" TEXT,

    CONSTRAINT "meeting_slots_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "webhook_receipts" (
    "id" TEXT NOT NULL,
    "provider" TEXT NOT NULL,
    "providerEventId" TEXT NOT NULL,
    "receivedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "webhook_receipts_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "availability_rules" (
    "id" TEXT NOT NULL,
    "weekday" INTEGER NOT NULL,
    "startTime" TEXT NOT NULL,
    "endTime" TEXT NOT NULL,
    "slotDuration" INTEGER NOT NULL DEFAULT 30,
    "timezone" TEXT NOT NULL DEFAULT 'Europe/Tallinn',
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "agentId" TEXT NOT NULL,

    CONSTRAINT "availability_rules_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "booking_links" (
    "id" TEXT NOT NULL,
    "token" TEXT NOT NULL,
    "expiresAt" TIMESTAMP(3) NOT NULL,
    "bookedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "pitchId" TEXT NOT NULL,
    "leadId" TEXT NOT NULL,
    "agentId" TEXT NOT NULL,
    "meetingId" TEXT,

    CONSTRAINT "booking_links_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "pitches" (
    "id" TEXT NOT NULL,
    "subject" TEXT NOT NULL,
    "htmlContent" TEXT NOT NULL,
    "textContent" TEXT NOT NULL,
    "language" TEXT NOT NULL DEFAULT 'English',
    "status" "PitchStatus" NOT NULL DEFAULT 'DRAFT',
    "opened" BOOLEAN NOT NULL DEFAULT false,
    "sentAt" TIMESTAMP(3),
    "scheduledSendAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "leadId" TEXT NOT NULL,
    "leadName" TEXT NOT NULL,
    "leadEmail" TEXT NOT NULL,
    "createdById" TEXT,
    "sentFromEmail" TEXT,
    "sentFromName" TEXT,
    "replyToEmail" TEXT,
    "sentMessageId" TEXT,
    "inReplyToId" TEXT,

    CONSTRAINT "pitches_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "activity_logs" (
    "id" TEXT NOT NULL,
    "action" TEXT NOT NULL,
    "detail" TEXT NOT NULL DEFAULT '',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "readAt" TIMESTAMP(3),
    "userId" TEXT,
    "leadId" TEXT,

    CONSTRAINT "activity_logs_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "integration_connections" (
    "id" TEXT NOT NULL,
    "provider" "IntegrationProvider" NOT NULL,
    "status" "IntegrationStatus" NOT NULL DEFAULT 'ACTIVE',
    "accountEmail" TEXT,
    "scopes" TEXT[] DEFAULT ARRAY[]::TEXT[],
    "accessToken" TEXT NOT NULL,
    "refreshToken" TEXT,
    "expiresAt" TIMESTAMP(3),
    "mailCursor" TEXT,
    "calendarCursor" TEXT,
    "lastMailSyncAt" TIMESTAMP(3),
    "lastCalendarSyncAt" TIMESTAMP(3),
    "lastError" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "userId" TEXT NOT NULL,

    CONSTRAINT "integration_connections_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "oauth_sessions" (
    "id" TEXT NOT NULL,
    "stateHash" TEXT NOT NULL,
    "provider" "IntegrationProvider" NOT NULL,
    "codeVerifier" TEXT NOT NULL,
    "returnTo" TEXT,
    "expiresAt" TIMESTAMP(3) NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "userId" TEXT NOT NULL,

    CONSTRAINT "oauth_sessions_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "conversations" (
    "id" TEXT NOT NULL,
    "externalThreadId" TEXT NOT NULL,
    "subject" TEXT NOT NULL DEFAULT '',
    "participants" JSONB,
    "status" "ConversationStatus" NOT NULL DEFAULT 'OPEN',
    "unreadCount" INTEGER NOT NULL DEFAULT 0,
    "summary" TEXT,
    "sentiment" "RelationshipSentiment" NOT NULL DEFAULT 'NEUTRAL',
    "intent" "RelationshipIntent" NOT NULL DEFAULT 'OTHER',
    "suggestedReply" TEXT,
    "slaDueAt" TIMESTAMP(3),
    "snoozedUntil" TIMESTAMP(3),
    "lastMessageAt" TIMESTAMP(3) NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "connectionId" TEXT NOT NULL,
    "accountId" TEXT,
    "contactId" TEXT,
    "legacyLeadId" TEXT,
    "ownerId" TEXT,

    CONSTRAINT "conversations_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "conversation_messages" (
    "id" TEXT NOT NULL,
    "externalMessageId" TEXT NOT NULL,
    "internetMessageId" TEXT,
    "direction" "MessageDirection" NOT NULL,
    "senderEmail" TEXT NOT NULL,
    "recipientEmails" JSONB NOT NULL,
    "ccEmails" JSONB,
    "subject" TEXT NOT NULL DEFAULT '',
    "textBody" TEXT NOT NULL DEFAULT '',
    "occurredAt" TIMESTAMP(3) NOT NULL,
    "isRead" BOOLEAN NOT NULL DEFAULT false,
    "intent" "RelationshipIntent" NOT NULL DEFAULT 'OTHER',
    "sentiment" "RelationshipSentiment" NOT NULL DEFAULT 'NEUTRAL',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "conversationId" TEXT NOT NULL,

    CONSTRAINT "conversation_messages_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "timeline_entries" (
    "id" TEXT NOT NULL,
    "type" "TimelineEntryType" NOT NULL,
    "title" TEXT NOT NULL,
    "body" TEXT NOT NULL DEFAULT '',
    "metadata" JSONB,
    "sourceType" TEXT,
    "sourceId" TEXT,
    "dedupeKey" TEXT,
    "occurredAt" TIMESTAMP(3) NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "accountId" TEXT,
    "contactId" TEXT,
    "opportunityId" TEXT,
    "relationshipId" TEXT,
    "legacyLeadId" TEXT,
    "conversationId" TEXT,
    "messageId" TEXT,
    "actorId" TEXT,

    CONSTRAINT "timeline_entries_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "external_calendar_events" (
    "id" TEXT NOT NULL,
    "externalEventId" TEXT NOT NULL,
    "calendarId" TEXT NOT NULL DEFAULT 'primary',
    "title" TEXT NOT NULL,
    "description" TEXT NOT NULL DEFAULT '',
    "startAt" TIMESTAMP(3) NOT NULL,
    "endAt" TIMESTAMP(3) NOT NULL,
    "timezone" TEXT NOT NULL DEFAULT 'UTC',
    "status" "ExternalCalendarEventStatus" NOT NULL DEFAULT 'CONFIRMED',
    "isBusy" BOOLEAN NOT NULL DEFAULT true,
    "organizerEmail" TEXT,
    "attendeeEmails" JSONB,
    "etag" TEXT,
    "reminderMinutes" INTEGER,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "connectionId" TEXT NOT NULL,
    "accountId" TEXT,
    "contactId" TEXT,
    "legacyLeadId" TEXT,
    "meetingId" TEXT,

    CONSTRAINT "external_calendar_events_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "team_booking_pages" (
    "id" TEXT NOT NULL,
    "slug" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "description" TEXT NOT NULL DEFAULT '',
    "duration" INTEGER NOT NULL DEFAULT 30,
    "timezone" TEXT NOT NULL DEFAULT 'Europe/Tallinn',
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "team_booking_pages_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "team_booking_members" (
    "id" TEXT NOT NULL,
    "priority" INTEGER NOT NULL DEFAULT 100,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "lastAssignedAt" TIMESTAMP(3),
    "pageId" TEXT NOT NULL,
    "userId" TEXT NOT NULL,

    CONSTRAINT "team_booking_members_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "pitch_events" (
    "id" TEXT NOT NULL,
    "pitchId" TEXT NOT NULL,
    "type" "PitchEventType" NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "pitch_events_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "email_suppressions" (
    "id" TEXT NOT NULL,
    "email" TEXT NOT NULL,
    "reason" TEXT NOT NULL,
    "source" TEXT NOT NULL,
    "createdById" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "email_suppressions_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "unsubscribe_links" (
    "id" TEXT NOT NULL,
    "token" TEXT NOT NULL,
    "email" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "pitchId" TEXT NOT NULL,

    CONSTRAINT "unsubscribe_links_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "activation_events" (
    "id" TEXT NOT NULL,
    "type" TEXT NOT NULL,
    "userId" TEXT,
    "leadId" TEXT,
    "pitchId" TEXT,
    "metadata" JSONB,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "activation_events_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "pitch_templates" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "subject" TEXT NOT NULL,
    "htmlContent" TEXT NOT NULL,
    "textContent" TEXT NOT NULL,
    "focus" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "createdById" TEXT,

    CONSTRAINT "pitch_templates_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "custom_field_definitions" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "key" TEXT NOT NULL,
    "type" "CustomFieldType" NOT NULL DEFAULT 'TEXT',
    "options" TEXT,
    "isRequired" BOOLEAN NOT NULL DEFAULT false,
    "sortOrder" INTEGER NOT NULL DEFAULT 0,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "custom_field_definitions_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "custom_field_values" (
    "id" TEXT NOT NULL,
    "value" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "leadId" TEXT NOT NULL,
    "fieldId" TEXT NOT NULL,

    CONSTRAINT "custom_field_values_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "deal_stages" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "key" TEXT NOT NULL,
    "color" TEXT NOT NULL DEFAULT '#64748b',
    "sortOrder" INTEGER NOT NULL DEFAULT 0,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "deal_stages_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "follow_up_sequences" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "description" TEXT NOT NULL DEFAULT '',
    "triggerStage" TEXT NOT NULL,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "stopEvents" "SequenceStopEvent"[] DEFAULT ARRAY['REPLY', 'UNSUBSCRIBE', 'BOUNCE', 'MEETING']::"SequenceStopEvent"[],
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "follow_up_sequences_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "sequence_steps" (
    "id" TEXT NOT NULL,
    "order" INTEGER NOT NULL,
    "delayDays" INTEGER NOT NULL DEFAULT 0,
    "actionType" "SequenceActionType" NOT NULL DEFAULT 'TASK',
    "subject" TEXT,
    "body" TEXT,
    "taskName" TEXT,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "triggerEvent" "PitchEventType",
    "eventDelayDays" INTEGER,
    "stopOnEvent" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "sequenceId" TEXT NOT NULL,

    CONSTRAINT "sequence_steps_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "sequence_executions" (
    "id" TEXT NOT NULL,
    "status" "SequenceExecutionStatus" NOT NULL DEFAULT 'ACTIVE',
    "currentStep" INTEGER NOT NULL DEFAULT 0,
    "startedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "completedAt" TIMESTAMP(3),
    "nextRunAt" TIMESTAMP(3),
    "lastEventCheckedAt" TIMESTAMP(3),
    "triggeredStep" INTEGER,
    "processingStep" INTEGER,
    "processingStartedAt" TIMESTAMP(3),
    "stoppedByEvent" "SequenceStopEvent",
    "leadId" TEXT NOT NULL,
    "sequenceId" TEXT NOT NULL,

    CONSTRAINT "sequence_executions_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "deals" (
    "id" TEXT NOT NULL,
    "leadId" TEXT NOT NULL,
    "value" INTEGER NOT NULL,
    "commissionRate" DOUBLE PRECISION NOT NULL DEFAULT 10.0,
    "commission" INTEGER NOT NULL,
    "agentId" TEXT NOT NULL,
    "closedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "notes" TEXT NOT NULL DEFAULT '',

    CONSTRAINT "deals_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "commissions" (
    "id" TEXT NOT NULL,
    "dealId" TEXT NOT NULL,
    "agentId" TEXT NOT NULL,
    "amount" INTEGER NOT NULL,
    "status" "CommissionStatus" NOT NULL DEFAULT 'PENDING',
    "paidAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "commissions_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "lead_routing_rules" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "priority" INTEGER NOT NULL DEFAULT 0,
    "ruleType" "RoutingRuleType" NOT NULL,
    "criteria" TEXT NOT NULL,
    "assignedAgentId" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "lead_routing_rules_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "document_templates" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "type" "DocumentType" NOT NULL,
    "content" TEXT NOT NULL,
    "variables" TEXT NOT NULL DEFAULT '[]',
    "isDefault" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "document_templates_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "generated_documents" (
    "id" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "type" "DocumentType" NOT NULL,
    "content" TEXT NOT NULL,
    "pdfUrl" TEXT,
    "leadId" TEXT,
    "createdById" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "generated_documents_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "api_keys" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "key" TEXT NOT NULL,
    "keyPrefix" TEXT NOT NULL,
    "scopes" TEXT NOT NULL DEFAULT '[]',
    "isRevoked" BOOLEAN NOT NULL DEFAULT false,
    "lastUsedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "userId" TEXT NOT NULL,

    CONSTRAINT "api_keys_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "lead_monitoring" (
    "id" TEXT NOT NULL,
    "leadId" TEXT NOT NULL,
    "type" "MonitoringType" NOT NULL DEFAULT 'NEWS',
    "title" TEXT NOT NULL,
    "description" TEXT NOT NULL DEFAULT '',
    "source" TEXT,
    "isRead" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "lead_monitoring_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "send_time_optimizations" (
    "id" TEXT NOT NULL,
    "leadId" TEXT NOT NULL,
    "agentId" TEXT,
    "recommendedHour" INTEGER NOT NULL,
    "recommendedDay" TEXT NOT NULL,
    "confidence" INTEGER NOT NULL,
    "reason" TEXT NOT NULL DEFAULT '',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "lastUsedAt" TIMESTAMP(3),

    CONSTRAINT "send_time_optimizations_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "agent_coaching" (
    "id" TEXT NOT NULL,
    "agentId" TEXT NOT NULL,
    "insightType" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "description" TEXT NOT NULL,
    "priority" TEXT NOT NULL DEFAULT 'MEDIUM',
    "isRead" BOOLEAN NOT NULL DEFAULT false,
    "isResolved" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "agent_coaching_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "playbooks" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "description" TEXT NOT NULL DEFAULT '',
    "type" "PlaybookType" NOT NULL DEFAULT 'OUTREACH',
    "status" "PlaybookStatus" NOT NULL DEFAULT 'DRAFT',
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "createdById" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "playbooks_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "playbook_versions" (
    "id" TEXT NOT NULL,
    "version" INTEGER NOT NULL,
    "changelog" TEXT NOT NULL DEFAULT '',
    "status" "PlaybookVersionStatus" NOT NULL DEFAULT 'DRAFT',
    "isActive" BOOLEAN NOT NULL DEFAULT false,
    "rolledBackFromVersionId" TEXT,
    "playbookId" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "playbook_versions_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "playbook_steps" (
    "id" TEXT NOT NULL,
    "order" INTEGER NOT NULL,
    "name" TEXT NOT NULL,
    "description" TEXT NOT NULL DEFAULT '',
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "versionId" TEXT NOT NULL,

    CONSTRAINT "playbook_steps_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "playbook_conditions" (
    "id" TEXT NOT NULL,
    "operator" TEXT NOT NULL,
    "value" TEXT NOT NULL,
    "field" TEXT NOT NULL,
    "description" TEXT NOT NULL DEFAULT '',
    "versionId" TEXT NOT NULL,

    CONSTRAINT "playbook_conditions_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "playbook_actions" (
    "id" TEXT NOT NULL,
    "type" TEXT NOT NULL,
    "config" TEXT NOT NULL DEFAULT '{}',
    "description" TEXT NOT NULL DEFAULT '',
    "retryPolicy" "RetryPolicy" NOT NULL DEFAULT 'NONE',
    "maxAttempts" INTEGER NOT NULL DEFAULT 3,
    "versionId" TEXT NOT NULL,

    CONSTRAINT "playbook_actions_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "playbook_branches" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "condition" TEXT NOT NULL,
    "targetStepOrder" INTEGER NOT NULL,
    "versionId" TEXT NOT NULL,

    CONSTRAINT "playbook_branches_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "playbook_test_runs" (
    "id" TEXT NOT NULL,
    "status" "TestModeStatus" NOT NULL DEFAULT 'IDLE',
    "fakeLeadId" TEXT,
    "executionLog" TEXT NOT NULL DEFAULT '[]',
    "startedAt" TIMESTAMP(3),
    "completedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "createdById" TEXT NOT NULL,
    "versionId" TEXT NOT NULL,

    CONSTRAINT "playbook_test_runs_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "playbook_approvals" (
    "id" TEXT NOT NULL,
    "status" "ApprovalStatus" NOT NULL DEFAULT 'PENDING',
    "comment" TEXT NOT NULL DEFAULT '',
    "reviewedAt" TIMESTAMP(3),
    "reviewedById" TEXT,
    "versionId" TEXT NOT NULL,
    "requestedById" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "playbook_approvals_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "step_level_analytics" (
    "id" TEXT NOT NULL,
    "stepId" TEXT NOT NULL,
    "executions" INTEGER NOT NULL DEFAULT 0,
    "positiveReplies" INTEGER NOT NULL DEFAULT 0,
    "qualifiedMeetings" INTEGER NOT NULL DEFAULT 0,
    "stageChanges" INTEGER NOT NULL DEFAULT 0,
    "wins" INTEGER NOT NULL DEFAULT 0,
    "revenue" INTEGER NOT NULL DEFAULT 0,
    "dropoffRate" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "replyRate" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "conversionRate" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "confidenceInterval" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "sampleSizeWarning" BOOLEAN NOT NULL DEFAULT false,
    "lastCalculatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "step_level_analytics_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "playbook_attributions" (
    "id" TEXT NOT NULL,
    "outcome" "AttributionOutcome" NOT NULL,
    "outcomeValue" INTEGER,
    "metadata" TEXT NOT NULL DEFAULT '{}',
    "accountId" TEXT,
    "contactId" TEXT,
    "opportunityId" TEXT,
    "leadId" TEXT,
    "pitchId" TEXT,
    "stepId" TEXT,
    "versionId" TEXT NOT NULL,
    "attributedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "playbook_attributions_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "sequence_versions" (
    "id" TEXT NOT NULL,
    "sequenceId" TEXT NOT NULL,
    "version" INTEGER NOT NULL,
    "changelog" TEXT NOT NULL DEFAULT '',
    "isActive" BOOLEAN NOT NULL DEFAULT false,
    "rolledBackFromVersionId" TEXT,
    "stepsJson" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "sequence_versions_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "sequence_ab_tests" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'DRAFT',
    "metric" TEXT NOT NULL,
    "minSampleSize" INTEGER NOT NULL DEFAULT 100,
    "confidenceLevel" DOUBLE PRECISION NOT NULL DEFAULT 0.95,
    "versionId" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "sequence_ab_tests_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ab_test_variants" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "config" TEXT NOT NULL DEFAULT '{}',
    "impressions" INTEGER NOT NULL DEFAULT 0,
    "conversions" INTEGER NOT NULL DEFAULT 0,
    "isControl" BOOLEAN NOT NULL DEFAULT false,
    "abTestId" TEXT NOT NULL,

    CONSTRAINT "ab_test_variants_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "sequence_delivery_windows" (
    "id" TEXT NOT NULL,
    "sequenceId" TEXT,
    "playbookId" TEXT,
    "weekdays" INTEGER[],
    "startTime" TEXT NOT NULL,
    "endTime" TEXT NOT NULL,
    "timezone" TEXT NOT NULL DEFAULT 'UTC',
    "respectRecipientTimezone" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "sequence_delivery_windows_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "sequence_sender_rotations" (
    "id" TEXT NOT NULL,
    "sequenceId" TEXT,
    "playbookId" TEXT,
    "senderIds" TEXT[],
    "rotationMode" TEXT NOT NULL DEFAULT 'ROUND_ROBIN',
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "sequence_sender_rotations_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "sequence_execution_logs" (
    "id" TEXT NOT NULL,
    "executionId" TEXT NOT NULL,
    "versionId" TEXT NOT NULL,
    "status" TEXT NOT NULL,
    "retryCount" INTEGER NOT NULL DEFAULT 0,
    "maxRetries" INTEGER NOT NULL DEFAULT 3,
    "retryPolicy" TEXT NOT NULL DEFAULT 'exponential',
    "error" TEXT,
    "executedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "sequence_execution_logs_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "qualification_playbooks" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "description" TEXT NOT NULL DEFAULT '',
    "framework" "QualificationFramework" NOT NULL,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "isCustom" BOOLEAN NOT NULL DEFAULT false,
    "createdById" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "qualification_playbooks_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "qualification_stages" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "key" TEXT NOT NULL,
    "description" TEXT NOT NULL DEFAULT '',
    "sortOrder" INTEGER NOT NULL DEFAULT 0,
    "isRequired" BOOLEAN NOT NULL DEFAULT true,
    "playbookId" TEXT NOT NULL,

    CONSTRAINT "qualification_stages_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "qualification_criterions" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "description" TEXT NOT NULL DEFAULT '',
    "evidenceType" TEXT NOT NULL,
    "options" TEXT,
    "isRequired" BOOLEAN NOT NULL DEFAULT false,
    "stageId" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "qualification_criterions_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "deal_qualifications" (
    "id" TEXT NOT NULL,
    "dealId" TEXT NOT NULL,
    "stageId" TEXT NOT NULL,
    "evidence" TEXT NOT NULL DEFAULT '',
    "isMet" BOOLEAN NOT NULL DEFAULT false,
    "checkedById" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "deal_qualifications_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "deal_queues" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "description" TEXT NOT NULL DEFAULT '',
    "type" TEXT NOT NULL,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "createdById" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "deal_queues_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "queue_items" (
    "id" TEXT NOT NULL,
    "queueId" TEXT NOT NULL,
    "leadId" TEXT,
    "dealId" TEXT,
    "opportunityId" TEXT,
    "status" TEXT NOT NULL DEFAULT 'OPEN',
    "priority" TEXT NOT NULL DEFAULT 'MEDIUM',
    "notes" TEXT NOT NULL DEFAULT '',
    "assignedToId" TEXT,
    "slaDueAt" TIMESTAMP(3),
    "resolvedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "queue_items_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "workload_caps" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "maxActiveLeads" INTEGER NOT NULL,
    "maxActiveDeals" INTEGER NOT NULL,
    "maxQueueItems" INTEGER NOT NULL,
    "currentLoad" INTEGER NOT NULL DEFAULT 0,
    "alertThreshold" DOUBLE PRECISION NOT NULL DEFAULT 0.8,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "workload_caps_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "outbound_webhooks" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "url" TEXT NOT NULL,
    "secret" TEXT,
    "events" TEXT[],
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "retryCount" INTEGER NOT NULL DEFAULT 3,
    "timeoutMs" INTEGER NOT NULL DEFAULT 5000,
    "lastError" TEXT,
    "lastSuccessAt" TIMESTAMP(3),
    "createdById" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "outbound_webhooks_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "integration_mappings" (
    "id" TEXT NOT NULL,
    "provider" TEXT NOT NULL,
    "mappingType" TEXT NOT NULL,
    "mapping" TEXT NOT NULL DEFAULT '{}',
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "createdById" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "integration_mappings_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "playbook_packs" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "slug" TEXT NOT NULL,
    "description" TEXT NOT NULL DEFAULT '',
    "visibility" "PackVisibility" NOT NULL DEFAULT 'PRIVATE',
    "vertical" TEXT DEFAULT '',
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "createdById" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "playbook_packs_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "pack_items" (
    "id" TEXT NOT NULL,
    "packId" TEXT NOT NULL,
    "playbookId" TEXT NOT NULL,
    "sortOrder" INTEGER NOT NULL DEFAULT 0,

    CONSTRAINT "pack_items_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "agent_definitions" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "type" "AgentType" NOT NULL,
    "description" TEXT NOT NULL DEFAULT '',
    "config" JSONB NOT NULL DEFAULT '{}',
    "budget" INTEGER NOT NULL DEFAULT 0,
    "spentBudget" INTEGER NOT NULL DEFAULT 0,
    "permissions" JSONB NOT NULL DEFAULT '{}',
    "approvalThreshold" INTEGER NOT NULL DEFAULT 0,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "createdById" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "agent_definitions_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "agent_runs" (
    "id" TEXT NOT NULL,
    "definitionId" TEXT NOT NULL,
    "status" "AgentStatus" NOT NULL DEFAULT 'IDLE',
    "input" JSONB NOT NULL DEFAULT '{}',
    "output" JSONB NOT NULL DEFAULT '{}',
    "cost" INTEGER NOT NULL DEFAULT 0,
    "errors" TEXT NOT NULL DEFAULT '[]',
    "startedAt" TIMESTAMP(3),
    "completedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "agent_runs_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "agent_approvals" (
    "id" TEXT NOT NULL,
    "status" "ApprovalStatus" NOT NULL DEFAULT 'PENDING',
    "comment" TEXT NOT NULL DEFAULT '',
    "reviewedAt" TIMESTAMP(3),
    "reviewedById" TEXT,
    "runId" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "agent_approvals_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "account_ranks" (
    "id" TEXT NOT NULL,
    "accountId" TEXT NOT NULL,
    "fitScore" INTEGER NOT NULL DEFAULT 0,
    "timingScore" INTEGER NOT NULL DEFAULT 0,
    "relationshipScore" INTEGER NOT NULL DEFAULT 0,
    "valueScore" INTEGER NOT NULL DEFAULT 0,
    "compositeScore" INTEGER NOT NULL DEFAULT 0,
    "explanation" TEXT NOT NULL DEFAULT '',
    "evidence" TEXT NOT NULL DEFAULT '[]',
    "calculatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "account_ranks_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "signals" (
    "id" TEXT NOT NULL,
    "type" "SignalType" NOT NULL,
    "source" TEXT NOT NULL,
    "evidence" TEXT NOT NULL DEFAULT '',
    "confidence" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "isVerified" BOOLEAN NOT NULL DEFAULT false,
    "rawPayload" JSONB,
    "ingestedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "verifiedAt" TIMESTAMP(3),

    CONSTRAINT "signals_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "account_signals" (
    "id" TEXT NOT NULL,
    "accountId" TEXT NOT NULL,
    "signalId" TEXT NOT NULL,
    "relevance" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "freshness" INTEGER NOT NULL DEFAULT 0,
    "context" TEXT DEFAULT '',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "account_signals_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "workspace_learning_profiles" (
    "id" TEXT NOT NULL,
    "workspaceKey" TEXT NOT NULL,
    "profile" JSONB NOT NULL DEFAULT '{}',
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "workspace_learning_profiles_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "users_email_key" ON "users"("email");

-- CreateIndex
CREATE INDEX "users_role_idx" ON "users"("role");

-- CreateIndex
CREATE INDEX "leads_domain_idx" ON "leads"("domain");

-- CreateIndex
CREATE INDEX "leads_email_idx" ON "leads"("email");

-- CreateIndex
CREATE INDEX "leads_stage_idx" ON "leads"("stage");

-- CreateIndex
CREATE INDEX "leads_assignedAgentId_idx" ON "leads"("assignedAgentId");

-- CreateIndex
CREATE INDEX "leads_focus_idx" ON "leads"("focus");

-- CreateIndex
CREATE INDEX "leads_accountId_idx" ON "leads"("accountId");

-- CreateIndex
CREATE UNIQUE INDEX "leads_website_email_key" ON "leads"("website", "email");

-- CreateIndex
CREATE INDEX "accounts_ownerId_idx" ON "accounts"("ownerId");

-- CreateIndex
CREATE INDEX "accounts_updatedAt_idx" ON "accounts"("updatedAt");

-- CreateIndex
CREATE UNIQUE INDEX "accounts_domain_key" ON "accounts"("domain");

-- CreateIndex
CREATE UNIQUE INDEX "contacts_legacyLeadId_key" ON "contacts"("legacyLeadId");

-- CreateIndex
CREATE INDEX "contacts_accountId_email_idx" ON "contacts"("accountId", "email");

-- CreateIndex
CREATE INDEX "contacts_email_idx" ON "contacts"("email");

-- CreateIndex
CREATE INDEX "contacts_ownerId_idx" ON "contacts"("ownerId");

-- CreateIndex
CREATE INDEX "opportunities_accountId_status_idx" ON "opportunities"("accountId", "status");

-- CreateIndex
CREATE INDEX "opportunities_ownerId_updatedAt_idx" ON "opportunities"("ownerId", "updatedAt");

-- CreateIndex
CREATE INDEX "opportunities_legacyLeadId_idx" ON "opportunities"("legacyLeadId");

-- CreateIndex
CREATE INDEX "relationships_accountId_status_idx" ON "relationships"("accountId", "status");

-- CreateIndex
CREATE INDEX "relationships_contactId_idx" ON "relationships"("contactId");

-- CreateIndex
CREATE INDEX "relationships_ownerId_nextActionAt_idx" ON "relationships"("ownerId", "nextActionAt");

-- CreateIndex
CREATE INDEX "relationships_legacyLeadId_idx" ON "relationships"("legacyLeadId");

-- CreateIndex
CREATE UNIQUE INDEX "follow_up_tasks_leadId_key" ON "follow_up_tasks"("leadId");

-- CreateIndex
CREATE INDEX "meetings_leadId_idx" ON "meetings"("leadId");

-- CreateIndex
CREATE INDEX "meetings_agentId_idx" ON "meetings"("agentId");

-- CreateIndex
CREATE INDEX "meeting_slots_agentId_idx" ON "meeting_slots"("agentId");

-- CreateIndex
CREATE INDEX "meeting_slots_date_idx" ON "meeting_slots"("date");

-- CreateIndex
CREATE INDEX "meeting_slots_agentId_date_isAvailable_isBooked_idx" ON "meeting_slots"("agentId", "date", "isAvailable", "isBooked");

-- CreateIndex
CREATE UNIQUE INDEX "meeting_slots_agentId_date_startTime_key" ON "meeting_slots"("agentId", "date", "startTime");

-- CreateIndex
CREATE INDEX "webhook_receipts_receivedAt_idx" ON "webhook_receipts"("receivedAt");

-- CreateIndex
CREATE UNIQUE INDEX "webhook_receipts_provider_providerEventId_key" ON "webhook_receipts"("provider", "providerEventId");

-- CreateIndex
CREATE INDEX "availability_rules_agentId_isActive_idx" ON "availability_rules"("agentId", "isActive");

-- CreateIndex
CREATE UNIQUE INDEX "availability_rules_agentId_weekday_key" ON "availability_rules"("agentId", "weekday");

-- CreateIndex
CREATE UNIQUE INDEX "booking_links_token_key" ON "booking_links"("token");

-- CreateIndex
CREATE UNIQUE INDEX "booking_links_pitchId_key" ON "booking_links"("pitchId");

-- CreateIndex
CREATE UNIQUE INDEX "booking_links_meetingId_key" ON "booking_links"("meetingId");

-- CreateIndex
CREATE INDEX "booking_links_agentId_idx" ON "booking_links"("agentId");

-- CreateIndex
CREATE INDEX "booking_links_leadId_idx" ON "booking_links"("leadId");

-- CreateIndex
CREATE INDEX "booking_links_expiresAt_idx" ON "booking_links"("expiresAt");

-- CreateIndex
CREATE UNIQUE INDEX "pitches_inReplyToId_key" ON "pitches"("inReplyToId");

-- CreateIndex
CREATE INDEX "pitches_leadId_idx" ON "pitches"("leadId");

-- CreateIndex
CREATE INDEX "pitches_status_idx" ON "pitches"("status");

-- CreateIndex
CREATE INDEX "pitches_status_scheduledSendAt_idx" ON "pitches"("status", "scheduledSendAt");

-- CreateIndex
CREATE INDEX "activity_logs_leadId_idx" ON "activity_logs"("leadId");

-- CreateIndex
CREATE INDEX "activity_logs_userId_idx" ON "activity_logs"("userId");

-- CreateIndex
CREATE INDEX "activity_logs_userId_readAt_idx" ON "activity_logs"("userId", "readAt");

-- CreateIndex
CREATE INDEX "integration_connections_provider_status_idx" ON "integration_connections"("provider", "status");

-- CreateIndex
CREATE UNIQUE INDEX "integration_connections_userId_provider_key" ON "integration_connections"("userId", "provider");

-- CreateIndex
CREATE UNIQUE INDEX "oauth_sessions_stateHash_key" ON "oauth_sessions"("stateHash");

-- CreateIndex
CREATE INDEX "oauth_sessions_userId_provider_idx" ON "oauth_sessions"("userId", "provider");

-- CreateIndex
CREATE INDEX "oauth_sessions_expiresAt_idx" ON "oauth_sessions"("expiresAt");

-- CreateIndex
CREATE INDEX "conversations_ownerId_status_lastMessageAt_idx" ON "conversations"("ownerId", "status", "lastMessageAt");

-- CreateIndex
CREATE INDEX "conversations_contactId_idx" ON "conversations"("contactId");

-- CreateIndex
CREATE INDEX "conversations_legacyLeadId_idx" ON "conversations"("legacyLeadId");

-- CreateIndex
CREATE UNIQUE INDEX "conversations_connectionId_externalThreadId_key" ON "conversations"("connectionId", "externalThreadId");

-- CreateIndex
CREATE INDEX "conversation_messages_internetMessageId_idx" ON "conversation_messages"("internetMessageId");

-- CreateIndex
CREATE INDEX "conversation_messages_occurredAt_idx" ON "conversation_messages"("occurredAt");

-- CreateIndex
CREATE UNIQUE INDEX "conversation_messages_conversationId_externalMessageId_key" ON "conversation_messages"("conversationId", "externalMessageId");

-- CreateIndex
CREATE UNIQUE INDEX "timeline_entries_dedupeKey_key" ON "timeline_entries"("dedupeKey");

-- CreateIndex
CREATE UNIQUE INDEX "timeline_entries_messageId_key" ON "timeline_entries"("messageId");

-- CreateIndex
CREATE INDEX "timeline_entries_accountId_occurredAt_idx" ON "timeline_entries"("accountId", "occurredAt");

-- CreateIndex
CREATE INDEX "timeline_entries_legacyLeadId_occurredAt_idx" ON "timeline_entries"("legacyLeadId", "occurredAt");

-- CreateIndex
CREATE INDEX "timeline_entries_contactId_occurredAt_idx" ON "timeline_entries"("contactId", "occurredAt");

-- CreateIndex
CREATE UNIQUE INDEX "external_calendar_events_meetingId_key" ON "external_calendar_events"("meetingId");

-- CreateIndex
CREATE INDEX "external_calendar_events_connectionId_startAt_endAt_idx" ON "external_calendar_events"("connectionId", "startAt", "endAt");

-- CreateIndex
CREATE INDEX "external_calendar_events_legacyLeadId_idx" ON "external_calendar_events"("legacyLeadId");

-- CreateIndex
CREATE UNIQUE INDEX "external_calendar_events_connectionId_externalEventId_key" ON "external_calendar_events"("connectionId", "externalEventId");

-- CreateIndex
CREATE UNIQUE INDEX "team_booking_pages_slug_key" ON "team_booking_pages"("slug");

-- CreateIndex
CREATE INDEX "team_booking_pages_isActive_idx" ON "team_booking_pages"("isActive");

-- CreateIndex
CREATE INDEX "team_booking_members_pageId_isActive_priority_idx" ON "team_booking_members"("pageId", "isActive", "priority");

-- CreateIndex
CREATE UNIQUE INDEX "team_booking_members_pageId_userId_key" ON "team_booking_members"("pageId", "userId");

-- CreateIndex
CREATE INDEX "pitch_events_pitchId_idx" ON "pitch_events"("pitchId");

-- CreateIndex
CREATE UNIQUE INDEX "email_suppressions_email_key" ON "email_suppressions"("email");

-- CreateIndex
CREATE INDEX "email_suppressions_createdAt_idx" ON "email_suppressions"("createdAt");

-- CreateIndex
CREATE UNIQUE INDEX "unsubscribe_links_token_key" ON "unsubscribe_links"("token");

-- CreateIndex
CREATE UNIQUE INDEX "unsubscribe_links_pitchId_key" ON "unsubscribe_links"("pitchId");

-- CreateIndex
CREATE INDEX "unsubscribe_links_email_idx" ON "unsubscribe_links"("email");

-- CreateIndex
CREATE INDEX "activation_events_type_createdAt_idx" ON "activation_events"("type", "createdAt");

-- CreateIndex
CREATE INDEX "activation_events_userId_createdAt_idx" ON "activation_events"("userId", "createdAt");

-- CreateIndex
CREATE INDEX "activation_events_leadId_idx" ON "activation_events"("leadId");

-- CreateIndex
CREATE INDEX "activation_events_pitchId_idx" ON "activation_events"("pitchId");

-- CreateIndex
CREATE INDEX "pitch_templates_createdById_idx" ON "pitch_templates"("createdById");

-- CreateIndex
CREATE UNIQUE INDEX "custom_field_definitions_key_key" ON "custom_field_definitions"("key");

-- CreateIndex
CREATE INDEX "custom_field_values_leadId_idx" ON "custom_field_values"("leadId");

-- CreateIndex
CREATE INDEX "custom_field_values_fieldId_idx" ON "custom_field_values"("fieldId");

-- CreateIndex
CREATE UNIQUE INDEX "custom_field_values_leadId_fieldId_key" ON "custom_field_values"("leadId", "fieldId");

-- CreateIndex
CREATE UNIQUE INDEX "deal_stages_key_key" ON "deal_stages"("key");

-- CreateIndex
CREATE INDEX "sequence_steps_sequenceId_idx" ON "sequence_steps"("sequenceId");

-- CreateIndex
CREATE INDEX "sequence_executions_leadId_idx" ON "sequence_executions"("leadId");

-- CreateIndex
CREATE INDEX "sequence_executions_sequenceId_idx" ON "sequence_executions"("sequenceId");

-- CreateIndex
CREATE INDEX "sequence_executions_status_nextRunAt_idx" ON "sequence_executions"("status", "nextRunAt");

-- CreateIndex
CREATE INDEX "deals_agentId_idx" ON "deals"("agentId");

-- CreateIndex
CREATE INDEX "deals_closedAt_idx" ON "deals"("closedAt");

-- CreateIndex
CREATE INDEX "commissions_agentId_idx" ON "commissions"("agentId");

-- CreateIndex
CREATE INDEX "commissions_status_idx" ON "commissions"("status");

-- CreateIndex
CREATE INDEX "lead_routing_rules_assignedAgentId_idx" ON "lead_routing_rules"("assignedAgentId");

-- CreateIndex
CREATE INDEX "lead_routing_rules_isActive_idx" ON "lead_routing_rules"("isActive");

-- CreateIndex
CREATE INDEX "document_templates_type_idx" ON "document_templates"("type");

-- CreateIndex
CREATE INDEX "generated_documents_leadId_idx" ON "generated_documents"("leadId");

-- CreateIndex
CREATE INDEX "generated_documents_type_idx" ON "generated_documents"("type");

-- CreateIndex
CREATE UNIQUE INDEX "api_keys_key_key" ON "api_keys"("key");

-- CreateIndex
CREATE INDEX "api_keys_userId_idx" ON "api_keys"("userId");

-- CreateIndex
CREATE INDEX "api_keys_keyPrefix_idx" ON "api_keys"("keyPrefix");

-- CreateIndex
CREATE INDEX "lead_monitoring_leadId_idx" ON "lead_monitoring"("leadId");

-- CreateIndex
CREATE INDEX "lead_monitoring_createdAt_idx" ON "lead_monitoring"("createdAt");

-- CreateIndex
CREATE INDEX "send_time_optimizations_leadId_idx" ON "send_time_optimizations"("leadId");

-- CreateIndex
CREATE INDEX "send_time_optimizations_agentId_idx" ON "send_time_optimizations"("agentId");

-- CreateIndex
CREATE INDEX "agent_coaching_agentId_idx" ON "agent_coaching"("agentId");

-- CreateIndex
CREATE INDEX "agent_coaching_createdAt_idx" ON "agent_coaching"("createdAt");

-- CreateIndex
CREATE INDEX "playbooks_type_idx" ON "playbooks"("type");

-- CreateIndex
CREATE INDEX "playbooks_status_idx" ON "playbooks"("status");

-- CreateIndex
CREATE INDEX "playbooks_createdById_idx" ON "playbooks"("createdById");

-- CreateIndex
CREATE INDEX "playbook_versions_playbookId_status_idx" ON "playbook_versions"("playbookId", "status");

-- CreateIndex
CREATE UNIQUE INDEX "playbook_versions_playbookId_version_key" ON "playbook_versions"("playbookId", "version");

-- CreateIndex
CREATE INDEX "playbook_steps_versionId_order_idx" ON "playbook_steps"("versionId", "order");

-- CreateIndex
CREATE INDEX "playbook_conditions_versionId_idx" ON "playbook_conditions"("versionId");

-- CreateIndex
CREATE INDEX "playbook_actions_versionId_idx" ON "playbook_actions"("versionId");

-- CreateIndex
CREATE INDEX "playbook_branches_versionId_idx" ON "playbook_branches"("versionId");

-- CreateIndex
CREATE INDEX "playbook_test_runs_versionId_idx" ON "playbook_test_runs"("versionId");

-- CreateIndex
CREATE INDEX "playbook_test_runs_createdById_idx" ON "playbook_test_runs"("createdById");

-- CreateIndex
CREATE INDEX "playbook_approvals_versionId_status_idx" ON "playbook_approvals"("versionId", "status");

-- CreateIndex
CREATE INDEX "playbook_approvals_requestedById_idx" ON "playbook_approvals"("requestedById");

-- CreateIndex
CREATE UNIQUE INDEX "step_level_analytics_stepId_key" ON "step_level_analytics"("stepId");

-- CreateIndex
CREATE INDEX "step_level_analytics_stepId_idx" ON "step_level_analytics"("stepId");

-- CreateIndex
CREATE INDEX "playbook_attributions_versionId_outcome_idx" ON "playbook_attributions"("versionId", "outcome");

-- CreateIndex
CREATE INDEX "playbook_attributions_leadId_idx" ON "playbook_attributions"("leadId");

-- CreateIndex
CREATE INDEX "playbook_attributions_opportunityId_idx" ON "playbook_attributions"("opportunityId");

-- CreateIndex
CREATE INDEX "playbook_attributions_accountId_idx" ON "playbook_attributions"("accountId");

-- CreateIndex
CREATE INDEX "sequence_versions_sequenceId_isActive_idx" ON "sequence_versions"("sequenceId", "isActive");

-- CreateIndex
CREATE UNIQUE INDEX "sequence_versions_sequenceId_version_key" ON "sequence_versions"("sequenceId", "version");

-- CreateIndex
CREATE INDEX "sequence_ab_tests_versionId_idx" ON "sequence_ab_tests"("versionId");

-- CreateIndex
CREATE INDEX "ab_test_variants_abTestId_idx" ON "ab_test_variants"("abTestId");

-- CreateIndex
CREATE INDEX "sequence_delivery_windows_sequenceId_idx" ON "sequence_delivery_windows"("sequenceId");

-- CreateIndex
CREATE INDEX "sequence_execution_logs_versionId_idx" ON "sequence_execution_logs"("versionId");

-- CreateIndex
CREATE INDEX "sequence_execution_logs_executionId_idx" ON "sequence_execution_logs"("executionId");

-- CreateIndex
CREATE INDEX "qualification_playbooks_framework_idx" ON "qualification_playbooks"("framework");

-- CreateIndex
CREATE INDEX "qualification_playbooks_createdById_idx" ON "qualification_playbooks"("createdById");

-- CreateIndex
CREATE INDEX "qualification_stages_playbookId_sortOrder_idx" ON "qualification_stages"("playbookId", "sortOrder");

-- CreateIndex
CREATE UNIQUE INDEX "qualification_stages_playbookId_key_key" ON "qualification_stages"("playbookId", "key");

-- CreateIndex
CREATE INDEX "qualification_criterions_stageId_idx" ON "qualification_criterions"("stageId");

-- CreateIndex
CREATE INDEX "deal_qualifications_dealId_idx" ON "deal_qualifications"("dealId");

-- CreateIndex
CREATE INDEX "deal_qualifications_isMet_idx" ON "deal_qualifications"("isMet");

-- CreateIndex
CREATE UNIQUE INDEX "deal_qualifications_dealId_stageId_key" ON "deal_qualifications"("dealId", "stageId");

-- CreateIndex
CREATE INDEX "deal_queues_type_idx" ON "deal_queues"("type");

-- CreateIndex
CREATE INDEX "deal_queues_createdById_idx" ON "deal_queues"("createdById");

-- CreateIndex
CREATE INDEX "queue_items_queueId_status_idx" ON "queue_items"("queueId", "status");

-- CreateIndex
CREATE INDEX "queue_items_assignedToId_idx" ON "queue_items"("assignedToId");

-- CreateIndex
CREATE INDEX "queue_items_slaDueAt_idx" ON "queue_items"("slaDueAt");

-- CreateIndex
CREATE UNIQUE INDEX "workload_caps_userId_key" ON "workload_caps"("userId");

-- CreateIndex
CREATE INDEX "workload_caps_userId_idx" ON "workload_caps"("userId");

-- CreateIndex
CREATE INDEX "outbound_webhooks_createdById_idx" ON "outbound_webhooks"("createdById");

-- CreateIndex
CREATE INDEX "outbound_webhooks_isActive_idx" ON "outbound_webhooks"("isActive");

-- CreateIndex
CREATE INDEX "integration_mappings_provider_idx" ON "integration_mappings"("provider");

-- CreateIndex
CREATE INDEX "integration_mappings_createdById_idx" ON "integration_mappings"("createdById");

-- CreateIndex
CREATE UNIQUE INDEX "playbook_packs_slug_key" ON "playbook_packs"("slug");

-- CreateIndex
CREATE INDEX "playbook_packs_visibility_vertical_idx" ON "playbook_packs"("visibility", "vertical");

-- CreateIndex
CREATE INDEX "playbook_packs_createdById_idx" ON "playbook_packs"("createdById");

-- CreateIndex
CREATE INDEX "pack_items_packId_sortOrder_idx" ON "pack_items"("packId", "sortOrder");

-- CreateIndex
CREATE UNIQUE INDEX "pack_items_packId_playbookId_key" ON "pack_items"("packId", "playbookId");

-- CreateIndex
CREATE INDEX "agent_definitions_type_isActive_idx" ON "agent_definitions"("type", "isActive");

-- CreateIndex
CREATE INDEX "agent_definitions_createdById_idx" ON "agent_definitions"("createdById");

-- CreateIndex
CREATE INDEX "agent_runs_definitionId_status_createdAt_idx" ON "agent_runs"("definitionId", "status", "createdAt");

-- CreateIndex
CREATE INDEX "agent_runs_status_createdAt_idx" ON "agent_runs"("status", "createdAt");

-- CreateIndex
CREATE INDEX "agent_approvals_runId_status_idx" ON "agent_approvals"("runId", "status");

-- CreateIndex
CREATE INDEX "agent_approvals_createdAt_idx" ON "agent_approvals"("createdAt");

-- CreateIndex
CREATE UNIQUE INDEX "account_ranks_accountId_key" ON "account_ranks"("accountId");

-- CreateIndex
CREATE INDEX "account_ranks_compositeScore_calculatedAt_idx" ON "account_ranks"("compositeScore", "calculatedAt");

-- CreateIndex
CREATE INDEX "signals_type_isVerified_ingestedAt_idx" ON "signals"("type", "isVerified", "ingestedAt");

-- CreateIndex
CREATE INDEX "account_signals_accountId_relevance_idx" ON "account_signals"("accountId", "relevance");

-- CreateIndex
CREATE INDEX "account_signals_signalId_idx" ON "account_signals"("signalId");

-- CreateIndex
CREATE UNIQUE INDEX "workspace_learning_profiles_workspaceKey_key" ON "workspace_learning_profiles"("workspaceKey");

-- CreateIndex
CREATE INDEX "workspace_learning_profiles_workspaceKey_idx" ON "workspace_learning_profiles"("workspaceKey");

-- AddForeignKey
ALTER TABLE "leads" ADD CONSTRAINT "leads_assignedAgentId_fkey" FOREIGN KEY ("assignedAgentId") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "leads" ADD CONSTRAINT "leads_createdById_fkey" FOREIGN KEY ("createdById") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "leads" ADD CONSTRAINT "leads_accountId_fkey" FOREIGN KEY ("accountId") REFERENCES "accounts"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "accounts" ADD CONSTRAINT "accounts_ownerId_fkey" FOREIGN KEY ("ownerId") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "contacts" ADD CONSTRAINT "contacts_accountId_fkey" FOREIGN KEY ("accountId") REFERENCES "accounts"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "contacts" ADD CONSTRAINT "contacts_ownerId_fkey" FOREIGN KEY ("ownerId") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "contacts" ADD CONSTRAINT "contacts_legacyLeadId_fkey" FOREIGN KEY ("legacyLeadId") REFERENCES "leads"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "opportunities" ADD CONSTRAINT "opportunities_accountId_fkey" FOREIGN KEY ("accountId") REFERENCES "accounts"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "opportunities" ADD CONSTRAINT "opportunities_primaryContactId_fkey" FOREIGN KEY ("primaryContactId") REFERENCES "contacts"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "opportunities" ADD CONSTRAINT "opportunities_legacyLeadId_fkey" FOREIGN KEY ("legacyLeadId") REFERENCES "leads"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "opportunities" ADD CONSTRAINT "opportunities_ownerId_fkey" FOREIGN KEY ("ownerId") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "relationships" ADD CONSTRAINT "relationships_accountId_fkey" FOREIGN KEY ("accountId") REFERENCES "accounts"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "relationships" ADD CONSTRAINT "relationships_contactId_fkey" FOREIGN KEY ("contactId") REFERENCES "contacts"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "relationships" ADD CONSTRAINT "relationships_opportunityId_fkey" FOREIGN KEY ("opportunityId") REFERENCES "opportunities"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "relationships" ADD CONSTRAINT "relationships_legacyLeadId_fkey" FOREIGN KEY ("legacyLeadId") REFERENCES "leads"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "relationships" ADD CONSTRAINT "relationships_ownerId_fkey" FOREIGN KEY ("ownerId") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "follow_up_tasks" ADD CONSTRAINT "follow_up_tasks_leadId_fkey" FOREIGN KEY ("leadId") REFERENCES "leads"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "meetings" ADD CONSTRAINT "meetings_leadId_fkey" FOREIGN KEY ("leadId") REFERENCES "leads"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "meetings" ADD CONSTRAINT "meetings_pitchId_fkey" FOREIGN KEY ("pitchId") REFERENCES "pitches"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "meetings" ADD CONSTRAINT "meetings_agentId_fkey" FOREIGN KEY ("agentId") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "meeting_slots" ADD CONSTRAINT "meeting_slots_agentId_fkey" FOREIGN KEY ("agentId") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "meeting_slots" ADD CONSTRAINT "meeting_slots_meetingId_fkey" FOREIGN KEY ("meetingId") REFERENCES "meetings"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "availability_rules" ADD CONSTRAINT "availability_rules_agentId_fkey" FOREIGN KEY ("agentId") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "booking_links" ADD CONSTRAINT "booking_links_pitchId_fkey" FOREIGN KEY ("pitchId") REFERENCES "pitches"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "booking_links" ADD CONSTRAINT "booking_links_leadId_fkey" FOREIGN KEY ("leadId") REFERENCES "leads"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "booking_links" ADD CONSTRAINT "booking_links_agentId_fkey" FOREIGN KEY ("agentId") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "booking_links" ADD CONSTRAINT "booking_links_meetingId_fkey" FOREIGN KEY ("meetingId") REFERENCES "meetings"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "pitches" ADD CONSTRAINT "pitches_leadId_fkey" FOREIGN KEY ("leadId") REFERENCES "leads"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "pitches" ADD CONSTRAINT "pitches_createdById_fkey" FOREIGN KEY ("createdById") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "pitches" ADD CONSTRAINT "pitches_inReplyToId_fkey" FOREIGN KEY ("inReplyToId") REFERENCES "pitches"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "activity_logs" ADD CONSTRAINT "activity_logs_userId_fkey" FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "activity_logs" ADD CONSTRAINT "activity_logs_leadId_fkey" FOREIGN KEY ("leadId") REFERENCES "leads"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "integration_connections" ADD CONSTRAINT "integration_connections_userId_fkey" FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "conversations" ADD CONSTRAINT "conversations_connectionId_fkey" FOREIGN KEY ("connectionId") REFERENCES "integration_connections"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "conversations" ADD CONSTRAINT "conversations_accountId_fkey" FOREIGN KEY ("accountId") REFERENCES "accounts"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "conversations" ADD CONSTRAINT "conversations_contactId_fkey" FOREIGN KEY ("contactId") REFERENCES "contacts"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "conversations" ADD CONSTRAINT "conversations_legacyLeadId_fkey" FOREIGN KEY ("legacyLeadId") REFERENCES "leads"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "conversations" ADD CONSTRAINT "conversations_ownerId_fkey" FOREIGN KEY ("ownerId") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "conversation_messages" ADD CONSTRAINT "conversation_messages_conversationId_fkey" FOREIGN KEY ("conversationId") REFERENCES "conversations"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "timeline_entries" ADD CONSTRAINT "timeline_entries_accountId_fkey" FOREIGN KEY ("accountId") REFERENCES "accounts"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "timeline_entries" ADD CONSTRAINT "timeline_entries_contactId_fkey" FOREIGN KEY ("contactId") REFERENCES "contacts"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "timeline_entries" ADD CONSTRAINT "timeline_entries_opportunityId_fkey" FOREIGN KEY ("opportunityId") REFERENCES "opportunities"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "timeline_entries" ADD CONSTRAINT "timeline_entries_relationshipId_fkey" FOREIGN KEY ("relationshipId") REFERENCES "relationships"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "timeline_entries" ADD CONSTRAINT "timeline_entries_legacyLeadId_fkey" FOREIGN KEY ("legacyLeadId") REFERENCES "leads"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "timeline_entries" ADD CONSTRAINT "timeline_entries_conversationId_fkey" FOREIGN KEY ("conversationId") REFERENCES "conversations"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "timeline_entries" ADD CONSTRAINT "timeline_entries_messageId_fkey" FOREIGN KEY ("messageId") REFERENCES "conversation_messages"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "timeline_entries" ADD CONSTRAINT "timeline_entries_actorId_fkey" FOREIGN KEY ("actorId") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "external_calendar_events" ADD CONSTRAINT "external_calendar_events_connectionId_fkey" FOREIGN KEY ("connectionId") REFERENCES "integration_connections"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "external_calendar_events" ADD CONSTRAINT "external_calendar_events_accountId_fkey" FOREIGN KEY ("accountId") REFERENCES "accounts"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "external_calendar_events" ADD CONSTRAINT "external_calendar_events_contactId_fkey" FOREIGN KEY ("contactId") REFERENCES "contacts"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "external_calendar_events" ADD CONSTRAINT "external_calendar_events_legacyLeadId_fkey" FOREIGN KEY ("legacyLeadId") REFERENCES "leads"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "team_booking_members" ADD CONSTRAINT "team_booking_members_pageId_fkey" FOREIGN KEY ("pageId") REFERENCES "team_booking_pages"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "team_booking_members" ADD CONSTRAINT "team_booking_members_userId_fkey" FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "pitch_events" ADD CONSTRAINT "pitch_events_pitchId_fkey" FOREIGN KEY ("pitchId") REFERENCES "pitches"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "unsubscribe_links" ADD CONSTRAINT "unsubscribe_links_pitchId_fkey" FOREIGN KEY ("pitchId") REFERENCES "pitches"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "pitch_templates" ADD CONSTRAINT "pitch_templates_createdById_fkey" FOREIGN KEY ("createdById") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "custom_field_values" ADD CONSTRAINT "custom_field_values_leadId_fkey" FOREIGN KEY ("leadId") REFERENCES "leads"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "custom_field_values" ADD CONSTRAINT "custom_field_values_fieldId_fkey" FOREIGN KEY ("fieldId") REFERENCES "custom_field_definitions"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "sequence_steps" ADD CONSTRAINT "sequence_steps_sequenceId_fkey" FOREIGN KEY ("sequenceId") REFERENCES "follow_up_sequences"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "sequence_executions" ADD CONSTRAINT "sequence_executions_leadId_fkey" FOREIGN KEY ("leadId") REFERENCES "leads"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "sequence_executions" ADD CONSTRAINT "sequence_executions_sequenceId_fkey" FOREIGN KEY ("sequenceId") REFERENCES "follow_up_sequences"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "deals" ADD CONSTRAINT "deals_leadId_fkey" FOREIGN KEY ("leadId") REFERENCES "leads"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "deals" ADD CONSTRAINT "deals_agentId_fkey" FOREIGN KEY ("agentId") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "commissions" ADD CONSTRAINT "commissions_dealId_fkey" FOREIGN KEY ("dealId") REFERENCES "deals"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "commissions" ADD CONSTRAINT "commissions_agentId_fkey" FOREIGN KEY ("agentId") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "lead_routing_rules" ADD CONSTRAINT "lead_routing_rules_assignedAgentId_fkey" FOREIGN KEY ("assignedAgentId") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "generated_documents" ADD CONSTRAINT "generated_documents_leadId_fkey" FOREIGN KEY ("leadId") REFERENCES "leads"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "generated_documents" ADD CONSTRAINT "generated_documents_createdById_fkey" FOREIGN KEY ("createdById") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "api_keys" ADD CONSTRAINT "api_keys_userId_fkey" FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "lead_monitoring" ADD CONSTRAINT "lead_monitoring_leadId_fkey" FOREIGN KEY ("leadId") REFERENCES "leads"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "send_time_optimizations" ADD CONSTRAINT "send_time_optimizations_leadId_fkey" FOREIGN KEY ("leadId") REFERENCES "leads"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "send_time_optimizations" ADD CONSTRAINT "send_time_optimizations_agentId_fkey" FOREIGN KEY ("agentId") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "agent_coaching" ADD CONSTRAINT "agent_coaching_agentId_fkey" FOREIGN KEY ("agentId") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "playbooks" ADD CONSTRAINT "playbooks_createdById_fkey" FOREIGN KEY ("createdById") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "playbook_versions" ADD CONSTRAINT "playbook_versions_playbookId_fkey" FOREIGN KEY ("playbookId") REFERENCES "playbooks"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "playbook_steps" ADD CONSTRAINT "playbook_steps_versionId_fkey" FOREIGN KEY ("versionId") REFERENCES "playbook_versions"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "playbook_conditions" ADD CONSTRAINT "playbook_conditions_versionId_fkey" FOREIGN KEY ("versionId") REFERENCES "playbook_versions"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "playbook_actions" ADD CONSTRAINT "playbook_actions_versionId_fkey" FOREIGN KEY ("versionId") REFERENCES "playbook_versions"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "playbook_branches" ADD CONSTRAINT "playbook_branches_versionId_fkey" FOREIGN KEY ("versionId") REFERENCES "playbook_versions"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "playbook_test_runs" ADD CONSTRAINT "playbook_test_runs_createdById_fkey" FOREIGN KEY ("createdById") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "playbook_test_runs" ADD CONSTRAINT "playbook_test_runs_versionId_fkey" FOREIGN KEY ("versionId") REFERENCES "playbook_versions"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "playbook_approvals" ADD CONSTRAINT "playbook_approvals_reviewedById_fkey" FOREIGN KEY ("reviewedById") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "playbook_approvals" ADD CONSTRAINT "playbook_approvals_versionId_fkey" FOREIGN KEY ("versionId") REFERENCES "playbook_versions"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "playbook_approvals" ADD CONSTRAINT "playbook_approvals_requestedById_fkey" FOREIGN KEY ("requestedById") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "step_level_analytics" ADD CONSTRAINT "step_level_analytics_stepId_fkey" FOREIGN KEY ("stepId") REFERENCES "playbook_steps"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "playbook_attributions" ADD CONSTRAINT "playbook_attributions_versionId_fkey" FOREIGN KEY ("versionId") REFERENCES "playbook_versions"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "sequence_ab_tests" ADD CONSTRAINT "sequence_ab_tests_versionId_fkey" FOREIGN KEY ("versionId") REFERENCES "sequence_versions"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ab_test_variants" ADD CONSTRAINT "ab_test_variants_abTestId_fkey" FOREIGN KEY ("abTestId") REFERENCES "sequence_ab_tests"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "sequence_execution_logs" ADD CONSTRAINT "sequence_execution_logs_versionId_fkey" FOREIGN KEY ("versionId") REFERENCES "sequence_versions"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "qualification_playbooks" ADD CONSTRAINT "qualification_playbooks_createdById_fkey" FOREIGN KEY ("createdById") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "qualification_stages" ADD CONSTRAINT "qualification_stages_playbookId_fkey" FOREIGN KEY ("playbookId") REFERENCES "qualification_playbooks"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "qualification_criterions" ADD CONSTRAINT "qualification_criterions_stageId_fkey" FOREIGN KEY ("stageId") REFERENCES "qualification_stages"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "deal_qualifications" ADD CONSTRAINT "deal_qualifications_stageId_fkey" FOREIGN KEY ("stageId") REFERENCES "qualification_stages"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "deal_qualifications" ADD CONSTRAINT "deal_qualifications_checkedById_fkey" FOREIGN KEY ("checkedById") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "deal_queues" ADD CONSTRAINT "deal_queues_createdById_fkey" FOREIGN KEY ("createdById") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "queue_items" ADD CONSTRAINT "queue_items_queueId_fkey" FOREIGN KEY ("queueId") REFERENCES "deal_queues"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "queue_items" ADD CONSTRAINT "queue_items_assignedToId_fkey" FOREIGN KEY ("assignedToId") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "workload_caps" ADD CONSTRAINT "workload_caps_userId_fkey" FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "outbound_webhooks" ADD CONSTRAINT "outbound_webhooks_createdById_fkey" FOREIGN KEY ("createdById") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "integration_mappings" ADD CONSTRAINT "integration_mappings_createdById_fkey" FOREIGN KEY ("createdById") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "playbook_packs" ADD CONSTRAINT "playbook_packs_createdById_fkey" FOREIGN KEY ("createdById") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "pack_items" ADD CONSTRAINT "pack_items_packId_fkey" FOREIGN KEY ("packId") REFERENCES "playbook_packs"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "pack_items" ADD CONSTRAINT "pack_items_playbookId_fkey" FOREIGN KEY ("playbookId") REFERENCES "playbooks"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "agent_definitions" ADD CONSTRAINT "agent_definitions_createdById_fkey" FOREIGN KEY ("createdById") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "agent_runs" ADD CONSTRAINT "agent_runs_definitionId_fkey" FOREIGN KEY ("definitionId") REFERENCES "agent_definitions"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "agent_approvals" ADD CONSTRAINT "agent_approvals_reviewedById_fkey" FOREIGN KEY ("reviewedById") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "agent_approvals" ADD CONSTRAINT "agent_approvals_runId_fkey" FOREIGN KEY ("runId") REFERENCES "agent_runs"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "account_ranks" ADD CONSTRAINT "account_ranks_accountId_fkey" FOREIGN KEY ("accountId") REFERENCES "accounts"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "account_signals" ADD CONSTRAINT "account_signals_accountId_fkey" FOREIGN KEY ("accountId") REFERENCES "accounts"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "account_signals" ADD CONSTRAINT "account_signals_signalId_fkey" FOREIGN KEY ("signalId") REFERENCES "signals"("id") ON DELETE CASCADE ON UPDATE CASCADE;
