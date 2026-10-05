import { ExpandedProfile, UserProfile } from "./types";
const SKILL_ALIASES: Record<string, string> = {
  "nodejs": "node.js",
  "node js": "node.js",
  "reactjs": "react",
  "react js": "react",
  "vuejs": "vue.js",
  "vue js": "vue.js",
  "angularjs": "angular",
  "angular js": "angular",
  "nextjs": "next.js",
  "next js": "next.js",
  "expressjs": "express.js",
  "express js": "express.js",
  "javascript": "javascript",
  "js": "javascript",
  "typescript": "typescript",
  "ts": "typescript",
  "c sharp": "c#",
  "csharp": "c#",
  "dotnet": ".net",
  ".net core": ".net",
  "asp.net": ".net",
  "ms excel": "microsoft excel",
  "excel": "microsoft excel",
  "ms word": "microsoft word",
  "word": "microsoft word",
  "power point": "microsoft powerpoint",
  "powerpoint": "microsoft powerpoint",
  "ai": "artificial intelligence",
  "ml": "machine learning"
};

export function normalizeText(value: string): string {
  return value
    .trim()
    .toLowerCase()
    .replace(/\s+/g, " ");
}

function normalizeSkill(skill: string): string {
  const normalized = normalizeText(skill);
  return SKILL_ALIASES[normalized] ?? normalized;
}

function unique(values: string[]): string[] {
  return [...new Set(values)];
}

export function normalizeProfile(profile: UserProfile): ExpandedProfile {
  const preferredLocation = normalizeText(profile.preferredLocation || "India");

  return {
    education: normalizeText(profile.education),
    experience: Math.max(0, profile.experience),
    preferredRoles: unique(profile.preferredRoles.map(normalizeText)),
    preferredDomain: profile.preferredDomain
      ? normalizeText(profile.preferredDomain)
      : undefined,
    preferredLocation: preferredLocation || "india",
    skills: unique(profile.skills.map(normalizeSkill)),
    certifications: unique((profile.certifications ?? []).map(normalizeText)),
    employmentType: profile.employmentType,
    workplacePreference: profile.workplacePreference,
    jobSector: profile.jobSector || "both"
  };
}
