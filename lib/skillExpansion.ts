import { ExpandedProfile } from "./types";

const SKILL_SYNONYMS: Record<string, string[]> = {
  javascript: ["js", "ecmascript"],
  typescript: ["ts"],
  "node.js": ["nodejs", "node js"],
  react: ["reactjs", "react js"],
  "vue.js": ["vuejs", "vue js"],
  angular: ["angularjs", "angular js"],
  ".net": ["dotnet", ".net core", "asp.net"],
  "c#": ["csharp", "c sharp"],
  "machine learning": ["ml"],
  "artificial intelligence": ["ai"],
  "microsoft excel": ["excel", "ms excel"],
  "microsoft word": ["word", "ms word"],
  "microsoft powerpoint": ["powerpoint", "power point"],
  sql: ["mysql", "postgresql", "sqlite", "sql server"]
};

function normalize(text: string): string {
  return text.trim().toLowerCase().replace(/\s+/g, " ");
}

export function expandSkills(skills: string[]): string[] {
  const expanded = new Set<string>();

  for (const skill of skills) {
    const normalized = normalize(skill);

    expanded.add(normalized);

    const aliases = SKILL_SYNONYMS[normalized];
    if (aliases) {
      aliases.forEach(alias => expanded.add(normalize(alias)));
      continue;
    }

    for (const [canonical, synonyms] of Object.entries(SKILL_SYNONYMS)) {
      if (synonyms.includes(normalized)) {
        expanded.add(canonical);
        synonyms.forEach(alias => expanded.add(normalize(alias)));
      }
    }
  }

  return [...expanded];
}

export function expandProfileSkills(profile: ExpandedProfile): ExpandedProfile {
  return {
    ...profile,
    skills: expandSkills(profile.skills)
  };
}