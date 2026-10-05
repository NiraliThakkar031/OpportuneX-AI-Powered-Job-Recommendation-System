import { createHash } from "crypto";
import { Prisma } from "@prisma/client";
import { prisma } from "@/lib/db/prisma";
import { JobPosting } from "@/lib/types";
import { inferJobDomain } from "@/lib/sources/domainClassifier";

function dateOrNull(value?: string) {
  if (!value) return null;
  const d = new Date(value);
  return Number.isNaN(d.getTime()) ? null : d;
}

function jobContentHash(job: JobPosting) {
  const payload = JSON.stringify({
    title: job.title, company: job.company, location: job.location,
    description: job.description, applyUrl: job.applyUrl, domain: job.domain,
    requiredEducation: job.requiredEducation, minimumExperience: job.minimumExperience,
    requiredSkills: job.requiredSkills, preferredSkills: job.preferredSkills,
    requiredCertifications: job.requiredCertifications, employmentType: job.employmentType,
    workplaceType: job.workplaceType, postedDate: job.postedDate
  });
  return createHash("sha256").update(payload).digest("hex");
}

function storedDomain(job: JobPosting): string {
  const inferred = inferJobDomain(job);
  return inferred !== "other" ? inferred : (job.domain || "other");
}

export async function persistJobs(jobs: JobPosting[]) {
  const now = new Date();
  const valid = jobs.filter(job => job.id && job.title && job.company && job.applyUrl);
  if (!valid.length) return { inserted: 0, updated: 0, saved: 0 };

  const ids = valid.map(job => `${job.source}:${job.id}`);
  const existingRows = await prisma.job.findMany({
    where: { id: { in: ids } },
    select: { id: true, contentHash: true, domain: true }
  });
  const existing = new Map(existingRows.map(row => [row.id, { contentHash: row.contentHash, domain: row.domain }]));

  const creates = valid.filter(job => !existing.has(`${job.source}:${job.id}`));
  if (creates.length) {
    await prisma.job.createMany({
      data: creates.map(job => ({
        id: `${job.source}:${job.id}`, title: job.title, company: job.company, location: job.location || "Not specified",
        description: job.description || "", applyUrl: job.applyUrl, source: job.source, sourceJobId: job.id,
        sourceType: job.source === "gov_india" ? "government" : "aggregator_or_employer",
        officialSource: /gov|upsc|ssc|ncs/i.test(job.source), domain: storedDomain(job),
        requiredEducation: job.requiredEducation, minimumExperience: job.minimumExperience,
        requiredSkills: job.requiredSkills, preferredSkills: job.preferredSkills,
        requiredCertifications: job.requiredCertifications, employmentType: job.employmentType,
        workplaceType: job.workplaceType, postedDate: dateOrNull(job.postedDate),
        lastSeenAt: now, lastCheckedAt: now, active: true, contentHash: jobContentHash(job), embeddingStatus: "pending", embeddingAttempts: 0, embeddingNextAttemptAt: now, embeddingError: null, embeddingRole: Prisma.JsonNull, embeddingSkills: Prisma.JsonNull, embeddingDomain: Prisma.JsonNull, embeddingVersion: null
      })),
      skipDuplicates: true
    });
  }

  const existingValid = valid.filter(job => existing.has(`${job.source}:${job.id}`));
  const changed = existingValid.filter(job => existing.get(`${job.source}:${job.id}`)?.contentHash !== jobContentHash(job));
  const domainBackfill = existingValid.filter(job => !existing.get(`${job.source}:${job.id}`)?.domain || existing.get(`${job.source}:${job.id}`)?.domain === "other");

  // Refresh observation timestamps in one batch. Only changed rows receive field-level updates.
  if (existingValid.length) {
    await prisma.job.updateMany({
      where: { id: { in: existingValid.map(job => `${job.source}:${job.id}`) } },
      data: { lastSeenAt: now, lastCheckedAt: now, active: true }
    });
  }

  if (domainBackfill.length) {
    await prisma.$transaction(domainBackfill.map(job => prisma.job.update({
      where: { id: `${job.source}:${job.id}` },
      data: { domain: storedDomain(job) }
    })));
  }

  if (changed.length) {
    await prisma.$transaction(changed.map(job => prisma.job.update({
      where: { id: `${job.source}:${job.id}` },
      data: {
        title: job.title, company: job.company, location: job.location || "Not specified",
        description: job.description || "", applyUrl: job.applyUrl, domain: storedDomain(job),
        requiredEducation: job.requiredEducation, minimumExperience: job.minimumExperience,
        requiredSkills: job.requiredSkills, preferredSkills: job.preferredSkills,
        requiredCertifications: job.requiredCertifications, employmentType: job.employmentType,
        workplaceType: job.workplaceType, postedDate: dateOrNull(job.postedDate), contentHash: jobContentHash(job), embedding: Prisma.JsonNull, embeddingRole: Prisma.JsonNull, embeddingSkills: Prisma.JsonNull, embeddingDomain: Prisma.JsonNull, embeddingStatus: "pending", embeddingModel: null, embeddingVersion: null, embeddingUpdatedAt: null, embeddingAttempts: 0, embeddingNextAttemptAt: now, embeddingError: null
      }
    })));
  }

  // Embeddings are generated by the dedicated background worker, not during job ingestion.

  return { inserted: creates.length, updated: changed.length, saved: creates.length + changed.length };
}
