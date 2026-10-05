import { JobPosting, EmploymentType } from "../types";
import { normalizeJob } from "./normalize";

const REMOTIVE_API_URL = "https://remotive.com/api/remote-jobs";

function mapEmploymentType(type?: string): EmploymentType | undefined {
  if (!type) return undefined;
  const t = type.toLowerCase().replace("_", "-");
  const validTypes = ["full-time", "part-time", "internship", "contract", "temporary", "freelance"];
  if (validTypes.includes(t)) {
    return t as EmploymentType;
  }
  return undefined;
}

function matchesLocation(jobLocation: string, preferredLocation?: string): boolean {
  if (!preferredLocation) return true;
  const jobLoc = jobLocation.toLowerCase();
  const prefLoc = preferredLocation.toLowerCase();

  if (prefLoc.includes("remote") || prefLoc.includes("worldwide") || prefLoc.includes("anywhere")) {
    return true;
  }

  if (jobLoc.includes(prefLoc)) {
    return true;
  }

  // Country level mapping for India
  if (prefLoc === "india" || prefLoc === "in") {
    const indianLocs = ["india", "bangalore", "karnataka", "delhi", "mumbai", "maharashtra", "hyderabad", "telangana", "pune", "trivandrum", "kerala", "lucknow", "uttar pradesh", "chennai", "tamil nadu", "sriharikota", "remote"];
    if (indianLocs.some(loc => jobLoc.includes(loc))) {
      return true;
    }
  }

  // Country level mapping for US
  if (prefLoc === "united states" || prefLoc === "usa" || prefLoc === "us" || prefLoc === "america") {
    const usLocs = ["us", "usa", "united states", "america", "palo alto", "san francisco", "california", "ca", "chicago", "new york", "seattle", "washington", "texas", "tx", "remote"];
    if (usLocs.some(loc => jobLoc.includes(loc))) {
      return true;
    }
  }

  if (jobLoc.includes("remote") || jobLoc.includes("worldwide") || jobLoc.includes("anywhere")) {
    const hasUSConstraint = jobLoc.includes("us") || jobLoc.includes("usa") || jobLoc.includes("united states") || jobLoc.includes("america");
    const hasUKConstraint = jobLoc.includes("uk") || jobLoc.includes("united kingdom") || jobLoc.includes("gb") || jobLoc.includes("london");
    const hasCAConstraint = jobLoc.includes("ca") || jobLoc.includes("canada");
    const hasDEConstraint = jobLoc.includes("de") || jobLoc.includes("germany") || jobLoc.includes("munich");
    const hasFRConstraint = jobLoc.includes("fr") || jobLoc.includes("france") || jobLoc.includes("paris");
    const hasINConstraint = jobLoc.includes("in") || jobLoc.includes("india") || jobLoc.includes("bangalore");

    const userInUS = prefLoc.includes("us") || prefLoc.includes("usa") || prefLoc.includes("united states") || prefLoc.includes("america");
    const userInUK = prefLoc.includes("uk") || prefLoc.includes("united kingdom") || prefLoc.includes("gb") || prefLoc.includes("london");
    const userInCA = prefLoc.includes("ca") || prefLoc.includes("canada");
    const userInDE = prefLoc.includes("de") || prefLoc.includes("germany") || prefLoc.includes("munich");
    const userInFR = prefLoc.includes("fr") || prefLoc.includes("france") || prefLoc.includes("paris");
    const userInIN = prefLoc.includes("in") || prefLoc.includes("india") || prefLoc.includes("bangalore");

    if (hasUSConstraint && !userInUS) return false;
    if (hasUKConstraint && !userInUK) return false;
    if (hasCAConstraint && !userInCA) return false;
    if (hasDEConstraint && !userInDE) return false;
    if (hasFRConstraint && !userInFR) return false;
    if (hasINConstraint && !userInIN) return false;

    return true;
  }

  return false;
}

export async function fetchRemotiveJobs(
  query: string,
  preferredLocation?: string
): Promise<JobPosting[]> {
  try {
    const url = `${REMOTIVE_API_URL}?search=${encodeURIComponent(query)}`;
    const res = await fetch(url);

    if (!res.ok) throw new Error(`Remotive API returned HTTP ${res.status}.`);

    const data = await res.json();
    const jobs = (data.jobs || [])
      .filter((job: any) =>
        matchesLocation(job.candidate_required_location || "Remote", preferredLocation)
      )
      .map((job: any) =>
        normalizeJob({
          id: String(job.id),
          title: job.title,
          company: job.company_name || "",
          location: job.candidate_required_location || "Remote",
          description: job.description || "",
          applyUrl: job.url,
          source: "remotive",
          postedDate: job.publication_date,
          requiredSkills: Array.isArray(job.tags) ? job.tags : [],
          employmentType: mapEmploymentType(job.job_type),
          workplaceType: "remote"
        })
      );

    return jobs;
  } catch (error) {
    throw error instanceof Error ? error : new Error("Remotive request failed.");
  }
}
