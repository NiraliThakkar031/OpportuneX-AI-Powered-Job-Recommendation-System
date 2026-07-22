import { NextRequest, NextResponse } from "next/server";
import { DEFAULT_RESULTS } from "@/lib/constants";
import { normalizeProfile } from "@/lib/profile";
import { buildRoleQueries } from "@/lib/queryBuilder";
import { scoreJobs } from "@/lib/scoring";
import { buildExplanations } from "@/lib/explainer";
import { removeDuplicateJobs } from "@/lib/sources/normalize";
import { JobPosting, UserProfile } from "@/lib/types";
import { fetchGreenhouseJobs } from "@/lib/sources/greenhouse";
import { fetchJoobleJobs } from "@/lib/sources/jooble";
import { fetchAdzunaJobs } from "@/lib/sources/adzuna";
import { fetchRemotiveJobs } from "@/lib/sources/remotive";
import { fetchLeverJobs } from "@/lib/sources/lever";
import { fetchWorkableJobs } from "@/lib/sources/workable";
import { fetchGovJobs } from "@/lib/sources/gov";
import { fetchCatalogJobs } from "@/lib/sources/catalog";

async function safeFetchJobs(
  fn: (q: string, loc?: string) => Promise<JobPosting[]>,
  query: string,
  location?: string
) {
  try {
    const res = await fn(query, location);
    return Array.isArray(res) ? res : [];
  } catch {
    return [];
  }
}

export async function POST(req: NextRequest) {
  try {
    const body: UserProfile = await req.json();

    if (!body) {
      return NextResponse.json(
        { success: false, message: "Invalid profile" },
        { status: 400 }
      );
    }

    const profile = normalizeProfile(body);

    const queries = buildRoleQueries(profile)
      .filter(Boolean)
      .slice(0, 2);

    if (queries.length === 0) {
      return NextResponse.json({
        success: true,
        totalResults: 0,
        displayedResults: 0,
        results: []
      });
    }

    let allJobs: JobPosting[] = [];

    for (const query of queries) {
      const [greenhouse, jooble, adzuna, remotive, lever, workable, gov, catalog] = await Promise.all([
        safeFetchJobs(fetchGreenhouseJobs, query, profile.preferredLocation),
        safeFetchJobs(fetchJoobleJobs, query, profile.preferredLocation),
        safeFetchJobs(fetchAdzunaJobs, query, profile.preferredLocation),
        safeFetchJobs(fetchRemotiveJobs, query, profile.preferredLocation),
        safeFetchJobs(fetchLeverJobs, query, profile.preferredLocation),
        safeFetchJobs(fetchWorkableJobs, query, profile.preferredLocation),
        safeFetchJobs(fetchGovJobs, query, profile.preferredLocation),
        safeFetchJobs(fetchCatalogJobs, query, profile.preferredLocation)
      ]);

      console.log("Query:", query);
      console.log("Greenhouse:", greenhouse.length);
      console.log("Jooble:", jooble.length);
      console.log("Adzuna:", adzuna.length);
      console.log("Remotive:", remotive.length);
      console.log("Lever:", lever.length);
      console.log("Workable:", workable.length);
      console.log("Gov:", gov.length);
      console.log("Catalog:", catalog.length);

      allJobs.push(...greenhouse, ...jooble, ...adzuna, ...remotive, ...lever, ...workable, ...gov, ...catalog);
    }

    if (allJobs.length === 0) {
      const fallbackQuery = "Developer";
      const [greenhouse, jooble, adzuna, remotive, lever, workable, gov] = await Promise.all([
        safeFetchJobs(fetchGreenhouseJobs, fallbackQuery),
        safeFetchJobs(fetchJoobleJobs, fallbackQuery),
        safeFetchJobs(fetchAdzunaJobs, fallbackQuery),
        safeFetchJobs(fetchRemotiveJobs, fallbackQuery),
        safeFetchJobs(fetchLeverJobs, fallbackQuery),
        safeFetchJobs(fetchWorkableJobs, fallbackQuery),
        safeFetchJobs(fetchGovJobs, fallbackQuery)
      ]);
      allJobs.push(...greenhouse, ...jooble, ...adzuna, ...remotive, ...lever, ...workable, ...gov);
    }

    const uniqueJobs = removeDuplicateJobs(allJobs);

    let filteredJobs = uniqueJobs;
    if (profile.jobSector === "government") {
      filteredJobs = uniqueJobs.filter(job => job.source === "gov_india");
    } else if (profile.jobSector === "private") {
      filteredJobs = uniqueJobs.filter(job => job.source !== "gov_india");
    }

    if (filteredJobs.length === 0 && uniqueJobs.length > 0) {
      // If sector filter left 0 jobs (e.g. Gov selected but only private found), fallback to showing all jobs
      filteredJobs = uniqueJobs;
    }

    if (filteredJobs.length === 0) {
      return NextResponse.json({
        success: true,
        totalResults: 0,
        displayedResults: 0,
        results: []
      });
    }

    const scored = scoreJobs(profile, filteredJobs);
    console.log("Scored jobs:", scored.length);
    const results = buildExplanations(scored);
    console.log("Results built:", results.length);
    const finalResults = results.slice(0, DEFAULT_RESULTS);

    return NextResponse.json({
      success: true,
      totalResults: results.length,
      displayedResults: finalResults.length,
      results: finalResults
    });
  } catch (error) {
    console.error("API ERROR:", error);

    return NextResponse.json(
      {
        success: false,
        message:
          error instanceof Error ? error.message : "Failed to fetch jobs",
        results: []
      },
      { status: 500 }
    );
  }
}