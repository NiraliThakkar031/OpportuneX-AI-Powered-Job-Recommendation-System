import { getGeminiClient } from "@/lib/gemini";

export type Requirement = { name: string; category: string; importance: "required" | "preferred"; evidence?: string };

export function cleanList(value: unknown): string[] {
  if (!Array.isArray(value)) return [];
  return [...new Set(value.filter((x): x is string => typeof x === "string" && x.trim().length > 0).map(x => x.trim()))];
}

export function textTokens(text: string): Set<string> {
  return new Set(text.toLowerCase().replace(/[^a-z0-9+#.&/-]+/g, " ").split(/\s+/).filter(x => x.length > 2));
}

export function similarity(a: string, b: string): number {
  const A = textTokens(a), B = textTokens(b);
  if (!A.size || !B.size) return 0;
  let common = 0; for (const x of A) if (B.has(x)) common++;
  return common / Math.sqrt(A.size * B.size);
}

export async function extractRequirements(text: string): Promise<{ role: string; domain: string; requirements: Requirement[]; responsibilities: string[] }> {
  const prompt = `You are a domain-neutral career information extractor. Analyze this job description from ANY occupation or industry (technology, engineering, healthcare, finance, education, law, design, sales, operations, manufacturing, government, hospitality, research, etc.). Do not assume a technology career. Extract only evidence supported by the text. Return JSON only with keys role, domain, requirements, responsibilities. requirements is an array of {name, category, importance, evidence}; category must be one of skill, knowledge, education, certification, experience, competency, tool, language, license, other. Use exact or concise normalized requirement names. Separate required from preferred. If no domain is clear, use 'General'.\n\nJOB DESCRIPTION:\n${text.slice(0, 30000)}`;
  const response = await getGeminiClient().models.generateContent({ model: "gemini-2.5-flash", contents: [{ text: prompt }] });
  const raw = response.text?.trim() || "{}";
  try {
    const parsed = JSON.parse(raw.replace(/^```json\s*/i, "").replace(/```$/i, ""));
    return { role: String(parsed.role || "Unknown role"), domain: String(parsed.domain || "General"), requirements: Array.isArray(parsed.requirements) ? parsed.requirements : [], responsibilities: Array.isArray(parsed.responsibilities) ? parsed.responsibilities.map(String) : [] };
  } catch {
    return { role: "Unknown role", domain: "General", requirements: [], responsibilities: [] };
  }
}

export async function extractResumeFacts(text: string): Promise<{ roles: string[]; skills: string[]; education: string[]; certifications: string[]; experience: string[]; achievements: string[] }> {
  const prompt = `Extract structured facts from this resume without inventing anything. The resume may belong to any profession. Return JSON only with roles, skills, education, certifications, experience, achievements as arrays of concise strings. Preserve domain-specific terminology.\n\nRESUME:\n${text.slice(0, 30000)}`;
  const response = await getGeminiClient().models.generateContent({ model: "gemini-2.5-flash", contents: [{ text: prompt }] });
  const raw = response.text?.trim() || "{}";
  try {
    const parsed = JSON.parse(raw.replace(/^```json\s*/i, "").replace(/```$/i, ""));
    return { roles: cleanList(parsed.roles), skills: cleanList(parsed.skills), education: cleanList(parsed.education), certifications: cleanList(parsed.certifications), experience: cleanList(parsed.experience), achievements: cleanList(parsed.achievements) };
  } catch {
    return { roles: [], skills: [], education: [], certifications: [], experience: [], achievements: [] };
  }
}

export function matchRequirement(req: Requirement, facts: { roles: string[]; skills: string[]; education: string[]; certifications: string[]; experience: string[]; domain?: string[]; years?: number }): { matched: boolean; evidence: string; score: number } {
  const groups: Record<string, string[]> = {
    skill: facts.skills, tool: facts.skills, knowledge: facts.skills, competency: [...facts.skills, ...facts.roles],
    education: facts.education, certification: facts.certifications, license: facts.certifications, experience: facts.experience, language: facts.skills, other: [...facts.skills, ...facts.roles, ...(facts.domain || [])]
  };
  const candidates = groups[req.category] || [...facts.skills, ...facts.roles, ...facts.education, ...facts.certifications, ...facts.experience];
  let best = 0, evidence = "";
  for (const candidate of candidates) { const s = similarity(req.name, candidate); if (s > best) { best = s; evidence = candidate; } }
  return { matched: best >= 0.48 || candidates.some(c => c.toLowerCase() === req.name.toLowerCase()), evidence, score: Math.min(1, best) };
}
