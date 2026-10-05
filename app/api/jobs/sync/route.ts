import { NextResponse } from "next/server";
import { fetchAdzunaJobs } from "@/lib/sources/adzuna";
import { fetchJoobleJobs } from "@/lib/sources/jooble";
import { fetchRemotiveJobs } from "@/lib/sources/remotive";
import { fetchGreenhouseJobs } from "@/lib/sources/greenhouse";
import { fetchLeverJobs } from "@/lib/sources/lever";
import { fetchWorkableJobs } from "@/lib/sources/workable";
import { persistJobs } from "@/lib/jobs/persist";
import { processEmbeddingQueue } from "@/lib/recommendation/embeddingWorker";
import { prisma } from "@/lib/db/prisma";
import { removeDuplicateJobs } from "@/lib/sources/normalize";
import { inferJobDomain } from "@/lib/sources/domainClassifier";

type SourceResult = { source: string; status: "synced" | "skipped" | "failed"; count: number; inserted?: number; updated?: number; error?: string; durationMs?: number; queriesRun?: number };
type SourceConfig = { id: string; intervalMinutes: number; fetcher: (query: string, location?: string) => Promise<any[]> };

const QUERIES = [
  // Core technology
  "software engineer", "full stack developer", "data scientist", "data analyst",
  "machine learning engineer", "cybersecurity analyst", "cloud engineer", "devops engineer",
  // Electronics / electrical / telecom
  "embedded systems engineer", "electronics engineer", "vlsi engineer", "firmware engineer",
  "electrical engineer", "power systems engineer", "control systems engineer", "network engineer",
  // Mechanical / civil / architecture
  "mechanical engineer", "manufacturing engineer", "automotive engineer", "design engineer",
  "civil engineer", "structural engineer", "construction engineer", "site engineer",
  "architect", "interior designer", "bim engineer", "quantity surveyor",
  // Healthcare / pharma / life sciences
  "registered nurse", "staff nurse", "medical officer", "physician", "healthcare administrator",
  "medical laboratory technician", "radiology technician", "physiotherapist", "pharmacist",
  "clinical research", "medical coding", "biotechnology", "biomedical engineer",
  // Finance / banking / business
  "accountant", "financial analyst", "auditor", "bank officer", "credit analyst",
  "insurance analyst", "risk analyst", "human resources", "recruiter", "business development",
  "digital marketing", "product manager", "project manager", "business analyst",
  // Education / legal / government
  "school teacher", "lecturer", "professor", "instructional designer", "legal associate",
  "legal counsel", "paralegal", "compliance officer", "government officer", "public sector",
  // Operations / service / creative / other
  "supply chain", "procurement", "logistics", "operations executive", "hospitality",
  "retail manager", "customer support", "graphic designer", "content writer", "agriculture",
  "food technologist", "real estate", "aerospace engineer", "research scientist",
  // Early career
  "graduate trainee", "management trainee", "engineering trainee", "internship", "apprentice"
];

const SOURCES: SourceConfig[] = [
  { id: "adzuna", intervalMinutes: 60, fetcher: fetchAdzunaJobs },
  { id: "jooble", intervalMinutes: 60, fetcher: fetchJoobleJobs },
  { id: "remotive", intervalMinutes: 180, fetcher: fetchRemotiveJobs },
  { id: "greenhouse", intervalMinutes: 360, fetcher: fetchGreenhouseJobs },
  { id: "lever", intervalMinutes: 360, fetcher: fetchLeverJobs },
  { id: "workable", intervalMinutes: 360, fetcher: fetchWorkableJobs },
];

async function shouldSync(source: SourceConfig) {
  const state = await prisma.jobSyncState.findUnique({ where: { source: source.id } });
  if (!state?.lastSuccessAt) return true;
  return Date.now() - state.lastSuccessAt.getTime() >= source.intervalMinutes * 60_000;
}

async function runWithConcurrency<T>(items: string[], worker: (item: string) => Promise<T>, concurrency = 2): Promise<T[]> {
  const results: T[] = [];
  let cursor = 0;
  async function runner() {
    while (true) {
      const index = cursor++;
      if (index >= items.length) return;
      results[index] = await worker(items[index]);
    }
  }
  await Promise.all(Array.from({ length: Math.min(concurrency, items.length) }, () => runner()));
  return results;
}

async function runSource(source: SourceConfig): Promise<SourceResult> {
  const started = Date.now();
  const now = new Date();
  // Rotate through the domain query catalog so one cron run does not hammer a provider
  // with dozens of requests. Over successive runs every domain is refreshed.
  const batchSize = 28;
  const batchCount = Math.ceil(QUERIES.length / batchSize);
  const batchIndex = Math.floor(Date.now() / 3_600_000) % batchCount;
  const queries = QUERIES.slice(batchIndex * batchSize, (batchIndex + 1) * batchSize);
  await prisma.jobSyncState.upsert({ where: { source: source.id }, create: { id: source.id, source: source.id, lastStartedAt: now }, update: { lastStartedAt: now } });

  try {
    const outcomes = await runWithConcurrency(queries, async q => {
      try { return { ok: true, jobs: await source.fetcher(q, "India") }; }
      catch (error) { return { ok: false, jobs: [], error: error instanceof Error ? error.message : "Provider request failed" }; }
    }, 2);
    const successful = outcomes.filter(item => item.ok);
    const failures = outcomes.filter(item => !item.ok);
    if (!successful.length) {
      const message = failures.map(item => item.error).filter(Boolean).slice(0, 2).join("; ") || "All provider queries failed.";
      throw new Error(message);
    }
    const jobs = successful.flatMap(item => Array.isArray(item.jobs) ? item.jobs : []);
    const uniqueJobs = removeDuplicateJobs(jobs);
    const saved = await persistJobs(uniqueJobs);
    const completed = new Date();
    const durationMs = Date.now() - started;
    const warning = failures.length ? `${failures.length} of ${queries.length} queries failed.` : null;
    await prisma.jobSyncState.update({ where: { source: source.id }, data: { lastCompletedAt: completed, lastSuccessAt: completed, lastError: warning, lastFetched: jobs.length, lastUnique: uniqueJobs.length, lastInserted: saved.inserted, lastUpdated: saved.updated, durationMs } });
    return { source: source.id, status: "synced", count: uniqueJobs.length, inserted: saved.inserted, updated: saved.updated, error: warning || undefined, durationMs, queriesRun: queries.length };
  } catch (error) {
    const message = error instanceof Error ? error.message : "Source failed";
    await prisma.jobSyncState.update({ where: { source: source.id }, data: { lastCompletedAt: new Date(), lastError: message, durationMs: Date.now() - started } });
    return { source: source.id, status: "failed", count: 0, error: message, durationMs: Date.now() - started, queriesRun: queries.length };
  }
}

async function backfillMissingDomains(limit = 2000) {
  const rows = await prisma.job.findMany({
    where: { OR: [{ domain: null }, { domain: "" }, { domain: "other" }] },
    select: { id: true, title: true, description: true, company: true, requiredSkills: true, preferredSkills: true, domain: true },
    take: limit,
  });
  if (!rows.length) return 0;
  await prisma.$transaction(rows.map(row => prisma.job.update({
    where: { id: row.id },
    data: {
      domain: inferJobDomain({
        title: row.title,
        description: row.description,
        company: row.company,
        domain: row.domain || undefined,
        requiredSkills: Array.isArray(row.requiredSkills) ? row.requiredSkills.filter((item): item is string => typeof item === "string") : [],
        preferredSkills: Array.isArray(row.preferredSkills) ? row.preferredSkills.filter((item): item is string => typeof item === "string") : [],
      })
    },
  })));
  return rows.length;
}

async function sync(request: Request) {
  const secret = request.headers.get("x-job-sync-secret");
  const cronSecret = request.headers.get("authorization")?.replace(/^Bearer\s+/i, "");
  const configured = process.env.JOB_SYNC_SECRET || process.env.CRON_SECRET;
  if (!configured || (secret !== configured && cronSecret !== configured)) return NextResponse.json({ success: false, message: "Unauthorized" }, { status: 401 });

  const started = Date.now();
  const sourceResults: SourceResult[] = [];
  for (const source of SOURCES) {
    if (!(await shouldSync(source))) {
      sourceResults.push({ source: source.id, status: "skipped", count: 0 });
      continue;
    }
    sourceResults.push(await runSource(source));
  }

  // A job is considered stale only after it has not been observed for 14 days.
  // This is deliberately separate from source polling so skipped sources are not deactivated.
  const staleCutoff = new Date(Date.now() - 14 * 24 * 60 * 60 * 1000);
  const oldPostedCutoff = new Date(Date.now() - 180 * 24 * 60 * 60 * 1000);
  const sourceHealthCutoff = new Date(Date.now() - 48 * 60 * 60 * 1000);
  const healthySources = (await prisma.jobSyncState.findMany({
    where: { lastSuccessAt: { gte: sourceHealthCutoff } },
    select: { source: true }
  })).map(row => row.source);
  const staleRows = await prisma.job.findMany({
    where: {
      active: true,
      OR: [
        { lastSeenAt: { lt: staleCutoff }, source: { in: healthySources } },
        { postedDate: { lt: oldPostedCutoff } }
      ]
    },
    select: { id: true, source: true },
  });
  const staleResult = staleRows.length ? await prisma.job.updateMany({
    where: { id: { in: staleRows.map(row => row.id) } },
    data: { active: false },
  }) : { count: 0 };
  const deactivatedBySource = new Map<string, number>();
  for (const row of staleRows) deactivatedBySource.set(row.source, (deactivatedBySource.get(row.source) || 0) + 1);
  await Promise.all(Array.from(deactivatedBySource.entries()).map(([source, count]) => prisma.jobSyncState.updateMany({ where: { source }, data: { lastDeactivated: count } })));

  const domainBackfill = await backfillMissingDomains();

  // Process one bounded embedding batch after ingestion. This is background work from the user's
  // perspective and keeps the public search path free of document-embedding API calls.
  let embeddingBatch: Record<string, unknown> = { processed: 0, embedded: 0, deferred: 0 };
  if (process.env.GEMINI_API_KEY) {
    try { embeddingBatch = await processEmbeddingQueue(64); }
    catch (error) { console.error("Embedding queue batch skipped:", error); }
  }
  const embeddingQueue = await prisma.job.count({ where: { active: true, embeddingStatus: { in: ["pending", "failed"] }, embeddingAttempts: { lt: 5 } } });

  return NextResponse.json({ success: true, syncedAt: new Date().toISOString(), durationMs: Date.now() - started, deactivatedStale: staleResult.count, domainBackfill, embeddingQueue, embeddingBatch, sources: sourceResults });
}

export async function POST(req: Request) { return sync(req); }
export async function GET(req: Request) { return sync(req); }
