import { RecommendationResult } from "./types";

export function buildMatchSummary(
  recommendation: RecommendationResult
): RecommendationResult {
  const { job, matchedSkillCount, totalRequiredSkills, score } = recommendation;

  const matchSummary: { title: string; value?: string }[] = [];

  if (score.education > 0) {
    matchSummary.push({ title: "Qualification Match" });
  }

  if (matchedSkillCount > 0) {
    matchSummary.push({
      title: "Skills Matched",
      value: `${matchedSkillCount}/${totalRequiredSkills}`
    });
  }

  if (score.experience > 0) {
    matchSummary.push({ title: "Experience Match" });
  }

  if (score.preferredRoles > 0) {
    matchSummary.push({
      title: "Preferred Role Match",
      value: job.title
    });
  }

  if (score.preferredDomain > 0) {
    matchSummary.push({ title: "Preferred Domain Match" });
  }

  if (score.workplacePreference > 0) {
    matchSummary.push({
      title: "Workplace Preference Match"
    });
  }

  if (score.employmentType > 0) {
    matchSummary.push({
      title: "Employment Type Match"
    });
  }

  if (score.preferredLocation > 0) {
    matchSummary.push({
      title: "Preferred Location Match"
    });
  }

  if (score.certifications > 0) {
    matchSummary.push({
      title: "Certification Match"
    });
  }

  let explanation = `This job matches your`;

  const reasons: string[] = [];

  if (score.education > 0) reasons.push("qualification");
  if (matchedSkillCount > 0) reasons.push("skills");
  if (score.experience > 0) reasons.push("experience");
  if (score.preferredRoles > 0) reasons.push("preferred role");

  explanation += ` ${reasons.join(", ")}.`;

  return {
    ...recommendation,
    matchSummary,
    explanation
  };
}

export function buildExplanations(
  recommendations: RecommendationResult[]
): RecommendationResult[] {
  return recommendations.map(buildMatchSummary);
}