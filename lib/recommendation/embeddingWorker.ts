import { prisma } from "@/lib/db/prisma";
import { Prisma } from "@prisma/client";
import {
  buildJobEmbeddingTexts,
  dbJobToPosting,
  embedDocuments,
  EMBEDDING_DIMENSIONS,
  EMBEDDING_MODEL,
  HYBRID_EMBEDDING_VERSION,
} from "@/lib/recommendation/semantic";

const BATCH_SIZE = 64;
const MAX_ATTEMPTS = 5;
const BASE_BACKOFF_MS = 60_000;

function isRateLimitError(error: unknown) {
  const value = error as any;
  const message = String(value?.message || error || "").toLowerCase();
  return value?.status === 429 || message.includes("429") || message.includes("resource_exhausted") || message.includes("quota exceeded") || message.includes("rate limit");
}

function retryAt(attempts: number) {
  const jitter = Math.floor(Math.random() * 10_000);
  return new Date(Date.now() + Math.min(30 * 60_000, BASE_BACKOFF_MS * 2 ** Math.max(0, attempts - 1)) + jitter);
}

export async function processEmbeddingQueue(limit = BATCH_SIZE) {
  const now = new Date();
  const candidates = await prisma.job.findMany({
    where: {
      active: true,
      OR: [
      { embeddingStatus: { in: ["pending", "failed"] }, embeddingAttempts: { lt: MAX_ATTEMPTS }, OR: [{ embeddingNextAttemptAt: null }, { embeddingNextAttemptAt: { lte: now } }] },
      { embeddingVersion: { not: HYBRID_EMBEDDING_VERSION } },
      { embeddingRole: { equals: Prisma.JsonNull } },
      { embeddingSkills: { equals: Prisma.JsonNull } },
      { embeddingDomain: { equals: Prisma.JsonNull } },
    ],
    },
    orderBy: [{ embeddingNextAttemptAt: "asc" }, { lastCheckedAt: "desc" }],
    take: limit,
  });

  if (!candidates.length) return { processed: 0, embedded: 0, deferred: 0, remaining: 0 };

  const ids = candidates.map(row => row.id);
  await prisma.job.updateMany({
    where: { id: { in: ids }, embeddingStatus: { not: "processing" } },
    data: { embeddingStatus: "processing", embeddingError: null },
  });

  const claimed = await prisma.job.findMany({ where: { id: { in: ids }, embeddingStatus: "processing" } });

  try {
    const postings = claimed.map(dbJobToPosting);
    const embeddingTexts = postings.map(buildJobEmbeddingTexts);
    const fullTexts = embeddingTexts.map(item => item.full);
    const roleTexts = embeddingTexts.map(item => item.role);
    const skillTexts = embeddingTexts.map(item => item.skills);
    const domainTexts = embeddingTexts.map(item => item.domain);

    // Four independent semantic views make the ranking resilient to generic job
    // vocabulary: full context, role, skills, and professional domain.
    const fullVectors = await embedDocuments(fullTexts);
    const roleVectors = await embedDocuments(roleTexts);
    const skillVectors = await embedDocuments(skillTexts);
    const domainVectors = await embedDocuments(domainTexts);
    const allVectors = [fullVectors, roleVectors, skillVectors, domainVectors];
    if (allVectors.some(vectors => vectors.length !== claimed.length || vectors.some(vector => vector.length !== EMBEDDING_DIMENSIONS))) {
      throw new Error("Embedding service returned an unexpected hybrid vector count or dimension.");
    }

    await prisma.$transaction(claimed.map((row, index) => prisma.job.update({
      where: { id: row.id },
      data: {
        embedding: fullVectors[index],
        embeddingRole: roleVectors[index],
        embeddingSkills: skillVectors[index],
        embeddingDomain: domainVectors[index],
        embeddingStatus: "ready",
        embeddingModel: EMBEDDING_MODEL,
        embeddingVersion: HYBRID_EMBEDDING_VERSION,
        embeddingUpdatedAt: new Date(),
        embeddingAttempts: { increment: 1 },
        embeddingNextAttemptAt: null,
        embeddingError: null,
      },
    })));

    const remaining = await prisma.job.count({ where: { active: true, embeddingStatus: { in: ["pending", "failed"] } } });
    return { processed: claimed.length, embedded: claimed.length, deferred: 0, remaining };
  } catch (error) {
    const rateLimited = isRateLimitError(error);
    const updates = claimed.map(row => {
      const attempts = row.embeddingAttempts + 1;
      const exhausted = attempts >= MAX_ATTEMPTS;
      return prisma.job.update({
        where: { id: row.id },
        data: {
          embeddingStatus: exhausted ? "failed" : "pending",
          embeddingAttempts: attempts,
          embeddingNextAttemptAt: exhausted ? null : retryAt(attempts),
          embeddingError: rateLimited ? "Embedding API quota/rate limit reached; retry scheduled." : String((error as any)?.message || error || "Embedding failed").slice(0, 2000),
        },
      });
    });
    await prisma.$transaction(updates);
    const remaining = await prisma.job.count({ where: { active: true, embeddingStatus: { in: ["pending", "failed"] } } });
    return { processed: claimed.length, embedded: 0, deferred: claimed.length, remaining, rateLimited };
  }
}
