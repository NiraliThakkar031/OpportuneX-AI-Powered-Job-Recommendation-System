import { EMPLOYMENT_TYPES, WORKPLACE_TYPES } from "./constants";
export type EmploymentType = (typeof EMPLOYMENT_TYPES)[number];
export type WorkplaceType = (typeof WORKPLACE_TYPES)[number];
export interface UserProfile {
  education: string;
  experience: number;
  preferredRoles: string[];
  preferredDomain?: string;
  preferredLocation: string;
  skills: string[];
  certifications?: string[];
  employmentType: EmploymentType;
  workplacePreference: WorkplaceType;
  jobSector?: "private" | "government" | "both";
}

export interface ExpandedProfile {
  education: string;
  experience: number;
  preferredRoles: string[];
  preferredDomain?: string;
  preferredLocation: string;
  skills: string[];
  certifications: string[];
  employmentType: EmploymentType;
  workplacePreference: WorkplaceType;
  jobSector?: "private" | "government" | "both";
}

export interface JobPosting {
  id: string;
  title: string;
  company: string;
  location: string;
  description: string;
  applyUrl: string;
  source: string;
  postedDate?: string;
  domain?: string;
  requiredEducation?: string;
  minimumExperience?: number;
  requiredSkills: string[];
  preferredSkills: string[];
  requiredCertifications: string[];
  employmentType?: EmploymentType;
  workplaceType?: WorkplaceType;
}

export interface ScoreBreakdown {
  education: number;
  skills: number;
  experience: number;
  preferredRoles: number;
  preferredDomain: number;
  employmentType: number;
  workplacePreference: number;
  preferredLocation: number;
  certifications: number;
  freshness: number;
  total: number;
}

export interface MatchSummary {
  title: string;
  value?: string;
}

export interface RecommendationResult {
  job: JobPosting;
  matchPercentage: number;
  score: ScoreBreakdown;
  matchedSkillCount: number;
  totalRequiredSkills: number;
  matchSummary: MatchSummary[];
  explanation: string;
}