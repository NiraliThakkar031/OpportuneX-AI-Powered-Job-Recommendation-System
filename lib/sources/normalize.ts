import { JobPosting } from "../types";
import { inferJobDomain } from "./domainClassifier";

function normalizeText(value: unknown): string {
  if (typeof value !== "string") return "";
  return value.trim().replace(/\s+/g, " ");
}

function normalizeArray(value: unknown): string[] {
  if (!Array.isArray(value)) return [];
  return [...new Set(value.map(item => normalizeText(item)).filter(Boolean))];
}

export function normalizeJob(job: Partial<JobPosting>): JobPosting {
  const normalizedJob: JobPosting = {
    id: normalizeText(job.id),
    title: normalizeText(job.title),
    company: normalizeText(job.company),
    location: normalizeText(job.location),
    description: normalizeText(job.description),
    applyUrl: normalizeText(job.applyUrl),
    source: normalizeText(job.source),
    postedDate: job.postedDate,
    domain: normalizeText(job.domain),
    requiredEducation: normalizeText(job.requiredEducation),
    minimumExperience: job.minimumExperience,
    requiredSkills: normalizeArray(job.requiredSkills),
    preferredSkills: normalizeArray(job.preferredSkills),
    requiredCertifications: normalizeArray(job.requiredCertifications),
    employmentType: job.employmentType,
    workplaceType: job.workplaceType
  };
  normalizedJob.domain = inferJobDomain(normalizedJob);
  return normalizedJob;
}

export function removeDuplicateJobs(jobs: JobPosting[]): JobPosting[] {
  const unique = new Map<string, JobPosting>();

  for (const job of jobs) {
    const key = [
      job.title.toLowerCase(),
      job.company.toLowerCase(),
      job.location.toLowerCase()
    ].join("|");

    const existing = unique.get(key);

    if (!existing) {
      unique.set(key, job);
      continue;
    }

    const existingScore =
      existing.description.length + existing.requiredSkills.length * 10;

    const currentScore =
      job.description.length + job.requiredSkills.length * 10;

    if (currentScore > existingScore) {
      unique.set(key, job);
    } else if (
      currentScore === existingScore &&
      (job.postedDate ?? "") > (existing.postedDate ?? "")
    ) {
      unique.set(key, job);
    }
  }

  return [...unique.values()];
}