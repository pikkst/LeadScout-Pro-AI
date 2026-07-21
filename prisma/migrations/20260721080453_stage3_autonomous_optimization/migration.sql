-- CreateEnum
CREATE TYPE "MonitoringType" AS ENUM ('NEWS', 'EVENT', 'FUNDING', 'HIRING', 'COMPETITOR', 'CUSTOM');

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

-- AddForeignKey
ALTER TABLE "lead_monitoring" ADD CONSTRAINT "lead_monitoring_leadId_fkey" FOREIGN KEY ("leadId") REFERENCES "leads"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "send_time_optimizations" ADD CONSTRAINT "send_time_optimizations_leadId_fkey" FOREIGN KEY ("leadId") REFERENCES "leads"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "send_time_optimizations" ADD CONSTRAINT "send_time_optimizations_agentId_fkey" FOREIGN KEY ("agentId") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "agent_coaching" ADD CONSTRAINT "agent_coaching_agentId_fkey" FOREIGN KEY ("agentId") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;
