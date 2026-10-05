import { GoogleGenAI } from "@google/genai";
import { prisma } from "@/lib/db/prisma";
import { ExpandedProfile, JobPosting, RecommendationResult, UserProfile } from "@/lib/types";
import { EMPLOYMENT_TYPES, WORKPLACE_TYPES } from "@/lib/constants";
import { inferJobDomain } from "@/lib/sources/domainClassifier";

export const EMBEDDING_MODEL = "gemini-embedding-001";
export const EMBEDDING_DIMENSIONS = 768;
export const RERANK_MODEL = "gemini-3.8-flash";
export const SEMANTIC_CANDIDATE_LIMIT = 10000;
export const SEMANTIC_TOP_K = 40;
export const HYBRID_EMBEDDING_VERSION = "hybrid-v6-cross-domain-recall";
export const FINAL_RESULTS = 20;

function ai() {
  const key = process.env.GEMINI_API_KEY;
  if (!key) throw new Error("GEMINI_API_KEY is required for semantic job recommendations.");
  return new GoogleGenAI({ apiKey: key });
}

function clean(value: unknown): string {
  return typeof value === "string" ? value.replace(/\s+/g, " ").trim() : "";
}

function unique(values: string[]): string[] {
  return [...new Set(values.map(clean).filter(Boolean))];
}

export function buildJobEmbeddingText(job: JobPosting): string {
  return [
    `Job title: ${job.title}`,
    `Company: ${job.company}`,
    job.domain ? `Domain: ${job.domain}` : `Inferred domain: ${inferJobDomain(job)}`,
    job.requiredEducation ? `Education: ${job.requiredEducation}` : "",
    job.minimumExperience !== undefined ? `Experience: ${job.minimumExperience} years` : "",
    job.requiredSkills.length ? `Required skills: ${job.requiredSkills.join(", ")}` : "",
    job.preferredSkills.length ? `Preferred skills: ${job.preferredSkills.join(", ")}` : "",
    job.requiredCertifications.length ? `Certifications: ${job.requiredCertifications.join(", ")}` : "",
    job.employmentType ? `Employment type: ${job.employmentType}` : "",
    job.workplaceType ? `Workplace: ${job.workplaceType}` : "",
    `Location: ${job.location}`,
    `Description: ${job.description.slice(0, 7000)}`,
  ].filter(Boolean).join("\n").slice(0, 12000);
}

export function buildJobRoleEmbeddingText(job: JobPosting): string {
  return [
    `Primary job role: ${job.title}`,
    `Responsibilities and role context: ${job.description.slice(0, 1800)}`,
  ].join("\n").slice(0, 3200);
}

export function buildJobSkillsEmbeddingText(job: JobPosting): string {
  return [
    `Role: ${job.title}`,
    `Required skills: ${job.requiredSkills.join(", ")}`,
    `Preferred skills: ${job.preferredSkills.join(", ")}`,
    `Certifications: ${job.requiredCertifications.join(", ")}`,
    `Skill evidence in description: ${job.description.slice(0, 4200)}`,
  ].join("\n").slice(0, 7000);
}

export function buildJobDomainEmbeddingText(job: JobPosting): string {
  return [
    `Professional domain: ${job.domain || inferJobDomain(job)}`,
    `Domain evidence from title: ${job.title}`,
    `Domain evidence from opening: ${job.description.slice(0, 1400)}`,
  ].join("\n").slice(0, 2600);
}

export function buildJobEmbeddingTexts(job: JobPosting) {
  return {
    full: buildJobEmbeddingText(job),
    role: buildJobRoleEmbeddingText(job),
    skills: buildJobSkillsEmbeddingText(job),
    domain: buildJobDomainEmbeddingText(job),
  };
}

export function buildProfileEmbeddingText(profile: ExpandedProfile, searchQuery = ""): string {
  return [
    searchQuery ? `Current job search: ${searchQuery}` : "",
    `Preferred roles: ${profile.preferredRoles.join(", ")}`,
    profile.preferredDomain ? `Preferred domain: ${profile.preferredDomain}` : "",
    `Skills: ${profile.skills.join(", ")}`,
    `Education: ${profile.education}`,
    `Experience: ${profile.experience} years`,
    `Location: ${profile.preferredLocation}`,
    `Workplace preference: ${profile.workplacePreference}`,
    `Employment type: ${profile.employmentType}`,
    profile.certifications.length ? `Certifications: ${profile.certifications.join(", ")}` : "",
  ].filter(Boolean).join("\n").slice(0, 7000);
}

export function buildProfileRoleEmbeddingText(profile: ExpandedProfile, searchQuery = ""): string {
  return [
    searchQuery ? `Immediate role intent: ${searchQuery}` : "",
    `Desired professional roles: ${profile.preferredRoles.join(", ")}`,
  ].filter(Boolean).join("\n").slice(0, 2200);
}

export function buildProfileSkillsEmbeddingText(profile: ExpandedProfile, searchQuery = ""): string {
  return [
    searchQuery ? `Immediate skill/job intent: ${searchQuery}` : "",
    `Skills: ${profile.skills.join(", ")}`,
    `Certifications: ${profile.certifications.join(", ")}`,
    `Preferred roles: ${profile.preferredRoles.join(", ")}`,
    `Education: ${profile.education}`,
  ].filter(Boolean).join("\n").slice(0, 5000);
}

export function buildProfileDomainEmbeddingText(profile: ExpandedProfile, searchQuery = ""): string {
  return [
    profile.preferredDomain ? `Selected professional domain: ${profile.preferredDomain}` : "",
  ].filter(Boolean).join("\n").slice(0, 1200);
}

export function buildProfileEmbeddingTexts(profile: ExpandedProfile, searchQuery = "") {
  return {
    full: buildProfileEmbeddingText(profile, searchQuery),
    role: buildProfileRoleEmbeddingText(profile, searchQuery),
    skills: buildProfileSkillsEmbeddingText(profile, searchQuery),
    domain: buildProfileDomainEmbeddingText(profile, searchQuery),
  };
}

function isRateLimitError(error: unknown) {
  const value = error as any;
  const message = String(value?.message || error || "").toLowerCase();
  return value?.status === 429 || message.includes("429") || message.includes("resource_exhausted") || message.includes("quota exceeded") || message.includes("rate limit");
}

function retryDelayMs(error: unknown, attempt: number) {
  const value = error as any;
  const message = String(value?.message || error || "");
  const match = message.match(/retry(?: in| after)\s+([0-9.]+)s/i);
  if (match) return Math.min(90_000, Math.ceil(Number(match[1]) * 1000));
  return Math.min(60_000, 2_000 * 2 ** attempt + Math.floor(Math.random() * 500));
}

async function embedTexts(texts: string[], taskType: "RETRIEVAL_QUERY" | "RETRIEVAL_DOCUMENT"): Promise<number[][]> {
  if (!texts.length) return [];
  const client = ai();
  const output: number[][] = [];
  const batchSize = taskType === "RETRIEVAL_QUERY" ? 4 : 32;

  for (let start = 0; start < texts.length; start += batchSize) {
    const batch = texts.slice(start, start + batchSize);
    let response: any;
    for (let attempt = 0; attempt < 3; attempt++) {
      try {
        response = await client.models.embedContent({
          model: EMBEDDING_MODEL,
          contents: batch,
          config: { taskType, outputDimensionality: EMBEDDING_DIMENSIONS } as any,
        } as any);
        break;
      } catch (error) {
        if (!isRateLimitError(error) || attempt === 2) throw error;
        await new Promise(resolve => setTimeout(resolve, retryDelayMs(error, attempt)));
      }
    }
    const values: number[][] = (response?.embeddings || []).map((item: any) => Array.isArray(item?.values) ? item.values.map(Number) : []);
    if (values.length !== batch.length || values.some(value => value.length !== EMBEDDING_DIMENSIONS)) {
      throw new Error("Embedding service returned an unexpected vector size.");
    }
    output.push(...values);
  }
  return output;
}

export async function embedQuery(text: string): Promise<number[]> {
  const [vector] = await embedTexts([text], "RETRIEVAL_QUERY");
  return vector;
}

export async function embedDocuments(texts: string[]): Promise<number[][]> {
  return embedTexts(texts, "RETRIEVAL_DOCUMENT");
}

export function cosineSimilarity(a: number[], b: number[]): number {
  if (!a.length || a.length !== b.length) return 0;
  let dot = 0;
  let normA = 0;
  let normB = 0;
  for (let i = 0; i < a.length; i++) {
    dot += a[i] * b[i];
    normA += a[i] * a[i];
    normB += b[i] * b[i];
  }
  if (!normA || !normB) return 0;
  return Math.max(-1, Math.min(1, dot / (Math.sqrt(normA) * Math.sqrt(normB))));
}

function stringArray(value: unknown): string[] {
  return Array.isArray(value) ? value.filter((item): item is string => typeof item === "string") : [];
}

function normalizeType<T extends readonly string[]>(values: T, value: string | null): T[number] | undefined {
  return values.find(item => item === value) as T[number] | undefined;
}

export function dbJobToPosting(job: any): JobPosting {
  return {
    id: job.sourceJobId || job.id,
    title: job.title,
    company: job.company,
    location: job.location,
    description: job.description,
    applyUrl: job.applyUrl,
    source: job.source,
    sourceType: job.sourceType || undefined,
    officialSource: job.officialSource,
    postedDate: job.postedDate?.toISOString?.() || undefined,
    lastCheckedAt: job.lastCheckedAt?.toISOString?.() || undefined,
    active: job.active,
    employmentType: normalizeType(EMPLOYMENT_TYPES, job.employmentType),
    workplaceType: normalizeType(WORKPLACE_TYPES, job.workplaceType),
    domain: job.domain || undefined,
    requiredEducation: job.requiredEducation || undefined,
    minimumExperience: job.minimumExperience ?? undefined,
    requiredSkills: stringArray(job.requiredSkills),
    preferredSkills: stringArray(job.preferredSkills),
    requiredCertifications: stringArray(job.requiredCertifications),
  };
}


const ROLE_ALIASES: Record<string, string[]> = {
  "software engineer": ["software engineer", "software developer", "application developer", "backend developer", "frontend developer", "full stack developer", "web developer", "mobile developer"],
  "software developer": ["software developer", "software engineer", "application developer", "backend developer", "frontend developer", "full stack developer", "web developer"],
  "backend developer": ["backend developer", "back end developer", "backend engineer", "server side developer", "api developer"],
  "frontend developer": ["frontend developer", "front end developer", "frontend engineer", "ui developer", "web developer"],
  "full stack developer": ["full stack developer", "fullstack developer", "full stack engineer", "software engineer"],
  "data scientist": ["data scientist", "machine learning scientist", "applied scientist", "data science"],
  "data analyst": ["data analyst", "business analyst", "analytics analyst", "bi analyst", "business intelligence analyst"],
  "data engineer": ["data engineer", "analytics engineer", "big data engineer", "data platform engineer"],
  "machine learning engineer": ["machine learning engineer", "ml engineer", "machine learning developer", "ai engineer"],
  "ai engineer": ["ai engineer", "artificial intelligence engineer", "machine learning engineer", "ml engineer"],
  "devops engineer": ["devops engineer", "devops", "platform engineer", "site reliability engineer", "sre"],
  "cloud engineer": ["cloud engineer", "cloud infrastructure engineer", "cloud architect", "platform engineer"],
  "cybersecurity analyst": ["cybersecurity analyst", "security analyst", "soc analyst", "information security analyst"],
  "security engineer": ["security engineer", "cybersecurity engineer", "information security engineer"],
  "network engineer": ["network engineer", "network administrator", "network operations engineer", "telecom engineer"],
  "product manager": ["product manager", "product owner", "technical product manager"],
  "project manager": ["project manager", "program manager", "delivery manager", "project coordinator"],
  "business analyst": ["business analyst", "business systems analyst", "systems analyst"],
  "hr": ["hr", "human resources", "hr executive", "hr specialist", "talent acquisition", "recruiter"],
  "accountant": ["accountant", "accounting", "accounts executive", "staff accountant"],
  "financial analyst": ["financial analyst", "finance analyst", "investment analyst", "fp&a analyst"],
};

function normalizedRoleText(value: string): string {
  return value.toLowerCase().replace(/[^a-z0-9+#.]+/g, " ").replace(/\s+/g, " ").trim();
}

function roleTerms(role: string): string[] {
  const normalized = normalizedRoleText(role);
  const aliases = ROLE_ALIASES[normalized] || [];
  return unique([normalized, ...aliases]);
}

/**
 * Returns a deterministic role-fit score from 0..1. Title evidence dominates;
 * the opening description is only supporting evidence. This is deliberately
 * independent of embeddings so changing the selected role changes retrieval.
 */
export function roleAffinity(profile: UserProfile, job: JobPosting, searchQuery = ""): number {
  const desired = unique([...profile.preferredRoles, ...(searchQuery ? [searchQuery] : [])]);
  if (!desired.length) return 0.5;
  const title = normalizedRoleText(job.title);
  const description = normalizedRoleText(job.description.slice(0, 5000));
  let best = 0;
  for (const role of desired) {
    const normalized = normalizedRoleText(role);
    if (!normalized) continue;
    const aliases = roleTerms(role);
    let score = 0;
    for (const term of aliases) {
      if (!term) continue;
      if (title.includes(term)) score = Math.max(score, term === normalized ? 1 : 0.82);
      else if (description.includes(term)) score = Math.max(score, term === normalized ? 0.48 : 0.42);
    }
    // Token overlap handles user-entered variants without making generic words
    // such as engineer/developer alone a strong match. Specific modifiers such
    // as senior, staff, intern, internal, platform, backend, etc. are retained
    // so two superficially similar titles do not collapse into one result set.
    const genericRoleWords = new Set(["engineer", "developer", "analyst", "manager", "specialist", "professional", "expert", "associate", "the", "and"]);
    const roleTokens = normalized.split(" ").filter(t => t.length >= 3 && !genericRoleWords.has(t));
    const titleHits = roleTokens.filter(token => title.includes(token)).length;
    if (roleTokens.length) {
      const tokenCoverage = titleHits / roleTokens.length;
      score = Math.max(score, tokenCoverage * 0.86);
      if (score >= 0.78 && tokenCoverage < 0.5 && roleTokens.length >= 2) score *= 0.72;
    }
    best = Math.max(best, score);
  }
  return Math.max(0, Math.min(1, best));
}

export function hardEligibility(profile: UserProfile, job: JobPosting): { eligible: boolean; reasons: string[] } {
  const reasons: string[] = [];
  const sector = profile.jobSector || "both";
  const isGovernment = job.sourceType === "government" || job.source === "gov_india" || job.officialSource;

  if (sector === "government" && !isGovernment) return { eligible: false, reasons: ["sector"] };
  if (sector === "private" && isGovernment) return { eligible: false, reasons: ["sector"] };

  if (profile.preferredLocation && profile.preferredLocation.toLowerCase() !== "india") {
    const wanted = profile.preferredLocation.toLowerCase();
    const actual = job.location.toLowerCase();
    if (actual && !actual.includes(wanted) && !actual.includes("remote")) return { eligible: false, reasons: ["location"] };
  }

  if (profile.workplacePreference !== "open" && job.workplaceType && job.workplaceType !== profile.workplacePreference) {
    return { eligible: false, reasons: ["workplace"] };
  }

  if (profile.employmentType && job.employmentType && job.employmentType !== profile.employmentType) {
    return { eligible: false, reasons: ["employment_type"] };
  }

  if (job.minimumExperience !== undefined && profile.experience + 2 < job.minimumExperience) {
    return { eligible: false, reasons: ["experience"] };
  }

  // Domain is a hard candidate constraint. Once the user selects a domain,
  // no other domain may enter the recommendation pool, including fallbacks.
  const profileDomains = canonicalDomainsFromProfile(profile);
  if (profileDomains) {
    if (!domainEligibleForProfile(profile, job)) {
      return { eligible: false, reasons: ["domain"] };
    }
  }

  reasons.push("eligibility");
  return { eligible: true, reasons };
}

export function matchedSkillEvidence(profile: ExpandedProfile, job: JobPosting) {
  const profileSkills = unique(profile.skills).map(value => value.toLowerCase());
  const jobSkills = unique([...job.requiredSkills, ...job.preferredSkills]).map(value => value.toLowerCase());
  const matchedSkills = profileSkills.filter(skill => jobSkills.some(required => required === skill || required.includes(skill) || skill.includes(required)));
  const missingSkills = job.requiredSkills.filter(required => !matchedSkills.some(skill => required.toLowerCase() === skill || required.toLowerCase().includes(skill) || skill.includes(required.toLowerCase())));
  return { matchedSkills, missingSkills };
}


export type SemanticCandidate = {
  job: JobPosting;
  similarity: number;
  roleSimilarity: number;
  skillSimilarity: number;
  domainSimilarity: number;
  fullSimilarity: number;
  hybridVectorScore: number;
  embedding: number[];
  retrievalScore?: number;
};

function rowEmbedding(row: any, key: string): number[] {
  const value = row[key];
  return Array.isArray(value) ? value.map(Number) : [];
}

type LocalVector = number[];

function localTokens(value: string): string[] {
  return value
    .toLowerCase()
    .replace(/[^a-z0-9+#.]+/g, " ")
    .split(/\s+/)
    .filter(token => token.length >= 2);
}

function localVectorize(texts: string[]): LocalVector[] {
  const documents = texts.map(localTokens);
  const vocabulary = [...new Set(documents.flat())];
  if (!vocabulary.length) return documents.map(() => []);
  const documentFrequency = new Map<string, number>();
  for (const tokens of documents) {
    for (const token of new Set(tokens)) documentFrequency.set(token, (documentFrequency.get(token) || 0) + 1);
  }
  const n = documents.length;
  return documents.map(tokens => {
    const counts = new Map<string, number>();
    for (const token of tokens) counts.set(token, (counts.get(token) || 0) + 1);
    return vocabulary.map(token => {
      const tf = (counts.get(token) || 0) / Math.max(1, tokens.length);
      const df = documentFrequency.get(token) || 0;
      const idf = Math.log((n + 1) / (df + 1)) + 1;
      return tf * idf;
    });
  });
}

function fallbackVectorRetrieve(profile: ExpandedProfile, rows: any[], searchQuery: string, limit: number): SemanticCandidate[] {
  const profileDomains = canonicalDomainsFromProfile(profile);
  const domainRows = profileDomains
    ? rows.filter(row => domainEligibleForProfile(profile, dbJobToPosting(row), searchQuery))
    : rows;
  if (!domainRows.length) return [];

  const jobs = domainRows.map(dbJobToPosting);
  const jobTexts = jobs.map(job => buildJobEmbeddingTexts(job));
  const profileTexts = buildProfileEmbeddingTexts(profile, searchQuery);
  const sections: Array<keyof typeof profileTexts> = ["full", "role", "skills", "domain"];
  const vectors = new Map<string, LocalVector[]>();
  for (const section of sections) {
    // Build query and job vectors together so they share one vocabulary.
    const combined = localVectorize([profileTexts[section], ...jobTexts.map(text => text[section])]);
    vectors.set(section, combined.slice(1));
    vectors.set(`${section}:query`, [combined[0]]);
  }

  const result: SemanticCandidate[] = jobs.map((job, index) => {
    const fullSimilarity = cosineSimilarity(vectors.get("full:query")![0], vectors.get("full")![index]);
    const roleSimilarity = cosineSimilarity(vectors.get("role:query")![0], vectors.get("role")![index]);
    const skillSimilarity = cosineSimilarity(vectors.get("skills:query")![0], vectors.get("skills")![index]);
    const domainSimilarity = cosineSimilarity(vectors.get("domain:query")![0], vectors.get("domain")![index]);
    const signals = deterministicSignals(profile, job, searchQuery);
    const hybridVectorScore =
      signals.roleMatch * 0.28 +
      Math.max(0, roleSimilarity) * 0.30 +
      Math.max(0, domainSimilarity) * 0.23 +
      Math.max(0, skillSimilarity) * 0.12 +
      Math.max(0, fullSimilarity) * 0.04 +
      signals.experienceFit * 0.03;
    return {
      job, embedding: [], similarity: fullSimilarity, roleSimilarity, skillSimilarity, domainSimilarity, fullSimilarity,
      hybridVectorScore, retrievalScore: hybridVectorScore,
    };
  });
  return result.sort((a, b) => (b.retrievalScore ?? 0) - (a.retrievalScore ?? 0)).slice(0, limit);
}

export async function semanticRetrieve(profile: ExpandedProfile, rows: any[], searchQuery = "", limit = SEMANTIC_TOP_K): Promise<SemanticCandidate[]> {
  const queryTexts = buildProfileEmbeddingTexts(profile, searchQuery);
  let queries: number[][];
  try {
    queries = await embedTexts(
      [queryTexts.full, queryTexts.role, queryTexts.skills, queryTexts.domain],
      "RETRIEVAL_QUERY"
    );
  } catch (error) {
    console.error("Gemini query embeddings unavailable; using local vector fallback:", error);
    return fallbackVectorRetrieve(profile, rows, searchQuery, limit);
  }
  const [fullQuery, roleQuery, skillQuery, domainQuery] = queries;

  const profileDomain = canonicalProfileDomain(profile);
  const profileDomains = canonicalDomainsFromProfile(profile);
  const domainRows = profileDomains
    ? rows.filter(row => domainEligibleForProfile(profile, dbJobToPosting(row), searchQuery))
    : rows;

  const storedVectorRows = domainRows.filter(row => {
    const vectors = [rowEmbedding(row, "embedding"), rowEmbedding(row, "embeddingRole"), rowEmbedding(row, "embeddingSkills"), rowEmbedding(row, "embeddingDomain")];
    return vectors.some(vector => vector.length === EMBEDDING_DIMENSIONS);
  });
  if (storedVectorRows.length < Math.max(5, Math.ceil(domainRows.length * 0.5))) {
    return fallbackVectorRetrieve(profile, domainRows, searchQuery, limit);
  }

  const candidates = domainRows
    .map(row => {
      const job = dbJobToPosting(row);
      const fullEmbedding = rowEmbedding(row, "embedding");
      const roleEmbedding = rowEmbedding(row, "embeddingRole");
      const skillEmbedding = rowEmbedding(row, "embeddingSkills");
      const domainEmbedding = rowEmbedding(row, "embeddingDomain");
      const fullSimilarity = fullEmbedding.length === EMBEDDING_DIMENSIONS ? cosineSimilarity(fullQuery, fullEmbedding) : 0;
      const roleSimilarity = roleEmbedding.length === EMBEDDING_DIMENSIONS ? cosineSimilarity(roleQuery, roleEmbedding) : fullSimilarity;
      const skillSimilarity = skillEmbedding.length === EMBEDDING_DIMENSIONS ? cosineSimilarity(skillQuery, skillEmbedding) : fullSimilarity;
      const domainSimilarity = domainEmbedding.length === EMBEDDING_DIMENSIONS ? cosineSimilarity(domainQuery, domainEmbedding) : fullSimilarity;
      const signals = deterministicSignals(profile, job, searchQuery);
      const hybridVectorScore =
        signals.roleMatch * 0.28 +
        Math.max(0, roleSimilarity) * 0.30 +
        Math.max(0, domainSimilarity) * 0.23 +
        Math.max(0, skillSimilarity) * 0.12 +
        Math.max(0, fullSimilarity) * 0.04 +
        signals.experienceFit * 0.03;
      return {
        job,
        embedding: fullEmbedding,
        similarity: fullSimilarity,
        roleSimilarity,
        skillSimilarity,
        domainSimilarity,
        fullSimilarity,
        hybridVectorScore,
        retrievalScore: hybridVectorScore,
      };
    })
    .filter(item => item.embedding.length === EMBEDDING_DIMENSIONS || item.roleSimilarity !== 0 || item.skillSimilarity !== 0 || item.domainSimilarity !== 0)
    .sort((a, b) => b.retrievalScore - a.retrievalScore)
    .slice(0, limit);

  return candidates;
}

function parseJson(text: string): any {
  const cleaned = text.replace(/```json/gi, "").replace(/```/g, "").trim();
  const start = cleaned.indexOf("[");
  const end = cleaned.lastIndexOf("]");
  if (start >= 0 && end > start) return JSON.parse(cleaned.slice(start, end + 1));
  throw new Error("Reranker returned invalid JSON.");
}

function normalizedTokens(value: string): string[] {
  return value
    .toLowerCase()
    .replace(/[^a-z0-9+#.]+/g, " ")
    .split(/\s+/)
    .filter(token => token.length >= 2);
}

function phraseOverlap(a: string, b: string): number {
  const left = new Set(normalizedTokens(a));
  const right = new Set(normalizedTokens(b));
  if (!left.size || !right.size) return 0;
  let hits = 0;
  for (const token of left) if (right.has(token)) hits++;
  return hits / Math.max(1, left.size);
}

const DOMAIN_ALIASES: Record<string, JobDomainAlias> = {
  it: "software", technology: "software", "information technology": "software", "it & software": "software", cs: "software", cse: "software", software: "software",
  ai: "data-ai", "artificial intelligence": "data-ai", "machine learning": "data-ai", analytics: "data-ai", data: "data-ai",
  cyber: "cybersecurity", cybersecurity: "cybersecurity", security: "cybersecurity", devops: "cloud-devops", cloud: "cloud-devops",
  embedded: "electronics-embedded", electronics: "electronics-embedded", ece: "electronics-embedded", electrical: "electrical", ee: "electrical",
  mechanical: "mechanical", "mechanical engineering": "mechanical", civil: "civil-construction", "civil engineering": "civil-construction", construction: "civil-construction",
  chemical: "chemical-biotech", biotech: "chemical-biotech", biotechnology: "chemical-biotech",
  healthcare: "healthcare", "health care": "healthcare", medical: "healthcare", pharma: "pharma", pharmaceutical: "pharma",
  finance: "finance-accounting", "finance & banking": "finance-accounting", "commerce & finance": "finance-accounting", commerce: "finance-accounting", accounting: "finance-accounting", banking: "banking-insurance", insurance: "banking-insurance",
  hr: "human-resources", "human resources": "human-resources", marketing: "sales-marketing", sales: "sales-marketing",
  product: "product-project", project: "product-project", education: "education", teaching: "education", legal: "legal",
  logistics: "supply-chain", "supply chain": "supply-chain", hospitality: "hospitality", retail: "retail", design: "design-media", media: "design-media",
  agriculture: "agriculture", government: "government", research: "research", support: "customer-support", architecture: "architecture",
  "real estate": "real-estate", telecom: "telecom", aerospace: "aerospace-defense", defense: "aerospace-defense",
};

type JobDomainAlias = ReturnType<typeof inferJobDomain>;

const BROAD_DOMAIN_ALIASES: Record<string, JobDomainAlias[]> = {
  engineering: ["electronics-embedded", "electrical", "mechanical", "civil-construction", "architecture", "chemical-biotech", "telecom", "aerospace-defense"],
  "engineering and manufacturing": ["electronics-embedded", "electrical", "mechanical", "civil-construction", "architecture", "chemical-biotech", "telecom", "aerospace-defense"],
  "it and software": ["software"],
  "information technology and software": ["software"],
  "it sector": ["software", "data-ai", "cybersecurity", "cloud-devops"],
  "data and ai": ["data-ai"],
  finance: ["finance-accounting", "banking-insurance"],
  "finance and accounting": ["finance-accounting", "banking-insurance"],
  "commerce and finance": ["finance-accounting", "banking-insurance"],
  "banking and insurance": ["banking-insurance", "finance-accounting"],
  "sales and marketing": ["sales-marketing"],
  "hr and recruitment": ["human-resources"],
  "education and teaching": ["education"],
  "management and business": ["human-resources", "sales-marketing", "product-project", "supply-chain", "retail", "customer-support", "real-estate"],
  business: ["human-resources", "sales-marketing", "product-project", "supply-chain", "retail", "customer-support", "real-estate"],
  healthcare: ["healthcare"],
  "health care": ["healthcare"],
  "healthcare and pharma": ["healthcare", "pharma"],
  science: ["research"],
  "science and research": ["research"],
};

function normalizedDomainText(value: string): string {
  return value.toLowerCase().replace(/&/g, " and ").replace(/[^a-z0-9]+/g, " ").replace(/\s+/g, " ").trim();
}

function domainFamily(value: JobDomainAlias | string): string {
  const d = String(value);
  if (["software", "data-ai", "cybersecurity", "cloud-devops"].includes(d)) return "it";
  if (["electronics-embedded", "electrical", "mechanical", "civil-construction", "architecture", "chemical-biotech", "telecom", "aerospace-defense"].includes(d)) return "engineering";
  if (["finance-accounting", "banking-insurance"].includes(d)) return "finance";
  if (["human-resources", "sales-marketing", "product-project", "supply-chain", "retail", "customer-support", "real-estate"].includes(d)) return "business";
  if (["healthcare", "pharma"].includes(d)) return "healthcare";
  if (["education"].includes(d)) return "education";
  if (["legal"].includes(d)) return "legal";
  if (["agriculture"].includes(d)) return "agriculture";
  if (["government"].includes(d)) return "government";
  if (["research"].includes(d)) return "science";
  if (["hospitality"].includes(d)) return "hospitality";
  if (["design-media"].includes(d)) return "design";
  return d;
}

function sameDomain(profileDomains: Set<JobDomainAlias> | undefined, jobDomain: JobDomainAlias): boolean {
  if (!profileDomains) return true;
  return jobDomain !== "other" && profileDomains.has(jobDomain);
}

function domainEligibleForProfile(profile: UserProfile | ExpandedProfile, job: JobPosting, searchQuery = ""): boolean {
  const profileDomains = canonicalDomainsFromProfile(profile);
  if (!profileDomains) return true;
  const jobDomain = canonicalJobDomain(job);
  if (sameDomain(profileDomains, jobDomain)) return true;
  return jobDomain === "other" && roleAffinity(profile, job, searchQuery) >= 0.55;
}

function canonicalDomainFromText(value: string): JobDomainAlias | undefined {
  const raw = clean(value);
  if (!raw) return undefined;
  const normalized = normalizedDomainText(raw);
  const exact = DOMAIN_ALIASES[raw.toLowerCase()] || DOMAIN_ALIASES[normalized];
  if (exact) return exact;
  if (normalized.includes("it software") || normalized === "it") return "software";
  if (normalized.includes("finance") || normalized.includes("commerce")) return "finance-accounting";
  if (normalized.includes("banking") || normalized.includes("insurance")) return "banking-insurance";
  if (normalized.includes("healthcare") || normalized.includes("health care")) return "healthcare";
  if (normalized === "engineering") return "mechanical";
  if (normalized === "management and business" || normalized === "management business" || normalized === "business") return "product-project";
  if (normalized === "science" || normalized === "science and research") return "research";
  if (normalized.includes("engineering")) {
    if (normalized.includes("mechanical")) return "mechanical";
    if (normalized.includes("civil")) return "civil-construction";
    if (normalized.includes("electrical")) return "electrical";
    if (normalized.includes("electronics") || normalized.includes("embedded")) return "electronics-embedded";
    return "mechanical";
  }
  return undefined;
}

function canonicalDomainsFromProfile(profile: UserProfile | ExpandedProfile): Set<JobDomainAlias> | undefined {
  const raw = clean(profile.preferredDomain || "");
  if (raw) {
    const parts = raw.split(/[,;|/]+|\band\b/i).map(part => clean(part)).filter(Boolean);
    const domains = new Set<JobDomainAlias>();
    for (const part of parts.length ? parts : [raw]) {
      const normalized = normalizedDomainText(part);
      const broad = BROAD_DOMAIN_ALIASES[part.toLowerCase()] || BROAD_DOMAIN_ALIASES[normalized];
      if (broad?.length) {
        broad.forEach(domain => domains.add(domain));
        continue;
      }
      const explicit = canonicalDomainFromText(part);
      if (explicit) domains.add(explicit);
    }
    if (domains.size) return domains;
  }

  const combined = `${profile.preferredRoles.join(" ")} ${profile.skills.join(" ")}`.trim();
  if (!combined) return undefined;
  const inferred = inferJobDomain({ title: profile.preferredRoles.join(" "), description: combined, company: "" });
  return inferred === "other" ? undefined : new Set([inferred]);
}

function canonicalJobDomain(job: JobPosting): JobDomainAlias {
  // Reclassify from current job evidence first so stale ingestion metadata
  // cannot put every opening into one domain. Explicit domain metadata is a
  // fallback only when the title/skills/description do not identify a domain.
  const inferred = inferJobDomain(job);
  if (inferred !== "other") return inferred;
  return canonicalDomainFromText(job.domain || "") || "other";
}

function canonicalProfileDomain(profile: UserProfile | ExpandedProfile): JobDomainAlias | undefined {
  return [...(canonicalDomainsFromProfile(profile) || [])][0];
}

function domainAffinity(profileDomain: JobDomainAlias | undefined, job: JobPosting): number {
  if (!profileDomain) return 0.5;
  const jobDomain = canonicalJobDomain(job);
  return jobDomain === profileDomain ? 1 : 0;
}

function normalizedSkill(value: string): string {
  return value.toLowerCase().replace(/[._\-\/]+/g, " ").replace(/\s+/g, " ").trim();
}

const SKILL_ALIASES: Record<string, string> = {
  js: "javascript", javascript: "javascript", ts: "typescript", nodejs: "node.js", node: "node.js",
  reactjs: "react", react: "react", nextjs: "next.js", ml: "machine learning", ai: "artificial intelligence",
  aws: "amazon web services", gcp: "google cloud", azure: "microsoft azure", k8s: "kubernetes",
  postgres: "postgresql", postgresql: "postgresql", mongo: "mongodb", sql: "sql",
};
function canonicalSkill(value: string): string {
  const n = normalizedSkill(value);
  return SKILL_ALIASES[n] || n;
}
function skillMatches(profileSkills: string[], jobSkills: string[]): number {
  if (!profileSkills.length || !jobSkills.length) return 0;
  const p = profileSkills.map(canonicalSkill);
  const j = jobSkills.map(canonicalSkill);
  return p.filter(skill => j.some(target => target === skill || target.includes(skill) || skill.includes(target))).length;
}

function deterministicSignals(profile: ExpandedProfile, job: JobPosting, searchQuery: string) {
  const title = job.title || "";
  const roleText = `${title} ${job.description.slice(0, 5000)}`;
  const desiredRoles = [...profile.preferredRoles, ...(searchQuery ? [searchQuery] : [])].filter(Boolean);
  const roleMatch = desiredRoles.length
    ? Math.max(roleAffinity(profile, job, searchQuery), Math.max(...desiredRoles.map(role => phraseOverlap(role, title) * 0.65 + phraseOverlap(role, roleText) * 0.35), 0))
    : 0.5;

  const profileSkills = unique(profile.skills);
  const requiredSkills = unique(job.requiredSkills);
  const allJobSkills = unique([...job.requiredSkills, ...job.preferredSkills]);
  const skillMatches = skillMatchesCount(profileSkills, allJobSkills);
  const requiredMatches = skillMatchesCount(profileSkills, requiredSkills);
  const requiredSkillRatio = requiredSkills.length ? requiredMatches / requiredSkills.length : (skillMatches ? Math.min(1, skillMatches / 3) : 0);
  const skillCoverage = profileSkills.length ? Math.min(1, skillMatches / Math.min(profileSkills.length, 8)) : 0;

  let experienceFit = 1;
  if (job.minimumExperience !== undefined) {
    if (profile.experience >= job.minimumExperience) experienceFit = 1;
    else if (profile.experience + 1 >= job.minimumExperience) experienceFit = 0.7;
    else experienceFit = 0;
  }

  const profileDomain = canonicalProfileDomain(profile);
  const profileDomains = canonicalDomainsFromProfile(profile);
  const jobDomain = canonicalJobDomain(job);
  const unknownDomainButStrongRole = Boolean(profileDomains && jobDomain === "other" && roleMatch >= 0.55);
  const domain = profileDomains ? (sameDomain(profileDomains, jobDomain) ? 1 : unknownDomainButStrongRole ? 0.65 : 0) : domainAffinity(profileDomain, job);
  const hardDomainMismatch = Boolean(profileDomains && !sameDomain(profileDomains, jobDomain) && !unknownDomainButStrongRole);
  return { roleMatch, skillCoverage, requiredSkillRatio, experienceFit, domain, profileDomain, jobDomain, hardDomainMismatch };
}

function skillMatchesCount(profileSkills: string[], jobSkills: string[]): number {
  return skillMatches(profileSkills, jobSkills);
}

export async function semanticRerank(
  profile: ExpandedProfile,
  candidates: SemanticCandidate[],
  searchQuery = ""
): Promise<RecommendationResult[]> {
  if (!candidates.length) return [];
  const compact = candidates.map((candidate, index) => ({
    index,
    semanticSimilarity: Number(candidate.similarity.toFixed(4)),
    roleSimilarity: Number(candidate.roleSimilarity.toFixed(4)),
    skillSimilarity: Number(candidate.skillSimilarity.toFixed(4)),
    domainSimilarity: Number(candidate.domainSimilarity.toFixed(4)),
    title: candidate.job.title,
    company: candidate.job.company,
    location: candidate.job.location,
    domain: inferJobDomain(candidate.job),
    requiredSkills: candidate.job.requiredSkills,
    preferredSkills: candidate.job.preferredSkills,
    education: candidate.job.requiredEducation || "",
    experience: candidate.job.minimumExperience ?? null,
    workplace: candidate.job.workplaceType || "",
    employmentType: candidate.job.employmentType || "",
    description: candidate.job.description.slice(0, 1800),
  }));

  const prompt = `You are the final job-recommendation reranker for OpportuneX.
Rank ONLY the supplied candidate jobs for this user's profile. Do not invent jobs, skills, requirements, or facts.
The profile is the primary source of suitability. Search text is an additional immediate-intent signal.
The user's selected domain is a HARD constraint: every candidate must belong to that exact domain, or to an explicitly broad domain set selected by the user. Never rank, recommend, or recover a job from another domain, even when semantic similarity, role similarity, skills, or transferable skills are strong. Fallbacks must remain inside the selected domain. Within that domain, use the semantic role vector, domain vector, skills vector, and full-job vector to determine relevance.
Do not reward generic words such as engineer, developer, analyst, manager, specialist, technology, or business by themselves.
Prioritize, in order: preferred role fit, domain fit, required-skill fit, experience/education fit, then semantic similarity.
Return exactly one JSON array with one object per candidate: {"index": number, "relevance": number, "confidence": "high"|"medium"|"low", "reason": string}.
Relevance is an ordinal relevance estimate from 0 to 100. Do not inflate scores merely because a job is semantically similar.

USER PROFILE:
${buildProfileEmbeddingText(profile, searchQuery)}

CANDIDATES:
${JSON.stringify(compact)}`;

  let byIndex = new Map<number, any>();
  // When query embeddings failed, candidates are already produced by the local
  // vector fallback. Do not make a second external Gemini call just to rerank
  // them; otherwise a transient Gemini outage would turn a usable fallback into
  // another 10-second timeout. Stored-vector candidates still get the Gemini
  // reranker when the embedding path is healthy.
  const canUseLLMRerank = candidates.some(candidate => candidate.embedding.length === EMBEDDING_DIMENSIONS);
  if (canUseLLMRerank) {
    try {
      const client = ai();
      const response = await client.models.generateContent({
        model: RERANK_MODEL,
        contents: prompt,
        config: { temperature: 0.05, responseMimeType: "application/json" },
      } as any);
      const parsed = parseJson(response.text || "[]");
      byIndex = new Map<number, any>(parsed.filter((item: any) => Number.isInteger(item?.index)).map((item: any) => [item.index, item]));
    } catch (error) {
      console.error("Semantic reranker unavailable; using deterministic relevance scoring:", error);
    }
  }

  return candidates
    .map((candidate, index) => {
      const rerank = byIndex.get(index) || {};
      const rawRerank = Math.max(0, Math.min(100, Number(rerank.relevance) || 0));
      const fallbackRerank = Math.round(Math.max(0, Math.min(1, candidate.hybridVectorScore)) * 100);
      const rerankRelevance = rawRerank || fallbackRerank;
      const signals = deterministicSignals(profile, candidate.job, searchQuery);
      const { matchedSkills, missingSkills } = matchedSkillEvidence(profile, candidate.job);
      const dataCompleteness = Math.round(([
        candidate.job.title,
        candidate.job.company,
        candidate.job.description,
        candidate.job.domain,
        candidate.job.requiredEducation,
        candidate.job.requiredSkills.length ? "skills" : "",
        candidate.job.minimumExperience !== undefined ? "experience" : "",
      ].filter(Boolean).length / 7) * 100);

      // Hybrid vector ranking: separate role, skill, domain and full-job vectors
      // are combined with structured matching and a small LLM rerank signal.
      // This prevents generic vocabulary from overpowering actual professional fit.
      let relevance = Math.round(
        rerankRelevance * 0.05 +
        signals.roleMatch * 100 * 0.32 +
        Math.max(0, candidate.roleSimilarity) * 100 * 0.25 +
        signals.domain * 100 * 0.18 +
        Math.max(0, candidate.domainSimilarity) * 100 * 0.08 +
        Math.max(0, candidate.skillSimilarity) * 100 * 0.09 +
        Math.max(0, candidate.fullSimilarity) * 100 * 0.03 +
        signals.experienceFit * 100 * 0.03
      );
      relevance = Math.round(relevance * (0.95 + signals.experienceFit * 0.05));
      if (signals.requiredSkillRatio === 0 && candidate.job.requiredSkills.length) relevance = Math.min(relevance, 49);
      if (signals.roleMatch < 0.45 && profile.preferredRoles.length) relevance = Math.min(relevance, 36);
      if (signals.experienceFit === 0) relevance = Math.min(relevance, 45);
      // Safety invariant: domain mismatch is never a recommendation, even if
      // a caller bypasses the candidate-pool filter.
      if (signals.hardDomainMismatch) relevance = 0;
      relevance = Math.max(0, Math.min(100, relevance));

      const confidence = relevance >= 75 ? "high" : relevance >= 55 ? "medium" : "low";
      const reason = clean(rerank.reason) || (
        signals.hardDomainMismatch
          ? `Limited fit: this opening is in ${inferJobDomain(candidate.job)}, while the profile is aligned to ${signals.profileDomain}.`
          : "Matched using role, domain, skills, experience, and semantic similarity."
      );
      return {
        job: candidate.job,
        matchPercentage: relevance,
        confidence,
        score: {
          semanticSimilarity: Math.round(candidate.fullSimilarity * 100),
          roleSimilarity: Math.round(candidate.roleSimilarity * 100),
          skillSimilarity: Math.round(candidate.skillSimilarity * 100),
          domainSimilarity: Math.round(candidate.domainSimilarity * 100),
          fullSimilarity: Math.round(candidate.fullSimilarity * 100),
          hybridVectorScore: Math.round(candidate.hybridVectorScore * 100),
          rerankRelevance,
          roleAffinity: Math.round(signals.roleMatch * 100),
          domainFit: Math.round(signals.domain * 100),
          requiredSkillFit: Math.round(signals.requiredSkillRatio * 100),
          eligibility: signals.experienceFit * 100,
        },
        matchedSkillCount: matchedSkills.length,
        totalRequiredSkills: candidate.job.requiredSkills.length,
        matchedSkills,
        missingSkills,
        reasonCodes: [
          "semantic_retrieval",
          ...(byIndex.size ? ["semantic_rerank"] : []),
          `domain_${signals.hardDomainMismatch ? "mismatch" : "fit"}`,
          `skills_${signals.requiredSkillRatio >= 0.5 ? "fit" : "weak"}`,
          `role_${signals.roleMatch >= 0.5 ? "fit" : "weak"}`,
        ],
        dataCompleteness,
        matchSummary: [
          { title: "Overall relevance", value: `${relevance}%` },
          { title: "Role & domain fit", value: signals.hardDomainMismatch ? "Limited" : signals.domain >= 0.9 && signals.roleMatch >= 0.5 ? "Strong" : "Relevant" },
          { title: "Required skills", value: candidate.job.requiredSkills.length ? `${Math.round(signals.requiredSkillRatio * 100)}% matched` : "Not specified" },
          ...(matchedSkills.length ? [{ title: "Skills found", value: matchedSkills.slice(0, 3).join(", ") }] : []),
        ],
        explanation: reason,
      } as RecommendationResult;
    })
    .sort((a, b) => b.matchPercentage - a.matchPercentage);
}

export function selectFinalResults(results: RecommendationResult[], limit = FINAL_RESULTS): RecommendationResult[] {
  const selected: RecommendationResult[] = [];
  const seen = new Set<string>();
  // The hybrid ranker is the quality gate. Domain filtering has already been
  // enforced before vector retrieval; this final stage is an additional safety
  // check and never broadens the candidate domain.
  const ranked = results.filter(result => {
    const score = result.score as any;
    const domain = Number(score?.domainSimilarity ?? 0) / 100;
    const role = Number(score?.roleSimilarity ?? 0) / 100;
    const skills = Number(score?.skillSimilarity ?? 0) / 100;
    const roleAffinityScore = Number(score?.roleAffinity ?? 0) / 100;
    const domainFit = Number(score?.domainFit ?? 0) / 100;
    const overall = result.matchPercentage / 100;

    // Precision-first gate: a recommendation needs same-domain evidence and
    // direct preferred-role evidence before skills can improve ordering.
    // This applies to every domain; it is not a software-only rule.
    // Domain has already been enforced as a hard candidate constraint. Do not
    // reject valid same-domain jobs merely because the domain embedding score is
    // conservative. Ranking within the domain is driven primarily by role
    // semantic similarity, then skills.
    const roleEvidence = roleAffinityScore >= 0.42 || role >= 0.32;
    const skillSupport = skills >= 0.12 || Number(score?.requiredSkillFit ?? 0) > 0 || result.totalRequiredSkills === 0;
    return overall >= 0.40 && domainFit >= 0.6 && roleEvidence && skillSupport;
  });
  const pool = ranked.slice(0, Math.min(limit, ranked.length));
  for (const result of pool) {
    const key = `${result.job.company.toLowerCase()}|${result.job.title.toLowerCase()}|${result.job.location.toLowerCase()}`;
    if (seen.has(key)) continue;
    seen.add(key);
    selected.push(result);
    if (selected.length >= limit) break;
  }
  return selected;
}
