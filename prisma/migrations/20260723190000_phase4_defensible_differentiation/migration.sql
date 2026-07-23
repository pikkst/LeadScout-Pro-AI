-- Phase 4 — Defensible differentiation
-- Schema delta: evidence review, automation audit, workspace thresholds, outcome graph, signal decay, revenue-weighted learning

-- New enum types
CREATE TYPE "EvidenceEntityType" AS ENUM ('ACCOUNT_RANK', 'PLAYBOOK_STEP', 'SEQUENCE_VARIANT', 'PITCH', 'AGENT_RUN', 'SIGNAL');
CREATE TYPE "EvidenceReviewStatus" AS ENUM ('PENDING', 'APPROVED', 'REJECTED', 'DECAYED');
CREATE TYPE "AutomationActionType" AS ENUM ('SEQUENCE_STEP_EXECUTED', 'PITCH_SENT', 'PITCH_SCHEDULED', 'LEAD_STAGE_CHANGED', 'OPPORTUNITY_CREATED', 'MEETING_BOOKED', 'AGENT_RUN_STARTED', 'AGENT_RUN_COMPLETED', 'CRM_UPDATE', 'CONTACT_EXPORT');
CREATE TYPE "AutomationEntityType" AS ENUM ('SEQUENCE_EXECUTION', 'PITCH', 'LEAD', 'OPPORTUNITY', 'MEETING', 'AGENT_RUN', 'PLAYBOOK_VERSION');
CREATE TYPE "AutomationActorType" AS ENUM ('USER', 'AGENT', 'SCHEDULER', 'SYSTEM');
CREATE TYPE "GraphNodeType" AS ENUM ('ACCOUNT', 'CONTACT', 'LEAD', 'OPPORTUNITY', 'RELATIONSHIP', 'PITCH', 'MEETING', 'TASK', 'STAGE', 'REVENUE', 'SIGNAL', 'CONVERSATION', 'DOCUMENT');
CREATE TYPE "GraphEdgeType" AS ENUM ('OWNS', 'SENDS', 'ATTENDS', 'CREATES', 'ATTRIBUTES_TO', 'LEADS_TO', 'PART_OF', 'REFERENCES');

-- Extend existing tables
ALTER TABLE "step_level_analytics" ADD COLUMN IF NOT EXISTS "minimumDetectableEffect" DOUBLE PRECISION NOT NULL DEFAULT 0;
ALTER TABLE "step_level_analytics" ADD COLUMN IF NOT EXISTS "revenueWeightedScore" DOUBLE PRECISION NOT NULL DEFAULT 0;

ALTER TABLE "account_signals" ADD COLUMN IF NOT EXISTS "decayRate" DOUBLE PRECISION NOT NULL DEFAULT 0.1;
ALTER TABLE "account_signals" ADD COLUMN IF NOT EXISTS "decayedAt" TIMESTAMP(3);

ALTER TABLE "account_ranks" ADD COLUMN IF NOT EXISTS "lastDecayedAt" TIMESTAMP(3);
ALTER TABLE "account_ranks" ADD COLUMN IF NOT EXISTS "decayedCompositeScore" INTEGER NOT NULL DEFAULT 0;
ALTER TABLE "account_ranks" ADD COLUMN IF NOT EXISTS "isDecayed" BOOLEAN NOT NULL DEFAULT false;

ALTER TABLE "playbook_packs" ADD COLUMN IF NOT EXISTS "icpSignals" TEXT NOT NULL DEFAULT '[]';
ALTER TABLE "playbook_packs" ADD COLUMN IF NOT EXISTS "disqualificationRules" TEXT NOT NULL DEFAULT '[]';
ALTER TABLE "playbook_packs" ADD COLUMN IF NOT EXISTS "objectionHandling" TEXT NOT NULL DEFAULT '[]';
ALTER TABLE "playbook_packs" ADD COLUMN IF NOT EXISTS "pricingModel" TEXT NOT NULL DEFAULT '{}';
ALTER TABLE "playbook_packs" ADD COLUMN IF NOT EXISTS "complianceRequirements" TEXT NOT NULL DEFAULT '[]';

-- New tables
CREATE TABLE "evidence_reviews" (
  "id" TEXT NOT NULL,
  "entityType" "EvidenceEntityType" NOT NULL,
  "entityId" TEXT NOT NULL,
  "recommendation" TEXT NOT NULL,
  "sources" JSONB NOT NULL DEFAULT '[]',
  "confidence" DOUBLE PRECISION NOT NULL,
  "freshness" INTEGER NOT NULL DEFAULT 0,
  "status" "EvidenceReviewStatus" NOT NULL DEFAULT 'PENDING',
  "reviewedById" TEXT,
  "comment" TEXT NOT NULL DEFAULT '',
  "reviewedAt" TIMESTAMP(3),
  "createdById" TEXT NOT NULL,
  "decayedAt" TIMESTAMP(3),
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "evidence_reviews_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "automation_audit_logs" (
  "id" TEXT NOT NULL,
  "actionType" "AutomationActionType" NOT NULL,
  "entityType" "AutomationEntityType" NOT NULL,
  "entityId" TEXT NOT NULL,
  "actorType" "AutomationActorType" NOT NULL,
  "actorId" TEXT NOT NULL,
  "previousState" JSONB,
  "newState" JSONB,
  "budgetUsed" INTEGER NOT NULL DEFAULT 0,
  "tokenUsed" INTEGER NOT NULL DEFAULT 0,
  "approvalId" TEXT,
  "error" TEXT,
  "executedAt" TIMESTAMP(3),
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "automation_audit_logs_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "workspace_thresholds" (
  "id" TEXT NOT NULL,
  "workspaceKey" TEXT NOT NULL,
  "soloMode" BOOLEAN NOT NULL DEFAULT true,
  "autoPromoteUsers" INTEGER NOT NULL DEFAULT 3,
  "autoPromoteLeads" INTEGER NOT NULL DEFAULT 50,
  "autoPromoteAutomation" INTEGER NOT NULL DEFAULT 20,
  "currentUserCount" INTEGER NOT NULL DEFAULT 1,
  "currentLeadCount" INTEGER NOT NULL DEFAULT 0,
  "currentAutomationCount" INTEGER NOT NULL DEFAULT 0,
  "promotedAt" TIMESTAMP(3),
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "workspace_thresholds_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "outcome_graph_nodes" (
  "id" TEXT NOT NULL,
  "nodeType" "GraphNodeType" NOT NULL,
  "nodeId" TEXT NOT NULL,
  "workspaceKey" TEXT NOT NULL,
  "title" TEXT NOT NULL,
  "metadata" JSONB NOT NULL DEFAULT '{}',
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "outcome_graph_nodes_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "outcome_graph_edges" (
  "id" TEXT NOT NULL,
  "workspaceKey" TEXT NOT NULL,
  "sourceType" "GraphNodeType" NOT NULL,
  "sourceId" TEXT NOT NULL,
  "targetType" "GraphNodeType" NOT NULL,
  "targetId" TEXT NOT NULL,
  "edgeType" "GraphEdgeType" NOT NULL,
  "weight" DOUBLE PRECISION NOT NULL DEFAULT 1,
  "metadata" JSONB NOT NULL DEFAULT '{}',
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "outcome_graph_edges_pkey" PRIMARY KEY ("id")
);

-- Indexes
CREATE UNIQUE INDEX "evidence_reviews_entityType_entityId_status_key" ON "evidence_reviews"("entityType", "entityId", "status") WHERE status = 'PENDING';
CREATE INDEX "evidence_reviews_entityType_entityId_status_idx" ON "evidence_reviews"("entityType", "entityId", "status");
CREATE INDEX "evidence_reviews_createdById_idx" ON "evidence_reviews"("createdById");

CREATE INDEX "automation_audit_logs_entityType_entityId_createdAt_idx" ON "automation_audit_logs"("entityType", "entityId", "createdAt");
CREATE INDEX "automation_audit_logs_actorType_actorId_idx" ON "automation_audit_logs"("actorType", "actorId");
CREATE INDEX "automation_audit_logs_createdAt_idx" ON "automation_audit_logs"("createdAt");

CREATE UNIQUE INDEX "workspace_thresholds_workspaceKey_key" ON "workspace_thresholds"("workspaceKey");
CREATE INDEX "workspace_thresholds_workspaceKey_idx" ON "workspace_thresholds"("workspaceKey");

CREATE UNIQUE INDEX "outcome_graph_nodes_nodeType_nodeId_workspaceKey_key" ON "outcome_graph_nodes"("nodeType", "nodeId", "workspaceKey");
CREATE INDEX "outcome_graph_nodes_workspaceKey_nodeType_createdAt_idx" ON "outcome_graph_nodes"("workspaceKey", "nodeType", "createdAt");

CREATE INDEX "outcome_graph_edges_workspaceKey_sourceType_targetType_idx" ON "outcome_graph_edges"("workspaceKey", "sourceType", "targetType");
CREATE INDEX "outcome_graph_edges_sourceType_sourceId_targetType_targetId_idx" ON "outcome_graph_edges"("sourceType", "sourceId", "targetType", "targetId");

-- Foreign keys
ALTER TABLE "evidence_reviews" ADD CONSTRAINT "evidence_reviews_reviewedById_fkey" FOREIGN KEY ("reviewedById") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "evidence_reviews" ADD CONSTRAINT "evidence_reviews_createdById_fkey" FOREIGN KEY ("createdById") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "workspace_thresholds" ADD CONSTRAINT "workspace_thresholds_createdById_fkey" FOREIGN KEY ("id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- Reverse relation arrays
ALTER TABLE "users" ADD COLUMN IF NOT EXISTS "evidenceReviewsCreated" TEXT[];
ALTER TABLE "users" ADD COLUMN IF NOT EXISTS "evidenceReviewsReviewed" TEXT[];
ALTER TABLE "users" ADD COLUMN IF NOT EXISTS "workspaceThresholds" TEXT[];
