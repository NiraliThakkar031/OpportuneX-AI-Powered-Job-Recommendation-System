import { JobPosting, EmploymentType, WorkplaceType } from "../types";
import { normalizeJob } from "./normalize";

const BOARDS = [
  "palantir",
  "riotgames",
  "outreach",
  "scaleway"
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
    job.text,
    job.categories?.team,
    job.categories?.department,
    job.categories?.location,
    job.descriptionPlain
  ]
    .filter(Boolean)
    .join(" ")
    .toLowerCase();

  return queryTokens.some(token => searchable.includes(token));
}

function mapEmploymentType(commitment?: string): EmploymentType | undefined {
  if (!commitment) return undefined;
  const c = commitment.toLowerCase();
  if (c.includes("intern")) return "internship";
  if (c.includes("part")) return "part-time";
  if (c.includes("contract")) return "contract";
  if (c.includes("temporary")) return "temporary";
  if (c.includes("freelance")) return "freelance";
  return "full-time";
}

function mapWorkplaceType(type?: string): WorkplaceType | undefined {
  if (!type) return undefined;
  const t = type.toLowerCase();
  if (t === "onsite") return "on-site";
  if (t === "remote") return "remote";
  if (t === "hybrid") return "hybrid";
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

export async function fetchLeverJobs(
  query: string,
  preferredLocation?: string
): Promise<JobPosting[]> {
  try {
    const responses = await Promise.allSettled(
      BOARDS.map(async board => {
        const url = `https://api.lever.co/v0/postings/${board}?mode=json`;
        const res = await fetch(url);

        if (!res.ok) return [];

        const data = await res.json();
        if (!Array.isArray(data)) return [];

        const matchedJobs = data.filter(
          (job: any) =>
            matches(query, job) &&
            matchesLocation(job.categories?.location || "Remote", preferredLocation)
        );

        return matchedJobs.map((job: any) => {
          let fullDesc = job.descriptionPlain || "";
          if (Array.isArray(job.lists)) {
            for (const list of job.lists) {
              fullDesc += "\n\n" + (list.text || "") + "\n" + (list.content || "");
            }
          }

          const postedDate = job.createdAt
            ? new Date(job.createdAt).toISOString()
            : undefined;

          // Capitalize board name for nice display (e.g. "palantir" -> "Palantir")
          const displayName = board.charAt(0).toUpperCase() + board.slice(1);

          return normalizeJob({
            id: String(job.id),
            title: job.text || "",
            company: displayName,
            location: job.categories?.location || "Remote",
            description: fullDesc,
            applyUrl: job.hostedUrl || job.applyUrl || "",
            source: "lever",
            postedDate,
            employmentType: mapEmploymentType(job.categories?.commitment),
            workplaceType: mapWorkplaceType(job.workplaceType)
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
