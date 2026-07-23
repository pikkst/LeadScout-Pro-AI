/*
  Warnings:

  - You are about to drop the column `ranks` on the `accounts` table. All the data in the column will be lost.
  - You are about to drop the column `signals` on the `accounts` table. All the data in the column will be lost.
  - You are about to drop the column `packItems` on the `playbooks` table. All the data in the column will be lost.
  - You are about to drop the column `agentApprovalsReviewed` on the `users` table. All the data in the column will be lost.
  - You are about to drop the column `createdAgentDefinitions` on the `users` table. All the data in the column will be lost.
  - You are about to drop the column `createdPacks` on the `users` table. All the data in the column will be lost.
  - You are about to drop the column `evidenceReviewsCreated` on the `users` table. All the data in the column will be lost.
  - You are about to drop the column `evidenceReviewsReviewed` on the `users` table. All the data in the column will be lost.
  - You are about to drop the column `workspaceThresholds` on the `users` table. All the data in the column will be lost.

*/
-- AlterTable
ALTER TABLE "account_signals" ALTER COLUMN "context" SET DEFAULT '';

-- AlterTable
ALTER TABLE "accounts" DROP COLUMN "ranks",
DROP COLUMN "signals";

-- AlterTable
ALTER TABLE "agent_definitions" ALTER COLUMN "updatedAt" DROP DEFAULT;

-- AlterTable
ALTER TABLE "evidence_reviews" ALTER COLUMN "updatedAt" DROP DEFAULT;

-- AlterTable
ALTER TABLE "outcome_graph_nodes" ALTER COLUMN "updatedAt" DROP DEFAULT;

-- AlterTable
ALTER TABLE "playbook_packs" ALTER COLUMN "vertical" SET DEFAULT '',
ALTER COLUMN "updatedAt" DROP DEFAULT;

-- AlterTable
ALTER TABLE "playbooks" DROP COLUMN "packItems";

-- AlterTable
ALTER TABLE "users" DROP COLUMN "agentApprovalsReviewed",
DROP COLUMN "createdAgentDefinitions",
DROP COLUMN "createdPacks",
DROP COLUMN "evidenceReviewsCreated",
DROP COLUMN "evidenceReviewsReviewed",
DROP COLUMN "workspaceThresholds";

-- AlterTable
ALTER TABLE "workspace_learning_profiles" ALTER COLUMN "updatedAt" DROP DEFAULT;

-- AlterTable
ALTER TABLE "workspace_thresholds" ALTER COLUMN "updatedAt" DROP DEFAULT;

-- RenameForeignKey
ALTER TABLE "workspace_thresholds" RENAME CONSTRAINT "workspace_thresholds_createdById_fkey" TO "workspace_thresholds_id_fkey";
