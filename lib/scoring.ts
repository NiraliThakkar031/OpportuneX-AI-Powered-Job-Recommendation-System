import {
  EXPERIENCE_TOLERANCE,
  FRESHNESS,
  MIN_MATCH_SCORE,
  SCORING_WEIGHTS
} from "./constants";
import {
  ExpandedProfile,
  JobPosting,
  RecommendationResult,
  ScoreBreakdown
} from "./types";

function normalize(text: string): string {
  return text.trim().toLowerCase();
}

function contains(text: string, values: string[]): number {
  if (!values.length) return 0;

  const source = normalize(text);
  let matched = 0;

  for (const value of values) {
    if (source.includes(normalize(value))) {
      matched++;
    }
  }

  return matched;
}

function daysSince(date?: string): number | null {
  if (!date) return null;

  const posted = new Date(date);

  if (Number.isNaN(posted.getTime())) {
    return null;
  }

  return Math.floor(
    (Date.now() - posted.getTime()) / (1000 * 60 * 60 * 24)
  );
}

function educationMatches(
  userEducation: string,
  requiredEducation?: string
): boolean {
  if (!requiredEducation || !userEducation) return true;

  const uEd = normalize(userEducation);
  const rEd = normalize(requiredEducation);

  if (uEd.includes(rEd) || rEd.includes(uEd)) return true;

  const bachelorKeywords = ["btech", "b.tech", "be", "b.e", "bachelor", "degree", "bs", "b.s", "bca"];
  const masterKeywords = ["mtech", "m.tech", "me", "m.e", "master", "ms", "m.s", "mca"];

  const uIsBachelor = bachelorKeywords.some((k) => uEd.includes(k));
  const rIsBachelor = bachelorKeywords.some((k) => rEd.includes(k));

  const uIsMaster = masterKeywords.some((k) => uEd.includes(k));
  const rIsMaster = masterKeywords.some((k) => rEd.includes(k));

  if ((uIsBachelor && rIsBachelor) || (uIsMaster && rIsMaster)) return true;

  return true; // Soft match by default so candidates aren't hard-filtered out on minor degree wording differences
}

function experienceRejected(
  userExperience: number,
  requiredExperience?: number
): boolean {
  if (requiredExperience === undefined) return false;

  return userExperience + EXPERIENCE_TOLERANCE < requiredExperience;
}

export function scoreJob(
  profile: ExpandedProfile,
  job: JobPosting
): RecommendationResult | null {
  const DOMAINS = {
    tech: ["software", "developer", "engineer", "programmer", "fullstack", "full stack", "frontend", "backend", "cyber", "devops", "system analyst", "code", "data scientist"],
    health_psych: ["psychology", "psychologist", "clinical", "nursing", "health", "medical", "hospital", "doctor", "therapist", "mental health", "counselor", "behavioral"],
    education: ["teacher", "lecturer", "professor", "counselor", "academic", "education", "tutor", "school", "faculty"],
    finance: ["finance", "accountant", "accounting", "audit", "banking", "tax", "commerce", "chartered accountant", "financial"],
    engineering: ["civil", "mechanical", "structural", "electrical", "construction", "autocad", "thermal", "propulsion"],
    hr_marketing: ["human resources", "recruitment", "talent acquisition", "digital marketing", "seo", "marketing", "growth"]
  };

  const userBg = normalize(`${profile.education} ${profile.skills.join(" ")} ${profile.preferredRoles.join(" ")}`);
  const jobTitleDesc = normalize(`${job.title} ${job.description} ${job.domain ?? ""}`);

  const getDomain = (text: string) => {
    for (const [domain, keywords] of Object.entries(DOMAINS)) {
      if (keywords.some(k => text.includes(k))) return domain;
    }
    return "general";
  };

  const userDomain = getDomain(userBg);
  const jobDomain = getDomain(jobTitleDesc);

  // Reject cross-domain mismatches if candidate is in a specific domain and job is in a different specific domain
  if (userDomain !== "general" && jobDomain !== "general" && userDomain !== jobDomain) {
    // Exception: Education roles like "Psychology Teacher" match both Education and Psychology
    const isInterdisciplinary = (userDomain === "health_psych" && jobDomain === "education") ||
                                (userDomain === "education" && jobDomain === "health_psych");
    if (!isInterdisciplinary) {
      return null;
    }
  }

  if (!educationMatches(profile.education, job.requiredEducation)) {
    return null;
  }

  if (experienceRejected(profile.experience, job.minimumExperience)) {
    return null;
  }

  const breakdown: ScoreBreakdown = {
    education: 0,
    skills: 0,
    experience: 0,
    preferredRoles: 0,
    preferredDomain: 0,
    employmentType: 0,
    workplacePreference: 0,
    preferredLocation: 0,
    certifications: 0,
    freshness: 0,
    total: 0
  };

  // Education scoring
  if (userDomain !== "general" && jobDomain !== "general" && userDomain === jobDomain) {
    breakdown.education = SCORING_WEIGHTS.education;
  } else if (job.requiredEducation) {
    breakdown.education = SCORING_WEIGHTS.education;
  } else {
    breakdown.education = 15;
  }

  // Skills scoring
  if (job.requiredSkills.length) {
    const matchedSkills = contains(
      profile.skills.join(" "),
      job.requiredSkills
    );

    breakdown.skills =
      (matchedSkills / job.requiredSkills.length) *
      SCORING_WEIGHTS.skills;
  } else {
    // If requiredSkills is empty in posting, check overlap between candidate skills and job title/description
    const matchedSkills = contains(
      `${job.title} ${job.description}`,
      profile.skills
    );
    if (profile.skills.length > 0) {
      breakdown.skills = (matchedSkills > 0 ? Math.min(1, matchedSkills / Math.min(3, profile.skills.length)) : 0.3) * SCORING_WEIGHTS.skills;
    } else {
      breakdown.skills = SCORING_WEIGHTS.skills * 0.7;
    }
  }

  if (job.minimumExperience === undefined) {
    breakdown.experience = SCORING_WEIGHTS.experience;
  } else {
    const gap = Math.max(
      0,
      job.minimumExperience - profile.experience
    );

    breakdown.experience =
      ((EXPERIENCE_TOLERANCE - Math.min(gap, EXPERIENCE_TOLERANCE)) /
        EXPERIENCE_TOLERANCE) *
      SCORING_WEIGHTS.experience;
  }

  let roleScore = 0;
  if (profile.preferredRoles.length) {
    const jobTitleTokens = normalize(job.title).split(/[^a-z0-9+#.]+/).filter(Boolean);
    let matchedCount = 0;
    for (const prefRole of profile.preferredRoles) {
      const roleTokens = normalize(prefRole).split(/[^a-z0-9+#.]+/).filter(Boolean);
      const overlap = roleTokens.filter(t => 
        jobTitleTokens.includes(t) || 
        (t === "developer" && jobTitleTokens.includes("engineer")) ||
        (t === "engineer" && jobTitleTokens.includes("developer"))
      );
      if (roleTokens.length > 0) {
        matchedCount += overlap.length / roleTokens.length;
      }
    }
    roleScore = Math.min(1, matchedCount / profile.preferredRoles.length) * SCORING_WEIGHTS.preferredRoles;
  }
  breakdown.preferredRoles = roleScore;

  if (
    profile.preferredDomain &&
    job.domain &&
    normalize(profile.preferredDomain) === normalize(job.domain)
  ) {
    breakdown.preferredDomain = SCORING_WEIGHTS.preferredDomain;
  }

  if (
    job.employmentType &&
    job.employmentType === profile.employmentType
  ) {
    breakdown.employmentType = SCORING_WEIGHTS.employmentType;
  }

  if (
    job.workplaceType &&
    job.workplaceType === profile.workplacePreference
  ) {
    breakdown.workplacePreference =
      SCORING_WEIGHTS.workplacePreference;
  }

  const jobLoc = normalize(job.location);
  const userLoc = normalize(profile.preferredLocation);
  const indianCities = ["india", "bangalore", "karnataka", "delhi", "mumbai", "maharashtra", "hyderabad", "telangana", "pune", "trivandrum", "kerala", "lucknow", "uttar pradesh", "chennai", "tamil nadu", "remote"];
  
  if (
    jobLoc.includes(userLoc) ||
    userLoc.includes(jobLoc) ||
    (userLoc === "india" && indianCities.some(c => jobLoc.includes(c)))
  ) {
    breakdown.preferredLocation = SCORING_WEIGHTS.preferredLocation;
  }

  if (job.requiredCertifications.length) {
    const matched = contains(
      profile.certifications.join(" "),
      job.requiredCertifications
    );

    breakdown.certifications =
      (matched / job.requiredCertifications.length) *
      SCORING_WEIGHTS.certifications;
  }

  const age = daysSince(job.postedDate);

  if (age !== null) {
    if (age <= FRESHNESS.FULL_BONUS_DAYS) {
      breakdown.freshness = SCORING_WEIGHTS.freshness;
    } else if (age <= FRESHNESS.HALF_BONUS_DAYS) {
      breakdown.freshness = SCORING_WEIGHTS.freshness / 2;
    }
  }

  breakdown.total = Object.values(breakdown)
    .slice(0, -1)
    .reduce((sum, value) => sum + value, 0);

  const matchedSkillCount = contains(
    profile.skills.join(" "),
    job.requiredSkills
  );

  if (breakdown.total < MIN_MATCH_SCORE) {
    return null;
  }

  return {
    job,
    matchPercentage: Math.round(breakdown.total),
    score: breakdown,
    matchedSkillCount,
    totalRequiredSkills: job.requiredSkills.length,
    matchSummary: [],
    explanation: ""
  };
}

function getSourcePriority(source: string): number {
  if (source.startsWith("gov_") || source.startsWith("direct_")) return 3;
  if (source === "adzuna" || source === "jooble") return 2;
  return 1;
}

export function scoreJobs(
  profile: ExpandedProfile,
  jobs: JobPosting[]
): RecommendationResult[] {
  return jobs
    .map(job => scoreJob(profile, job))
    .filter(
      (job): job is RecommendationResult => job !== null
    )
    .sort((a, b) => {
      const priorityDiff = getSourcePriority(b.job.source) - getSourcePriority(a.job.source);

      if (Math.abs(b.matchPercentage - a.matchPercentage) <= 5 && priorityDiff !== 0) {
        return priorityDiff;
      }

      if (b.matchPercentage !== a.matchPercentage) {
        return b.matchPercentage - a.matchPercentage;
      }

      return (
        new Date(b.job.postedDate ?? 0).getTime() -
        new Date(a.job.postedDate ?? 0).getTime()
      );
    });
}