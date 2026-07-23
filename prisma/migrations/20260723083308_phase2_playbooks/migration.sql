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

-- DropIndex
DROP INDEX "meetings_pitchId_idx";

-- DropIndex
DROP INDEX "pitches_inReplyToId_idx";

-- AlterTable
ALTER TABLE "accounts" ALTER COLUMN "updatedAt" DROP DEFAULT;

-- AlterTable
ALTER TABLE "contacts" ALTER COLUMN "updatedAt" DROP DEFAULT;

-- AlterTable
ALTER TABLE "conversations" ALTER COLUMN "updatedAt" DROP DEFAULT;

-- AlterTable
ALTER TABLE "external_calendar_events" ALTER COLUMN "updatedAt" DROP DEFAULT;

-- AlterTable
ALTER TABLE "integration_connections" ALTER COLUMN "updatedAt" DROP DEFAULT;

-- AlterTable
ALTER TABLE "opportunities" ALTER COLUMN "updatedAt" DROP DEFAULT;

-- AlterTable
ALTER TABLE "relationships" ALTER COLUMN "updatedAt" DROP DEFAULT;

-- AlterTable
ALTER TABLE "team_booking_pages" ALTER COLUMN "updatedAt" DROP DEFAULT;

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
