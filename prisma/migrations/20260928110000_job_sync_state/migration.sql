CREATE TABLE "JobSyncState" (
    "id" TEXT NOT NULL,
    "source" TEXT NOT NULL,
    "lastStartedAt" TIMESTAMP(3),
    "lastCompletedAt" TIMESTAMP(3),
    "lastSuccessAt" TIMESTAMP(3),
    "lastError" TEXT,
    "lastFetched" INTEGER NOT NULL DEFAULT 0,
    "lastUnique" INTEGER NOT NULL DEFAULT 0,
    "lastInserted" INTEGER NOT NULL DEFAULT 0,
    "lastUpdated" INTEGER NOT NULL DEFAULT 0,
    "lastDeactivated" INTEGER NOT NULL DEFAULT 0,
    "durationMs" INTEGER,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    CONSTRAINT "JobSyncState_pkey" PRIMARY KEY ("id")
);
CREATE UNIQUE INDEX "JobSyncState_source_key" ON "JobSyncState"("source");
CREATE INDEX "JobSyncState_lastSuccessAt_idx" ON "JobSyncState"("lastSuccessAt");
