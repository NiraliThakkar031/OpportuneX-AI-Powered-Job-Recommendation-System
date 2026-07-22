import { JobPosting, EmploymentType, WorkplaceType } from "../types";
import { normalizeJob } from "./normalize";

const BOARDS = [
  "huggingface",
  "seeq",
  "david-protein"
];

function tokenize(text: string): string[] {
  return text
    .toLowerCase()
    .split(/[^a-z0-9+#.]+/)
    .filter(Boolean);
}

function matches(query: string, job: any): boolean {
  const queryTokens = tokenize(query);

  const searchable = [
    job.title,
    job.department,
    job.function,
    job.industry,
    job.description
  ]
    .filter(Boolean)
    .join(" ")
    .toLowerCase();

  return queryTokens.some(token => searchable.includes(token));
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

function mapEmploymentType(type?: string): EmploymentType | undefined {
  if (!type) return undefined;
  const t = type.toLowerCase().replace("_", "-");
  if (t.includes("full")) return "full-time";
  if (t.includes("part")) return "part-time";
  if (t.includes("intern")) return "internship";
  if (t.includes("contract")) return "contract";
  if (t.includes("temp")) return "temporary";
  if (t.includes("free")) return "freelance";
  return undefined;
}

function formatLocation(locations?: any[]): string {
  if (!locations || locations.length === 0) return "Remote";
  const loc = locations[0];
  const parts = [loc.city, loc.region, loc.country].filter(Boolean);
  return parts.length > 0 ? parts.join(", ") : "Remote";
}

export async function fetchWorkableJobs(
  query: string,
  preferredLocation?: string
): Promise<JobPosting[]> {
  try {
    const responses = await Promise.allSettled(
      BOARDS.map(async board => {
        const url = `https://apply.workable.com/api/v1/widget/accounts/${board}?details=true`;
        const res = await fetch(url);

        if (!res.ok) return [];

        const data = await res.json();
        const jobs = data.jobs || [];

        const matchedJobs = jobs.filter(
          (job: any) =>
            matches(query, job) &&
            matchesLocation(formatLocation(job.locations) || "Remote", preferredLocation)
        );

        return matchedJobs.map((job: any) => {
          const locStr = formatLocation(job.locations);
          
          // Capitalize nicely (e.g. "david-protein" -> "David-protein")
          const displayName = board
            .split("-")
            .map(word => word.charAt(0).toUpperCase() + word.slice(1))
            .join(" ");

          return normalizeJob({
            id: String(job.shortcode || job.code || ""),
            title: job.title || "",
            company: displayName,
            location: locStr,
            description: job.description || "",
            applyUrl: job.application_url || job.url || "",
            source: "workable",
            postedDate: job.published_on || job.created_at,
            employmentType: mapEmploymentType(job.employment_type),
            workplaceType: job.telecommuting ? "remote" : undefined
          });
        });
      })
    );

    return responses
      .filter(
        (result): result is PromiseFulfilledResult<JobPosting[]> =>
          result.status === "fulfilled"
      )
      .flatMap(result => result.value);
  } catch {
    return [];
  }
}
