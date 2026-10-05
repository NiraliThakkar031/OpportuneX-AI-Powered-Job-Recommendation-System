import { NextRequest, NextResponse } from "next/server";
import { createHash } from "crypto";
import { DEFAULT_RESULTS, EMPLOYMENT_TYPES, WORKPLACE_TYPES } from "@/lib/constants";
import { normalizeProfile } from "@/lib/profile";
import { removeDuplicateJobs } from "@/lib/sources/normalize";
import { ExpandedProfile, UserProfile } from "@/lib/types";
import { prisma } from "@/lib/db/prisma";
import { auth } from "@/auth";
import { prismaProfileToRecommendationInput, profilePayloadToRecommendationInput } from "@/lib/profilePayload";
import { Prisma } from "@prisma/client";
import { fetchAdzunaJobs } from "@/lib/sources/adzuna";
import { fetchJoobleJobs } from "@/lib/sources/jooble";
import { fetchRemotiveJobs } from "@/lib/sources/remotive";
import { persistJobs } from "@/lib/jobs/persist";
import {
  dbJobToPosting,
  hardEligibility,
  semanticRerank,
  semanticRetrieve,
  roleAffinity,
  selectFinalResults,
  SEMANTIC_CANDIDATE_LIMIT,
  HYBRID_EMBEDDING_VERSION,
} from "@/lib/recommendation/semantic";

type Recommendation = Awaited<ReturnType<typeof semanticRerank>>[number];

function stringArray(value: unknown): string[] {
  return Array.isArray(value) ? value.filter((item): item is string => typeof item === "string") : [];
}

function activeFreshnessWhere(): Prisma.JobWhereInput {
  const staleCutoff = new Date(Date.now() - 14 * 24 * 60 * 60 * 1000);
  const postedCutoff = new Date(Date.now() - 180 * 24 * 60 * 60 * 1000);
  return {
    active: true,
    applyUrl: { not: "" },
    lastCheckedAt: { gte: staleCutoff },
    OR: [{ postedDate: null }, { postedDate: { gte: postedCutoff } }],
  };
}

function recommendationWhere(relaxed = false): Prisma.JobWhereInput {
  return relaxed ? { active: true, applyUrl: { not: "" } } : activeFreshnessWhere();
}

function splitSearchParts(value: string): string[] {
  return value.split(/[,;|/]+|\band\b/i).map(item => item.trim()).filter(Boolean);
}

async function loadSemanticCandidates(profile: UserProfile, searchQuery: string, relaxed = false) {
  const rows = await prisma.job.findMany({
    where: recommendationWhere(relaxed),
    orderBy: [{ lastCheckedAt: "desc" }, { qualityScore: "desc" }, { postedDate: "desc" }],
    take: SEMANTIC_CANDIDATE_LIMIT,
  });

  // Stage 1: sector/location/workplace/experience + broad domain-family eligibility.
  // Stage 2: role-aware retrieval. This is the important distinction from v27: the
  // selected role now changes which jobs enter the semantic/vector candidate pool.
  const eligible = rows
    .map(row => ({ row, job: dbJobToPosting(row) }))
    .filter(({ job }) => hardEligibility(profile, job).eligible);

  const roleScored = eligible
    .map(item => ({ ...item, roleScore: roleAffinity(profile, item.job, searchQuery) }))
    .sort((a, b) => b.roleScore - a.roleScore);

  const hasRoleIntent = Boolean(profile.preferredRoles.length || searchQuery);
  const primaryRoleRows = hasRoleIntent
    ? roleScored.filter(item => item.roleScore >= 0.72)
    : roleScored;

  // Controlled fallback: if the selected role has too few openings, admit the
  // closest same-domain jobs rather than returning zero. This keeps different
  // roles distinct while avoiding empty pages for sparse domains.
  const minimumPrimary = Math.min(30, Math.max(10, Math.floor(SEMANTIC_CANDIDATE_LIMIT / 100)));
  const selected = primaryRoleRows.length >= minimumPrimary
    ? primaryRoleRows
    : roleScored.slice(0, Math.max(minimumPrimary, primaryRoleRows.length));

  const unique = removeDuplicateJobs(selected.map(item => item.job));
  const uniqueKeys = new Set(unique.map(job => `${job.source}:${job.id}`));
  const selectedRows = selected
    .filter(item => uniqueKeys.has(`${item.job.source}:${item.job.id}`))
    .map(item => item.row);

  return {
    rows: selectedRows,
    total: selectedRows.length,
    searchQuery,
    roleMatched: primaryRoleRows.length,
  };
}

async function rankCandidateRows(profile: ExpandedProfile, rows: any[], searchQuery: string) {
  const embeddedRows = rows.filter(row => {
    const vectors = [row.embedding, row.embeddingRole, row.embeddingSkills, row.embeddingDomain];
    return vectors.some(vector => Array.isArray(vector) && vector.length === 768);
  });
  // Prefer stored Gemini vectors, but never fail the entire Jobs page when
  // embeddings are missing or Google's embedding endpoint is temporarily
  // unreachable. semanticRetrieve has a local vector fallback; it still
  // receives the full hard-domain-filtered candidate pool in that case.
  const retrievalRows = embeddedRows.length >= Math.max(5, Math.ceil(rows.length * 0.5)) ? embeddedRows : rows;
  const retrieved = await semanticRetrieve(profile, retrievalRows, searchQuery, 40);
  const reranked = await semanticRerank(profile, retrieved, searchQuery);
  return { retrieved, results: selectFinalResults(reranked, DEFAULT_RESULTS) };
}

async function fetchLiveRecommendationJobs(profile: ExpandedProfile, searchQuery: string) {
  const baseQueries = [
    searchQuery,
    ...profile.preferredRoles,
    ...splitSearchParts(profile.preferredDomain || ""),
  ].map(value => value.trim()).filter(Boolean);
  const queries = [...new Set(baseQueries)].slice(0, 3);
  if (!queries.length) return { fetched: 0, saved: 0, errors: [] as string[] };

  const sources = [fetchAdzunaJobs, fetchJoobleJobs, fetchRemotiveJobs];
  const outcomes = await Promise.all(queries.flatMap(query => sources.map(async fetcher => {
    try { return { jobs: await fetcher(query, profile.preferredLocation), error: "" }; }
    catch (error) { return { jobs: [], error: error instanceof Error ? error.message : "Provider request failed" }; }
  })));

  const jobs = removeDuplicateJobs(outcomes.flatMap(item => item.jobs));
  const eligibleJobs = jobs.filter(job => hardEligibility(profile, job).eligible);
  const saved = eligibleJobs.length ? await persistJobs(eligibleJobs) : { saved: 0 };
  return {
    fetched: jobs.length,
    saved: saved.saved,
    errors: outcomes.map(item => item.error).filter(Boolean).slice(0, 3),
  };
}

async function saveInterviewContext(userId: string, results: Recommendation[]) {
  await prisma.jobActivity.deleteMany({ where: { userId, type: "interview_context" } });
  if (!results.length) return;
  await prisma.jobActivity.create({
    data: { userId, jobId: `${results[0].job.source}:${results[0].job.id}`, type: "interview_context" },
  });
}

async function saveRecommendations(userId: string, results: Recommendation[]) {
  await prisma.recommendation.deleteMany({ where: { userId } });
  if (!results.length) return;
  await prisma.recommendation.createMany({
    data: results.slice(0, DEFAULT_RESULTS).map(item => ({
      userId,
      jobId: `${item.job.source}:${item.job.id}`,
      score: item.matchPercentage,
      breakdown: item.score as unknown as Prisma.InputJsonValue,
      matchedSkills: item.matchedSkills as Prisma.InputJsonValue,
      missingSkills: item.missingSkills as Prisma.InputJsonValue,
    })),
    skipDuplicates: true,
  });
}

let lastStaleSweep = 0;
async function deactivateStaleJobs() {
  if (Date.now() - lastStaleSweep < 5 * 60 * 1000) return;
  const staleCutoff = new Date(Date.now() - 14 * 24 * 60 * 60 * 1000);
  const oldPostedCutoff = new Date(Date.now() - 180 * 24 * 60 * 60 * 1000);
  await prisma.job.updateMany({
    where: {
      active: true,
      OR: [{ lastCheckedAt: { lt: staleCutoff } }, { postedDate: { lt: oldPostedCutoff } }],
    },
    data: { active: false },
  });
  lastStaleSweep = Date.now();
}

const recommendationCache = new Map<string, { profileUpdatedAt: number; createdAt: number; results: Recommendation[] }>();
const RECOMMENDATION_CACHE_TTL = 5 * 60 * 1000;
const RECOMMENDATION_CACHE_VERSION = HYBRID_EMBEDDING_VERSION;

export async function GET(req: NextRequest) {
  const q = req.nextUrl.searchParams.get("q")?.trim();
  const location = req.nextUrl.searchParams.get("location")?.trim();
  const take = Math.min(Number(req.nextUrl.searchParams.get("limit") || 50), 100);
  try {
    await deactivateStaleJobs();
    const jobs = await prisma.job.findMany({
      where: {
        AND: [
          activeFreshnessWhere(),
          ...(q ? [{ OR: [
            { title: { contains: q, mode: "insensitive" as const } },
            { company: { contains: q, mode: "insensitive" as const } },
            { description: { contains: q, mode: "insensitive" as const } },
          ] }] : []),
        ],
        ...(location ? { location: { contains: location, mode: "insensitive" } } : {}),
      },
      orderBy: [{ lastCheckedAt: "desc" }, { qualityScore: "desc" }, { postedDate: "desc" }],
      take,
    });
    return NextResponse.json({ success: true, results: jobs.map(dbJobToPosting), source: "database" });
  } catch (error) {
    return NextResponse.json({ success: false, message: error instanceof Error ? error.message : "Database unavailable", results: [] }, { status: 503 });
  }
}

export async function POST(req: NextRequest) {
  try {
    await deactivateStaleJobs();
    const session = await auth();
    const body = await req.json().catch(() => ({}));
    const searchQuery = String(body?.query || "").trim().slice(0, 160);
    const guestPayload = body?.profile;
    let profile: ExpandedProfile;
    let profileUpdatedAt = 0;
    let cacheUserKey = "guest";

    if (session?.user?.id) {
      const savedProfile = await prisma.profile.findUnique({ where: { userId: session.user.id } });
      if (!savedProfile && !guestPayload) {
        return NextResponse.json({ success: false, message: "Complete your profile before loading recommendations." }, { status: 428 });
      }
      if (savedProfile) {
        profile = normalizeProfile(prismaProfileToRecommendationInput(savedProfile));
        profileUpdatedAt = savedProfile.updatedAt.getTime();
        cacheUserKey = session.user.id;
      } else {
        const { profilePayloadSchema } = await import("@/lib/profilePayload");
        profile = normalizeProfile(profilePayloadToRecommendationInput(profilePayloadSchema.parse(guestPayload)));
        profileUpdatedAt = Date.now();
      }
    } else {
      const { profilePayloadSchema } = await import("@/lib/profilePayload");
      if (!guestPayload) return NextResponse.json({ success: false, message: "Complete your job profile first." }, { status: 428 });
      profile = normalizeProfile(profilePayloadToRecommendationInput(profilePayloadSchema.parse(guestPayload)));
    }

    const profileFingerprint = createHash("sha1").update(JSON.stringify({ roles: profile.preferredRoles, domain: profile.preferredDomain, skills: profile.skills, experience: profile.experience, location: profile.preferredLocation, workplace: profile.workplacePreference, employmentType: profile.employmentType, sector: profile.jobSector })).digest("hex").slice(0, 16);
    const cacheKey = `${RECOMMENDATION_CACHE_VERSION}:${cacheUserKey}:${profileFingerprint}:${searchQuery.toLowerCase()}`;
    const cached = recommendationCache.get(cacheKey);
    if (cached && cached.profileUpdatedAt === profileUpdatedAt && Date.now() - cached.createdAt < RECOMMENDATION_CACHE_TTL) {
      if (session?.user?.id) {
        try {
          if (cached.results.length) await saveInterviewContext(session.user.id, cached.results);
          else if (searchQuery) await prisma.jobActivity.deleteMany({ where: { userId: session.user.id, type: "interview_context" } });
        } catch (error) { console.error("Interview context persistence failed:", error); }
      }
      return NextResponse.json({ success: true, mode: "hybrid-vector", totalResults: cached.results.length, displayedResults: cached.results.length, results: cached.results, cached: true });
    }

    let candidatePool = await loadSemanticCandidates(profile, searchQuery);
    let retrieved: Awaited<ReturnType<typeof semanticRetrieve>> = [];
    let results: Recommendation[] = [];
    let source: "database" | "api-refill" | "database-fallback" = "database";
    let apiRefill: Awaited<ReturnType<typeof fetchLiveRecommendationJobs>> | undefined;

    if (candidatePool.rows.length) {
      const ranked = await rankCandidateRows(profile, candidatePool.rows, searchQuery);
      retrieved = ranked.retrieved;
      results = ranked.results;
    }

    if (!results.length) {
      apiRefill = await fetchLiveRecommendationJobs(profile, searchQuery);
      if (apiRefill.saved > 0) {
        const refreshedPool = await loadSemanticCandidates(profile, searchQuery);
        if (refreshedPool.rows.length) {
          const ranked = await rankCandidateRows(profile, refreshedPool.rows, searchQuery);
          if (ranked.results.length) {
            candidatePool = refreshedPool;
            retrieved = ranked.retrieved;
            results = ranked.results;
            source = "api-refill";
          }
        }
      }
    }

    if (!results.length) {
      const fallbackPool = await loadSemanticCandidates(profile, searchQuery, true);
      if (fallbackPool.rows.length) {
        const ranked = await rankCandidateRows(profile, fallbackPool.rows, searchQuery);
        candidatePool = fallbackPool;
        retrieved = ranked.retrieved;
        results = ranked.results;
        source = results.length ? "database-fallback" : source;
      }
    }

    if (!candidatePool.rows.length || !results.length) {
      if (session?.user?.id && searchQuery) await prisma.jobActivity.deleteMany({ where: { userId: session.user.id, type: "interview_context" } });
      return NextResponse.json({
        success: true,
        mode: "hybrid-vector",
        source,
        query: searchQuery,
        totalResults: candidatePool.total,
        roleMatchedResults: candidatePool.roleMatched,
        retrievedResults: retrieved.length,
        displayedResults: 0,
        results: [],
        cached: false,
        apiRefill,
        message: "No same-domain recommendations matched the selected role strongly enough right now.",
      });
    }

    if (session?.user?.id) {
      try {
        if (results.length) await saveInterviewContext(session.user.id, results);
        else if (searchQuery) await prisma.jobActivity.deleteMany({ where: { userId: session.user.id, type: "interview_context" } });
        if (!searchQuery) await saveRecommendations(session.user.id, results);
      } catch (error) { console.error("Job context/recommendation persistence failed:", error); }
    }

    recommendationCache.set(cacheKey, { profileUpdatedAt, createdAt: Date.now(), results });
    return NextResponse.json({
      success: true,
      mode: "hybrid-vector",
      source,
      query: searchQuery,
      totalResults: candidatePool.total,
      roleMatchedResults: candidatePool.roleMatched,
      retrievedResults: retrieved.length,
      displayedResults: results.length,
      results,
      cached: false,
      apiRefill,
    });
  } catch (error) {
    console.error("Semantic recommendation API error:", error);
    return NextResponse.json({ success: false, message: error instanceof Error ? error.message : "Failed to load semantic recommendations", results: [] }, { status: 503 });
  }
}
