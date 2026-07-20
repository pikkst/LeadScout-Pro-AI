-- CreateEnum
CREATE TYPE "RoutingRuleType" AS ENUM ('TERRITORY', 'INDUSTRY', 'ROUND_ROBIN', 'MANUAL', 'SCORE_BASED');

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

-- CreateIndex
CREATE INDEX "lead_routing_rules_assignedAgentId_idx" ON "lead_routing_rules"("assignedAgentId");

-- CreateIndex
CREATE INDEX "lead_routing_rules_isActive_idx" ON "lead_routing_rules"("isActive");

-- AddForeignKey
ALTER TABLE "lead_routing_rules" ADD CONSTRAINT "lead_routing_rules_assignedAgentId_fkey" FOREIGN KEY ("assignedAgentId") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
