import { JobPosting } from "../types";

export interface JobSource {
  name: string;
  fetchJobs(query: string, page?: number): Promise<JobPosting[]>;
}

export interface RawJob {
  [key: string]: unknown;
}

export interface JobNormalizer<T = RawJob> {
  normalize(job: T): JobPosting | null;
}