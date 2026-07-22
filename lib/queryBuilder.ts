import { ExpandedProfile } from "./types";

export interface SearchQuery {
  keywords: string[];
  roles: string[];
  skills: string[];
  location?: string;
  employmentType?: string;
  workplaceType?: string;
}

function unique(values: string[]): string[] {
  return [...new Set(values.filter(Boolean))];
}

export function buildSearchQuery(profile: ExpandedProfile): SearchQuery {
  const keywords = unique([
    ...profile.preferredRoles,
    ...profile.skills,
    profile.education,
    profile.preferredDomain ?? ""
  ]);

  return {
    keywords,
    roles: profile.preferredRoles,
    skills: profile.skills,
    location: profile.preferredLocation || undefined,
    employmentType: profile.employmentType,
    workplaceType: profile.workplacePreference
  };
}

export function buildKeywordString(profile: ExpandedProfile): string {
  return buildSearchQuery(profile).keywords.join(" ");
}

export function buildRoleQueries(profile: ExpandedProfile): string[] {
  if (profile.preferredRoles.length > 0) {
    return profile.preferredRoles;
  }

  const edu = profile.education.toLowerCase();
  const skillsText = profile.skills.join(" ").toLowerCase();

  if (edu.includes("psychology") || skillsText.includes("psychology")) {
    return ["Psychologist", "Clinical Psychologist", "Mental Health"];
  }

  if (edu.includes("nurse") || edu.includes("nursing") || edu.includes("medical") || edu.includes("health") || edu.includes("mbbs")) {
    return ["Healthcare", "Nursing", "Clinical"];
  }

  if (edu.includes("finance") || edu.includes("accounting") || edu.includes("b.com") || edu.includes("m.com")) {
    return ["Finance", "Accountant"];
  }

  if (edu.includes("design") || edu.includes("ui") || edu.includes("ux")) {
    return ["Designer"];
  }

  if (profile.skills.length > 0) {
    return [profile.skills.slice(0, 2).join(" ")];
  }

  if (profile.preferredDomain) {
    return [profile.preferredDomain];
  }

  if (profile.education.trim()) {
    return [profile.education.trim()];
  }

  return ["Specialist"];
}