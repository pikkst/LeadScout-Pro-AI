/*
  Warnings:

  - You are about to drop the column `ranks` on the `accounts` table. All the data in the column will be lost.
  - You are about to drop the column `signals` on the `accounts` table. All the data in the column will be lost.
  - You are about to drop the column `packItems` on the `playbooks` table. All the data in the column will be lost.
  - You are about to drop the column `agentApprovalsReviewed` on the `users` table. All the data in the column will be lost.
  - You are about to drop the column `createdAgentDefinitions` on the `users` table. All the data in the column will be lost.
  - You are about to drop the column `createdPacks` on the `users` table. All the data in the column will be lost.

*/
-- CreateEnum
CREATE TYPE "EvidenceEntityType" AS ENUM ('ACCOUNT_RANK', 'PLAYBOOK_STEP', 'SEQUENCE_VARIANT', 'PITCH', 'AGENT_RUN', 'SIGNAL');

-- CreateEnum
CREATE TYPE "EvidenceReviewStatus" AS ENUM ('PENDING', 'APPROVED', 'REJECTED', 'DECAYED');

-- CreateEnum
CREATE TYPE "AutomationActionType" AS ENUM ('SEQUENCE_STEP_EXECUTED', 'PITCH_SENT', 'PITCH_SCHEDULED', 'LEAD_STAGE_CHANGED', 'OPPORTUNITY_CREATED', 'MEETING_BOOKED', 'AGENT_RUN_STARTED', 'AGENT_RUN_COMPLETED', 'CRM_UPDATE', 'CONTACT_EXPORT');

-- CreateEnum
CREATE TYPE "AutomationEntityType" AS ENUM ('SEQUENCE_EXECUTION', 'PITCH', 'LEAD', 'OPPORTUNITY', 'MEETING', 'AGENT_RUN', 'PLAYBOOK_VERSION');

-- CreateEnum
CREATE TYPE "AutomationActorType" AS ENUM ('USER', 'AGENT', 'SCHEDULER', 'SYSTEM');

-- CreateEnum
CREATE TYPE "GraphNodeType" AS ENUM ('ACCOUNT', 'CONTACT', 'LEAD', 'OPPORTUNITY', 'RELATIONSHIP', 'PITCH', 'MEETING', 'TASK', 'STAGE', 'REVENUE', 'SIGNAL', 'CONVERSATION', 'DOCUMENT');

-- CreateEnum
CREATE TYPE "GraphEdgeType" AS ENUM ('OWNS', 'SENDS', 'ATTENDS', 'CREATES', 'ATTRIBUTES_TO', 'LEADS_TO', 'PART_OF', 'REFERENCES');

-- AlterTable
ALTER TABLE "account_ranks" ADD COLUMN     "decayedCompositeScore" INTEGER NOT NULL DEFAULT 0,
ADD COLUMN     "isDecayed" BOOLEAN NOT NULL DEFAULT false,
ADD COLUMN     "lastDecayedAt" TIMESTAMP(3);

-- AlterTable
ALTER TABLE "account_signals" ADD COLUMN     "decayRate" DOUBLE PRECISION NOT NULL DEFAULT 0.1,
ADD COLUMN     "decayedAt" TIMESTAMP(3),
ALTER COLUMN "context" SET DEFAULT '';

-- AlterTable
ALTER TABLE "accounts" DROP COLUMN "ranks",
DROP COLUMN "signals";

-- AlterTable
ALTER TABLE "agent_definitions" ALTER COLUMN "updatedAt" DROP DEFAULT;

-- AlterTable
ALTER TABLE "playbook_packs" ADD COLUMN     "complianceRequirements" TEXT NOT NULL DEFAULT '[]',
ADD COLUMN     "disqualificationRules" TEXT NOT NULL DEFAULT '[]',
ADD COLUMN     "icpSignals" TEXT NOT NULL DEFAULT '[]',
ADD COLUMN     "objectionHandling" TEXT NOT NULL DEFAULT '[]',
ADD COLUMN     "pricingModel" TEXT NOT NULL DEFAULT '{}',
ALTER COLUMN "vertical" SET DEFAULT '',
ALTER COLUMN "updatedAt" DROP DEFAULT;

-- AlterTable
ALTER TABLE "playbooks" DROP COLUMN "packItems";

-- AlterTable
ALTER TABLE "step_level_analytics" ADD COLUMN     "minimumDetectableEffect" DOUBLE PRECISION NOT NULL DEFAULT 0,
ADD COLUMN     "revenueWeightedScore" DOUBLE PRECISION NOT NULL DEFAULT 0;

-- AlterTable
ALTER TABLE "users" DROP COLUMN "agentApprovalsReviewed",
DROP COLUMN "createdAgentDefinitions",
DROP COLUMN "createdPacks";

-- AlterTable
ALTER TABLE "workspace_learning_profiles" ALTER COLUMN "updatedAt" DROP DEFAULT;

-- CreateTable
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
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "workspace_thresholds_pkey" PRIMARY KEY ("id")
);

-- CreateTable
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
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "evidence_reviews_pkey" PRIMARY KEY ("id")
);

-- CreateTable
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

-- CreateTable
CREATE TABLE "outcome_graph_nodes" (
    "id" TEXT NOT NULL,
    "nodeType" "GraphNodeType" NOT NULL,
    "nodeId" TEXT NOT NULL,
    "workspaceKey" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "metadata" JSONB NOT NULL DEFAULT '{}',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "outcome_graph_nodes_pkey" PRIMARY KEY ("id")
);

-- CreateTable
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

-- CreateIndex
CREATE UNIQUE INDEX "workspace_thresholds_workspaceKey_key" ON "workspace_thresholds"("workspaceKey");

-- CreateIndex
CREATE INDEX "workspace_thresholds_workspaceKey_idx" ON "workspace_thresholds"("workspaceKey");

-- CreateIndex
CREATE INDEX "evidence_reviews_entityType_entityId_status_idx" ON "evidence_reviews"("entityType", "entityId", "status");

-- CreateIndex
CREATE INDEX "evidence_reviews_createdById_idx" ON "evidence_reviews"("createdById");

-- CreateIndex
CREATE INDEX "automation_audit_logs_entityType_entityId_createdAt_idx" ON "automation_audit_logs"("entityType", "entityId", "createdAt");

-- CreateIndex
CREATE INDEX "automation_audit_logs_actorType_actorId_idx" ON "automation_audit_logs"("actorType", "actorId");

-- CreateIndex
CREATE INDEX "automation_audit_logs_createdAt_idx" ON "automation_audit_logs"("createdAt");

-- CreateIndex
CREATE INDEX "outcome_graph_nodes_workspaceKey_nodeType_createdAt_idx" ON "outcome_graph_nodes"("workspaceKey", "nodeType", "createdAt");

-- CreateIndex
CREATE UNIQUE INDEX "outcome_graph_nodes_nodeType_nodeId_workspaceKey_key" ON "outcome_graph_nodes"("nodeType", "nodeId", "workspaceKey");

-- CreateIndex
CREATE INDEX "outcome_graph_edges_workspaceKey_sourceType_targetType_idx" ON "outcome_graph_edges"("workspaceKey", "sourceType", "targetType");

-- CreateIndex
CREATE INDEX "outcome_graph_edges_sourceType_sourceId_targetType_targetId_idx" ON "outcome_graph_edges"("sourceType", "sourceId", "targetType", "targetId");

-- AddForeignKey
ALTER TABLE "workspace_thresholds" ADD CONSTRAINT "workspace_thresholds_id_fkey" FOREIGN KEY ("id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "evidence_reviews" ADD CONSTRAINT "evidence_reviews_reviewedById_fkey" FOREIGN KEY ("reviewedById") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "evidence_reviews" ADD CONSTRAINT "evidence_reviews_createdById_fkey" FOREIGN KEY ("createdById") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;
