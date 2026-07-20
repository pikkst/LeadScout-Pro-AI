-- CreateEnum
CREATE TYPE "SequenceActionType" AS ENUM ('EMAIL', 'TASK', 'WEBHOOK');

-- CreateEnum
CREATE TYPE "SequenceExecutionStatus" AS ENUM ('ACTIVE', 'PAUSED', 'COMPLETED', 'STOPPED');

-- CreateTable
CREATE TABLE "follow_up_sequences" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "description" TEXT NOT NULL DEFAULT '',
    "triggerStage" TEXT NOT NULL,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
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
    "leadId" TEXT NOT NULL,
    "sequenceId" TEXT NOT NULL,

    CONSTRAINT "sequence_executions_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "sequence_steps_sequenceId_idx" ON "sequence_steps"("sequenceId");

-- CreateIndex
CREATE INDEX "sequence_executions_leadId_idx" ON "sequence_executions"("leadId");

-- CreateIndex
CREATE INDEX "sequence_executions_sequenceId_idx" ON "sequence_executions"("sequenceId");

-- AddForeignKey
ALTER TABLE "sequence_steps" ADD CONSTRAINT "sequence_steps_sequenceId_fkey" FOREIGN KEY ("sequenceId") REFERENCES "follow_up_sequences"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "sequence_executions" ADD CONSTRAINT "sequence_executions_leadId_fkey" FOREIGN KEY ("leadId") REFERENCES "leads"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "sequence_executions" ADD CONSTRAINT "sequence_executions_sequenceId_fkey" FOREIGN KEY ("sequenceId") REFERENCES "follow_up_sequences"("id") ON DELETE CASCADE ON UPDATE CASCADE;
