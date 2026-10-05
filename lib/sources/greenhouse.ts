import { JobPosting } from "../types";

const BOARDS = [
  "airbnb",
  "stripe",
  "spotify",
  "dropbox",
  "coinbase"
];

function safeText(value: unknown): string {
  return typeof value === "string" ? value : "";
}

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
    job.location?.name,
    job.company_name
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

export async function fetchGreenhouseJobs(
  query: string,
  preferredLocation?: string
): Promise<JobPosting[]> {
  try {
    const responses = await Promise.allSettled(
      BOARDS.map(async board => {
        const res = await fetch(
          `https://boards-api.greenhouse.io/v1/boards/${board}/jobs`
        );

        if (!res.ok) throw new Error(`Provider returned HTTP ${res.status}.`);

        const data = await res.json();
        console.log(board, data.jobs?.length ?? 0);
        return (data.jobs ?? [])
          .filter(
            (job: any) =>
              matches(query, job) &&
              matchesLocation(safeText(job.location?.name) || "Remote", preferredLocation)
          )
          .map((job: any) => ({
            id: String(job.id),
            title: safeText(job.title),
            company: board,
            location: safeText(job.location?.name) || "Remote",
            description: safeText(job.content),
            applyUrl: safeText(job.absolute_url),
            source: "greenhouse",
            postedDate: safeText(job.updated_at),

            domain: undefined,
            requiredEducation: undefined,
            minimumExperience: 0,

            requiredSkills: [],
            preferredSkills: [],
            requiredCertifications: [],

            employmentType: undefined,
            workplaceType: undefined
          }));
      })
    );

    const failed = responses.filter(result => result.status === "rejected");
    if (failed.length === responses.length) throw new Error(`Greenhouse provider failed for all configured boards.`);
    return responses
      .filter(
        (result): result is PromiseFulfilledResult<JobPosting[]> => result.status === "fulfilled"
      )
      .flatMap(result => result.value);
  } catch (error) {
    throw error instanceof Error ? error : new Error("Provider request failed.");
  }
}