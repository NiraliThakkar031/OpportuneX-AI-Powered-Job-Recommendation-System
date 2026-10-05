import { JobPosting } from "@/lib/types";

export type JobDomain =
  | "software"
  | "data-ai"
  | "cybersecurity"
  | "cloud-devops"
  | "electronics-embedded"
  | "electrical"
  | "mechanical"
  | "civil-construction"
  | "chemical-biotech"
  | "healthcare"
  | "pharma"
  | "finance-accounting"
  | "banking-insurance"
  | "human-resources"
  | "sales-marketing"
  | "product-project"
  | "education"
  | "legal"
  | "supply-chain"
  | "hospitality"
  | "retail"
  | "design-media"
  | "agriculture"
  | "government"
  | "research"
  | "customer-support"
  | "architecture"
  | "real-estate"
  | "telecom"
  | "aerospace-defense"
  | "other";

type Rule = { domain: JobDomain; terms: string[] };

// This is ingestion metadata, not a recommendation/ranking model. It gives the
// semantic engine useful domain context while remaining deterministic and cheap.
const RULES: Rule[] = [
  { domain: "healthcare", terms: ["nurse", "nursing", "registered nurse", "staff nurse", "medical officer", "doctor", "physician", "clinical", "hospital", "healthcare", "health care", "patient care", "medical assistant", "radiology", "radiographer", "lab technician", "medical laboratory", "physiotherapy", "physiotherapist", "occupational therapist", "speech therapist", "dentist", "dental", "public health", "medical coding", "health information", "clinical research", "mental health", "behavioral health", "behavioural health", "psychologist", "psychology", "counselling psychologist", "counseling psychologist", "counsellor", "counselor", "health coach", "telehealth"] },
  { domain: "pharma", terms: ["pharmacist", "pharmacy", "pharmaceutical", "pharmacovigilance", "drug safety", "clinical trial", "formulation", "regulatory affairs", "biopharma"] },
  { domain: "software", terms: ["software engineer", "software developer", "full stack", "frontend", "front end", "backend", "back end", "web developer", "mobile developer", "application developer", "java developer", "python developer", ".net developer", "ios developer", "android developer"] },
  { domain: "data-ai", terms: ["data scientist", "data analyst", "machine learning", "artificial intelligence", "ai engineer", "ml engineer", "deep learning", "computer vision", "nlp", "data engineer", "analytics engineer", "business intelligence", "bi analyst"] },
  { domain: "cybersecurity", terms: ["cybersecurity", "cyber security", "security engineer", "security analyst", "soc analyst", "penetration tester", "ethical hacker", "information security", "grc analyst", "incident response"] },
  { domain: "cloud-devops", terms: ["devops", "site reliability", "sre", "cloud engineer", "cloud architect", "aws engineer", "azure engineer", "gcp engineer", "platform engineer", "kubernetes", "cloud operations"] },
  { domain: "electronics-embedded", terms: ["embedded", "firmware", "electronics engineer", "electronics design", "vlsi", "asic", "fpga", "microcontroller", "rtos", "iot engineer", "embedded systems"] },
  { domain: "electrical", terms: ["electrical engineer", "power systems", "power engineer", "electrical design", "control systems", "instrumentation", "protection engineer", "substation", "renewable energy", "solar engineer"] },
  { domain: "mechanical", terms: ["mechanical engineer", "mechanical design", "cad engineer", "solidworks", "autocad mechanical", "manufacturing engineer", "production engineer", "maintenance engineer", "automotive engineer", "automobile engineer", "thermal engineer"] },
  { domain: "civil-construction", terms: ["civil engineer", "structural engineer", "construction engineer", "site engineer", "quantity surveyor", "project engineer", "highway engineer", "geotechnical", "water resources", "construction manager"] },
  { domain: "architecture", terms: ["architect", "architecture", "urban planner", "interior designer", "landscape architect", "bim architect", "revit architect"] },
  { domain: "chemical-biotech", terms: ["chemical engineer", "process engineer", "biotechnology", "biotech", "microbiology", "biochemist", "life sciences", "process development", "quality control laboratory"] },
  { domain: "finance-accounting", terms: ["accountant", "accounting", "financial analyst", "finance analyst", "chartered accountant", "ca", "auditor", "tax analyst", "fp&a", "financial planning", "bookkeeper"] },
  { domain: "banking-insurance", terms: ["banking", "bank officer", "credit analyst", "loan officer", "relationship manager", "insurance", "underwriter", "claims analyst", "risk analyst", "actuary", "wealth management"] },
  { domain: "human-resources", terms: ["human resources", "hr", "hr executive", "hr manager", "recruiter", "talent acquisition", "talent management", "people operations", "payroll specialist"] },
  { domain: "sales-marketing", terms: ["sales executive", "sales manager", "business development", "bdm", "marketing executive", "digital marketing", "seo", "sem", "brand manager", "content marketing", "growth marketing"] },
  { domain: "product-project", terms: ["product manager", "product owner", "project manager", "program manager", "scrum master", "delivery manager", "business analyst", "project coordinator"] },
  { domain: "education", terms: ["teacher", "teaching", "lecturer", "professor", "faculty", "school teacher", "academic coordinator", "education counselor", "instructional designer", "curriculum developer", "pgt", "tgt", "cbse school", "school", "principal", "education trainer", "learning and development"] },
  { domain: "legal", terms: ["lawyer", "legal counsel", "legal associate", "legal executive", "advocate", "paralegal", "compliance officer", "contract specialist", "legal analyst"] },
  { domain: "supply-chain", terms: ["supply chain", "procurement", "purchasing", "logistics", "warehouse", "inventory", "operations executive", "demand planner", "sourcing manager", "import export"] },
  { domain: "hospitality", terms: ["hotel", "hospitality", "front office", "hotel manager", "chef", "cook", "restaurant manager", "food and beverage", "housekeeping", "guest relations"] },
  { domain: "retail", terms: ["retail", "store manager", "retail sales", "merchandiser", "category manager", "store executive", "visual merchandiser", "retail operations"] },
  { domain: "design-media", terms: ["graphic designer", "ui designer", "ux designer", "ui ux", "product designer", "motion designer", "video editor", "copywriter", "journalist", "content writer", "media"] },
  { domain: "agriculture", terms: ["agriculture", "agricultural engineer", "agronomist", "agronomy", "farm manager", "food technology", "food technologist", "horticulture", "veterinary", "dairy"] },
  { domain: "government", terms: ["government", "public sector", "civil services", "psu", "government officer", "government job", "public administration", "municipal", "railway recruitment"] },
  { domain: "research", terms: ["research scientist", "research associate", "research fellow", "scientist", "r&d", "research and development", "laboratory research"] },
  { domain: "customer-support", terms: ["customer support", "customer service", "technical support", "call center", "contact center", "help desk", "support executive"] },
  { domain: "real-estate", terms: ["real estate", "property consultant", "property manager", "real estate sales", "realty", "leasing consultant"] },
  { domain: "telecom", terms: ["telecom", "telecommunications", "network engineer", "rf engineer", "fiber engineer", "wireless engineer", "5g engineer", "network operations"] },
  { domain: "aerospace-defense", terms: ["aerospace", "aeronautical", "aviation", "aircraft", "defence", "defense", "drdo", "missile", "satellite", "space systems"] },
];

function normalized(value: string) {
  return value.toLowerCase().replace(/[^a-z0-9+#.]+/g, " ").replace(/\s+/g, " ").trim();
}

function hasTerm(text: string, term: string): boolean {
  const needle = normalized(term);
  if (!needle) return false;
  // Phrase/word-boundary matching prevents terms such as "ca" or "ai"
  // from accidentally matching unrelated words.
  const escaped = needle.replace(/[.*+?^${}()|[\]\\]/g, "\\$&").replace(/\\s+/g, "\\s+");
  return new RegExp(`(?:^|\\s)${escaped}(?:$|\\s)`, "i").test(text);
}

export function inferJobDomain(job: { title: string; description: string; company: string; domain?: string; requiredSkills?: string[]; preferredSkills?: string[] }): JobDomain {
  const explicit = normalized(job.domain || "");
  const explicitRule = explicit
    ? RULES.find(rule => normalized(rule.domain).replace(/[-]/g, " ") === explicit || explicit.includes(normalized(rule.domain).replace(/[-]/g, " ")))
    : undefined;

  const title = normalized(job.title || "");
  const skills = normalized(`${(job.requiredSkills || []).join(" ")} ${(job.preferredSkills || []).join(" ")}`);
  const description = normalized((job.description || "").slice(0, 12000));
  let best: { domain: JobDomain; score: number; hits: number } = { domain: "other", score: 0, hits: 0 };

  for (const rule of RULES) {
    let score = 0;
    let hits = 0;
    for (const term of rule.terms) {
      const inTitle = hasTerm(title, term);
      const inSkills = hasTerm(skills, term);
      const inDescription = hasTerm(description, term);
      if (inTitle) { score += 6; hits++; }
      if (inSkills) { score += 3; hits++; }
      if (inDescription) { score += 1; hits++; }
    }
    if (score > best.score || (score === best.score && hits > best.hits)) {
      best = { domain: rule.domain, score, hits };
    }
  }
  // Prefer strong title/skill/description evidence over a stale or generic
  // source-provided domain. Keep the explicit source domain only when the
  // textual evidence cannot identify a domain confidently.
  if (best.domain !== "other" && best.score >= 6) return best.domain;
  return explicitRule?.domain || best.domain;
}
