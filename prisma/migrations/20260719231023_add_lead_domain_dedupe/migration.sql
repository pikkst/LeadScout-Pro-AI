/*
  Warnings:

  - Added the required column `domain` to the `leads` table without a default value. This is not possible if the table is not empty.

*/
-- AlterTable
ALTER TABLE "leads" ADD COLUMN     "domain" TEXT NOT NULL DEFAULT '';

-- Backfill domain from website (normalize: lowercase, strip protocol/www/path).
UPDATE "leads" SET "domain" = lower(
  regexp_replace(
    regexp_replace(
      regexp_replace("website", '^https?://', '', 'i'),
      '^www\.', '', 'i'
    ),
    '/.*$', '', 'i'
  )
) WHERE "domain" = '';

-- CreateIndex
CREATE INDEX "leads_domain_idx" ON "leads"("domain");

-- CreateIndex
CREATE INDEX "leads_email_idx" ON "leads"("email");
