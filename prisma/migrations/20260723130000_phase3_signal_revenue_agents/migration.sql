-- Phase 3 — Signal-driven revenue agents
-- This migration was generated from an existing database via `prisma db push`.
-- It documents the schema delta for Phase 3 features.

-- New enum types
CREATE TYPE "PackVisibility" AS ENUM ('PRIVATE', 'CURATED');
CREATE TYPE "AgentType" AS ENUM ('RESEARCH', 'ROUTING', 'BRIEFING', 'FOLLOW_UP', 'CRM_HYGIENE');
CREATE TYPE "AgentStatus" AS ENUM ('IDLE', 'RUNNING', 'PAUSED', 'COMPLETED', 'FAILED', 'AWAITING_APPROVAL');
CREATE TYPE "SignalType" AS ENUM ('HIRING', 'FUNDING', 'LEADERSHIP_CHANGE', 'TECHNOLOGY', 'INTENT', 'PRODUCT_USAGE', 'RENEWAL', 'RELATIONSHIP_ACTIVITY');

-- Playbook marketplace
CREATE TABLE "playbook_packs" (
  "id" TEXT NOT NULL,
  "name" TEXT NOT NULL,
  "slug" TEXT NOT NULL,
  "description" TEXT NOT NULL DEFAULT '',
  "visibility" "PackVisibility" NOT NULL DEFAULT 'PRIVATE',
  "vertical" TEXT,
  "isActive" BOOLEAN NOT NULL DEFAULT true,
  "createdById" TEXT NOT NULL,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "playbook_packs_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "pack_items" (
  "id" TEXT NOT NULL,
  "packId" TEXT NOT NULL,
  "playbookId" TEXT NOT NULL,
  "sortOrder" INTEGER NOT NULL DEFAULT 0,
  CONSTRAINT "pack_items_pkey" PRIMARY KEY ("id")
);

-- Agent framework
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
  "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "agent_definitions_pkey" PRIMARY KEY ("id")
);

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

-- Account ranking
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

-- Signals
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

CREATE TABLE "account_signals" (
  "id" TEXT NOT NULL,
  "accountId" TEXT NOT NULL,
  "signalId" TEXT NOT NULL,
  "relevance" DOUBLE PRECISION NOT NULL DEFAULT 0,
  "freshness" INTEGER NOT NULL DEFAULT 0,
  "context" TEXT,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "account_signals_pkey" PRIMARY KEY ("id")
);

-- Workspace learning
CREATE TABLE "workspace_learning_profiles" (
  "id" TEXT NOT NULL,
  "workspaceKey" TEXT NOT NULL,
  "profile" JSONB NOT NULL DEFAULT '{}',
  "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "workspace_learning_profiles_pkey" PRIMARY KEY ("id")
);

-- Indexes
CREATE UNIQUE INDEX "playbook_packs_slug_key" ON "playbook_packs"("slug");
CREATE INDEX "playbook_packs_visibility_vertical_idx" ON "playbook_packs"("visibility", "vertical");
CREATE INDEX "playbook_packs_createdById_idx" ON "playbook_packs"("createdById");

CREATE UNIQUE INDEX "pack_items_packId_playbookId_key" ON "pack_items"("packId", "playbookId");
CREATE INDEX "pack_items_packId_sortOrder_idx" ON "pack_items"("packId", "sortOrder");

CREATE INDEX "agent_definitions_type_isActive_idx" ON "agent_definitions"("type", "isActive");
CREATE INDEX "agent_definitions_createdById_idx" ON "agent_definitions"("createdById");

CREATE INDEX "agent_runs_definitionId_status_createdAt_idx" ON "agent_runs"("definitionId", "status", "createdAt");
CREATE INDEX "agent_runs_status_createdAt_idx" ON "agent_runs"("status", "createdAt");

CREATE INDEX "agent_approvals_runId_status_idx" ON "agent_approvals"("runId", "status");
CREATE INDEX "agent_approvals_createdAt_idx" ON "agent_approvals"("createdAt");

CREATE UNIQUE INDEX "account_ranks_accountId_key" ON "account_ranks"("accountId");
CREATE INDEX "account_ranks_compositeScore_calculatedAt_idx" ON "account_ranks"("compositeScore", "calculatedAt");

CREATE INDEX "signals_type_isVerified_ingestedAt_idx" ON "signals"("type", "isVerified", "ingestedAt");

CREATE INDEX "account_signals_accountId_relevance_idx" ON "account_signals"("accountId", "relevance");
CREATE INDEX "account_signals_signalId_idx" ON "account_signals"("signalId");

CREATE UNIQUE INDEX "workspace_learning_profiles_workspaceKey_key" ON "workspace_learning_profiles"("workspaceKey");
CREATE INDEX "workspace_learning_profiles_workspaceKey_idx" ON "workspace_learning_profiles"("workspaceKey");

-- Foreign keys
ALTER TABLE "playbook_packs" ADD CONSTRAINT "playbook_packs_createdById_fkey" FOREIGN KEY ("createdById") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "pack_items" ADD CONSTRAINT "pack_items_packId_fkey" FOREIGN KEY ("packId") REFERENCES "playbook_packs"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "pack_items" ADD CONSTRAINT "pack_items_playbookId_fkey" FOREIGN KEY ("playbookId") REFERENCES "playbooks"("id") ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "agent_definitions" ADD CONSTRAINT "agent_definitions_createdById_fkey" FOREIGN KEY ("createdById") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "agent_runs" ADD CONSTRAINT "agent_runs_definitionId_fkey" FOREIGN KEY ("definitionId") REFERENCES "agent_definitions"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "agent_approvals" ADD CONSTRAINT "agent_approvals_reviewedById_fkey" FOREIGN KEY ("reviewedById") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "agent_approvals" ADD CONSTRAINT "agent_approvals_runId_fkey" FOREIGN KEY ("runId") REFERENCES "agent_runs"("id") ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "account_ranks" ADD CONSTRAINT "account_ranks_accountId_fkey" FOREIGN KEY ("accountId") REFERENCES "accounts"("id") ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "account_signals" ADD CONSTRAINT "account_signals_accountId_fkey" FOREIGN KEY ("accountId") REFERENCES "accounts"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "account_signals" ADD CONSTRAINT "account_signals_signalId_fkey" FOREIGN KEY ("signalId") REFERENCES "signals"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- Reverse relation arrays (managed by Prisma, included for completeness)
ALTER TABLE "users" ADD COLUMN IF NOT EXISTS "createdAgentDefinitions" TEXT[];
ALTER TABLE "users" ADD COLUMN IF NOT EXISTS "createdPacks" TEXT[];
ALTER TABLE "users" ADD COLUMN IF NOT EXISTS "agentApprovalsReviewed" TEXT[];

ALTER TABLE "accounts" ADD COLUMN IF NOT EXISTS "signals" TEXT[];
ALTER TABLE "accounts" ADD COLUMN IF NOT EXISTS "ranks" TEXT[];

ALTER TABLE "playbooks" ADD COLUMN IF NOT EXISTS "packItems" TEXT[];
