import { JobPosting } from "../types";
import { normalizeJob } from "./normalize";

const JOOBLE_API_URL = "https://jooble.org/api";
const JOOBLE_API_KEY = process.env.JOOBLE_API_KEY as string;

export async function fetchJoobleJobs(
  query: string,
  preferredLocation?: string
): Promise<JobPosting[]> {
  try {
    if (!JOOBLE_API_KEY) return [];

    const res = await fetch(JOOBLE_API_URL, {
      method: "POST",
      headers: {
        "Content-Type": "application/json"
      },
      body: JSON.stringify({
        key: JOOBLE_API_KEY,
        keywords: query,
        location: preferredLocation || "",
        page: 1
      })
    });

    if (!res.ok) return [];

    const data = await res.json();

    const jobs = (data.jobs || []).map((job: any) =>
      normalizeJob({
        id: job.id || job.link,
        title: job.title,
        company: job.company,
        location: job.location,
        description: job.snippet,
        applyUrl: job.link,
        source: "jooble",
        postedDate: job.updated
      })
    );

    return jobs;
  } catch {
    return [];
  }
}