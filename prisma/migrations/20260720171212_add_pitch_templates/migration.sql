-- AlterTable
ALTER TABLE "leads" ALTER COLUMN "domain" DROP DEFAULT;

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

-- CreateIndex
CREATE INDEX "pitch_templates_createdById_idx" ON "pitch_templates"("createdById");

-- AddForeignKey
ALTER TABLE "pitch_templates" ADD CONSTRAINT "pitch_templates_createdById_fkey" FOREIGN KEY ("createdById") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;
