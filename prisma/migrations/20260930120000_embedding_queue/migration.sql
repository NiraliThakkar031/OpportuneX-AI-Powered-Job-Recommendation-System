ALTER TABLE "Job" ADD COLUMN "embeddingStatus" TEXT NOT NULL DEFAULT 'pending';
ALTER TABLE "Job" ADD COLUMN "embeddingModel" TEXT;
ALTER TABLE "Job" ADD COLUMN "embeddingUpdatedAt" TIMESTAMP(3);
ALTER TABLE "Job" ADD COLUMN "embeddingAttempts" INTEGER NOT NULL DEFAULT 0;
ALTER TABLE "Job" ADD COLUMN "embeddingNextAttemptAt" TIMESTAMP(3);
ALTER TABLE "Job" ADD COLUMN "embeddingError" TEXT;

UPDATE "Job"
SET "embeddingStatus" = 'ready',
    "embeddingModel" = 'gemini-embedding-001',
    "embeddingUpdatedAt" = "updatedAt"
WHERE "embedding" IS NOT NULL;

UPDATE "Job"
SET "embeddingNextAttemptAt" = CURRENT_TIMESTAMP
WHERE "embedding" IS NULL;

CREATE INDEX "Job_embeddingStatus_embeddingNextAttemptAt_idx"
ON "Job"("embeddingStatus", "embeddingNextAttemptAt");
