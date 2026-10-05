import { JobPosting } from "../types";
import { normalizeJob } from "./normalize";

const ADZUNA_APP_ID = process.env.ADZUNA_APP_ID as string;
const ADZUNA_APP_KEY = process.env.ADZUNA_APP_KEY as string;

const ADZUNA_BASE_URL = "https://api.adzuna.com/v1/api/jobs";

function getCountryCode(location?: string): string {
  if (!location) return "in";
  const loc = location.toLowerCase();
  if (loc.includes("india") || loc === "in") return "in";
  if (loc.includes("united states") || loc.includes("usa") || loc === "us" || loc.includes("new york") || loc.includes("san francisco") || loc.includes("seattle") || loc.includes("california") || loc.includes("texas")) return "us";
  if (loc.includes("united kingdom") || loc.includes("great britain") || loc === "uk" || loc === "gb" || loc.includes("london") || loc.includes("manchester")) return "gb";
  if (loc.includes("canada") || loc === "ca" || loc.includes("toronto") || loc.includes("vancouver")) return "ca";
  if (loc.includes("australia") || loc === "au" || loc.includes("sydney") || loc.includes("melbourne")) return "au";
  if (loc.includes("germany") || loc === "de" || loc.includes("berlin") || loc.includes("munich")) return "de";
  if (loc.includes("france") || loc === "fr" || loc.includes("paris")) return "fr";
  if (loc.includes("singapore") || loc === "sg") return "sg";
  return "in";
}

export async function fetchAdzunaJobs(
  query: string,
  preferredLocation?: string
): Promise<JobPosting[]> {
  try {
    if (!ADZUNA_APP_ID || !ADZUNA_APP_KEY) throw new Error("Adzuna credentials are not configured.");

    const country = getCountryCode(preferredLocation);
    const url = `${ADZUNA_BASE_URL}/${country}/search/1?app_id=${ADZUNA_APP_ID}&app_key=${ADZUNA_APP_KEY}&what=${encodeURIComponent(
      query
    )}&results_per_page=20&content-type=application/json`;

    const res = await fetch(url);

    if (!res.ok) throw new Error(`Adzuna API returned HTTP ${res.status}.`);

    const data = await res.json();

    const jobs = (data.results || []).map((job: any) =>
      normalizeJob({
        id: String(job.id),
        title: job.title,
        company: job.company?.display_name || "",
        location: job.location?.display_name || "",
        description: job.description,
        applyUrl: job.redirect_url,
        source: "adzuna",
        postedDate: job.created,
        minimumExperience: undefined
      })
    );

    return jobs;
  } catch (error) {
    throw error instanceof Error ? error : new Error("Adzuna request failed.");
  }
}
