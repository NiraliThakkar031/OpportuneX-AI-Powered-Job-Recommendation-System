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
  sourceType?: string;
  officialSource?: boolean;
  postedDate?: string;
  lastCheckedAt?: string;
  active?: boolean;
  domain?: string;
  requiredEducation?: string;
  minimumExperience?: number;
  requiredSkills: string[];
  preferredSkills: string[];
  requiredCertifications: string[];
  employmentType?: EmploymentType;
  workplaceType?: WorkplaceType;
}

export interface SemanticBreakdown {
  semanticSimilarity: number;
  roleSimilarity?: number;
  skillSimilarity?: number;
  domainSimilarity?: number;
  fullSimilarity?: number;
  hybridVectorScore?: number;
  rerankRelevance: number;
  roleAffinity?: number;
  domainFit?: number;
  requiredSkillFit?: number;
  eligibility: number;
}

export interface MatchSummary {
  title: string;
  value?: string;
}

export interface RecommendationResult {
  job: JobPosting;
  matchPercentage: number;
  confidence: "high" | "medium" | "low";
  score: SemanticBreakdown;
  matchedSkillCount: number;
  totalRequiredSkills: number;
  matchedSkills: string[];
  missingSkills: string[];
  reasonCodes: string[];
  dataCompleteness: number;
  matchSummary: MatchSummary[];
  explanation: string;
}
