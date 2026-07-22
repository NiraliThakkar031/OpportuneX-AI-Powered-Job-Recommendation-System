export const MIN_MATCH_SCORE = 35;
export const DEFAULT_RESULTS = 20;
export const EXPERIENCE_TOLERANCE = 2;
export const SCORING_WEIGHTS = {
  education: 30,
  skills: 30,
  experience: 20,
  preferredRoles: 10,
  preferredDomain: 4,
  employmentType: 2,
  workplacePreference: 2,
  preferredLocation: 1,
  certifications: 0.5,
  freshness: 0.5,
} as const;

export const MATCH_LEVELS = {
  excellent: 80,
  good: 65,
  fair: 50,
  minimum: MIN_MATCH_SCORE,
} as const;

export const EMPLOYMENT_TYPES = [
  "full-time",
  "part-time",
  "internship",
  "contract",
  "temporary",
  "freelance",
] as const;

export const WORKPLACE_TYPES = [
  "remote",
  "hybrid",
  "on-site",
] as const;

export const FRESHNESS = {
  FULL_BONUS_DAYS: 7,
  HALF_BONUS_DAYS: 30,
} as const;