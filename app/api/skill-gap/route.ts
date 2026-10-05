import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/auth";
import { prisma } from "@/lib/db/prisma";
import { matchRequirement, type Requirement } from "@/lib/career/domainNeutral";

function cleanList(value: unknown): string[] {
  if (!Array.isArray(value)) return [];
  return [...new Set(value.filter((x): x is string => typeof x === "string" && x.trim().length > 0).map(x => x.trim()))];
}

function buildRequirements(job: {
  title: string;
  description: string;
  domain: string | null;
  requiredEducation: string | null;
  minimumExperience: number | null;
  requiredSkills: unknown;
  preferredSkills: unknown;
  requiredCertifications: unknown;
}): { requirements: Requirement[]; responsibilities: string[] } {
  const requirements: Requirement[] = [];
  const add = (name: string, category: Requirement["category"], importance: Requirement["importance"], evidence?: string) => {
    const normalized = name.trim();
    if (!normalized) return;
    const key = normalized.toLowerCase();
    if (requirements.some(r => r.name.toLowerCase() === key && r.category === category)) return;
    requirements.push({ name: normalized, category, importance, evidence });
  };

  const education = String(job.requiredEducation || "").trim();
  if (education) add(education, "education", "required");

  const title = job.title.toLowerCase();
  const inferredExperience = typeof job.minimumExperience === "number" && job.minimumExperience > 0
    ? job.minimumExperience
    : /\b(senior|sr\.?|experienced)\b/.test(title) ? 4
    : /\b(lead|manager|supervisor|head)\b/.test(title) ? 5
    : /\b(principal|director|architect|vp|vice president)\b/.test(title) ? 7
    : /\b(junior|associate)\b/.test(title) ? 1
    : /\b(intern|internship|trainee|graduate|fresher|entry[- ]level)\b/.test(title) ? 0
    : undefined;
  if (inferredExperience !== undefined && inferredExperience > 0) {
    add(`${inferredExperience} years experience`, "experience", "required", "Structured or conservatively inferred from the role level.");
  }

  cleanList(job.requiredSkills).forEach(skill => add(skill, "skill", "required"));
  cleanList(job.preferredSkills).forEach(skill => add(skill, "skill", "preferred"));
  cleanList(job.requiredCertifications).forEach(cert => add(cert, "certification", "required"));

  // The database fields above are the primary source. These lightweight patterns
  // only recover structured requirements when a provider omitted a dedicated field.
  const description = job.description || "";
  const exp = description.match(/(?:minimum|at least|minimum of)\s+(\d+(?:\.\d+)?)\s*(?:\+\s*)?(?:years?|yrs?)/i)
    || description.match(/(\d+(?:\.\d+)?)\+?\s*(?:years?|yrs?)\s+(?:of\s+)?(?:relevant\s+)?experience/i);
  if (!job.minimumExperience && exp) add(`${exp[1]} years experience`, "experience", "required");

  const responsibilities = description
    .split(/\n+|•|\u2022|(?<=[.!?])\s+(?=(?:Develop|Manage|Lead|Design|Build|Analyze|Support|Coordinate|Implement|Create|Maintain|Deliver|Drive|Assist|Perform)\b)/i)
    .map(s => s.replace(/^[-*\d.)\s]+/, "").trim())
    .filter(s => s.length >= 35 && s.length <= 260)
    .slice(0, 8);

  return { requirements, responsibilities };
}

function inferExperience(description: string, title: string, structured?: number | null): number | undefined {
  const text = `${title} ${description}`;
  const matches = [...text.matchAll(/(?:minimum|at least|requires?|required|need(?:s)?|must have)\s*(\d+(?:\.\d+)?)\s*(?:-|to|–|—)?\s*(?:\d+(?:\.\d+)?)?\s*(?:years?|yrs?)/gi), ...text.matchAll(/(\d+(?:\.\d+)?)\+?\s*(?:years?|yrs?)\s+(?:of\s+)?(?:relevant\s+)?experience/gi)];
  const explicit = matches.map(m => Number(m[1])).filter(Number.isFinite);
  if (typeof structured === "number" && Number.isFinite(structured)) return explicit.length ? Math.max(structured, ...explicit) : structured;
  if (explicit.length) return Math.max(...explicit);
  const t = title.toLowerCase();
  if (/\b(intern|internship|trainee|graduate|fresher|entry[- ]level)\b/.test(t)) return 0;
  if (/\b(junior|associate)\b/.test(t)) return 1;
  if (/\b(mid[- ]?level|professional)\b/.test(t)) return 2;
  if (/\b(senior|sr\.?|experienced)\b/.test(t)) return 4;
  if (/\b(lead|manager|supervisor|head)\b/.test(t)) return 5;
  if (/\b(principal|director|architect|vp|vice president)\b/.test(t)) return 7;
  return undefined;
}

function experienceResult(required: number | undefined, years: number) {
  if (required === undefined) return { matched: false, evidence: `${years} years in profile`, score: 0 };
  const gap = required - years;
  if (gap <= 0) return { matched: true, evidence: `${years} years in profile meets ${required}+ years`, score: 1 };
  if (gap <= 0.5) return { matched: true, evidence: `${years} years in profile is within 0.5 years of ${required}+`, score: 0.7 };
  return { matched: false, evidence: `${years} years in profile vs ${required}+ required`, score: 0 };
}

function extractDescriptionRequirements(description: string): string[] {
  const out: string[] = [];
  const patterns = [
    /(?:experience|proficiency|expertise|knowledge|familiarity|skilled|competenc(?:e|y)|ability)\s+(?:in|with|using|to)\s+([^.;\n]+)/gi,
    /(?:responsible for|responsibilities include|will)\s+([^.;\n]+)/gi,
    /(?:degree|diploma|certification|license)\s+(?:in|of)\s+([^.;\n]+)/gi,
  ];
  for (const pattern of patterns) {
    for (const match of description.matchAll(pattern)) {
      const value = String(match[1] || "").replace(/\s+/g, " ").trim();
      if (value.length >= 3 && value.length <= 100) out.push(value);
    }
  }
  return [...new Set(out)].slice(0, 10);
}

export async function POST(req: NextRequest) {
  try {
    const session = await auth();
    const body = await req.json().catch(() => ({}));
    const jobId = String(body.jobId || "").trim();
    if (!jobId) return NextResponse.json({ success: false, error: "A job listing is required." }, { status: 400 });

    const separator = jobId.indexOf(":");
    const jobWhere = separator > 0
      ? { OR: [{ id: jobId }, { source: jobId.slice(0, separator), sourceJobId: jobId.slice(separator + 1) }] }
      : { id: jobId };

    const [job, savedProfile] = await Promise.all([
      prisma.job.findFirst({ where: jobWhere }),
      session?.user?.id ? prisma.profile.findUnique({ where: { userId: session.user.id } }) : Promise.resolve(null),
    ]);
    if (!job) return NextResponse.json({ success: false, error: "This job is no longer available." }, { status: 404 });

    let profileFacts: { roles: string[]; skills: string[]; education: string[]; certifications: string[]; experience: string[]; domain: string[]; years: number };
    if (savedProfile) {
      profileFacts = {
        roles: [...cleanList(savedProfile.preferredRoles), ...cleanList(savedProfile.preferredDomains)],
        skills: cleanList(savedProfile.skills),
        education: [savedProfile.degree, savedProfile.education, savedProfile.specialization].filter(Boolean) as string[],
        certifications: cleanList(savedProfile.certifications),
        experience: [`${savedProfile.experienceYears || 0} years experience`],
        domain: cleanList(savedProfile.preferredDomains),
        years: Number(savedProfile.experienceYears || 0),
      };
    } else if (body.profile) {
      const { profilePayloadSchema } = await import("@/lib/profilePayload");
      const guest = profilePayloadSchema.parse(body.profile);
      profileFacts = {
        roles: [...guest.preferredRoles, ...guest.preferredDomains],
        skills: guest.skills,
        education: [guest.degree, guest.education, guest.specialization].filter(Boolean),
        certifications: guest.certifications,
        experience: [`${guest.experienceYears || 0} years experience`],
        domain: guest.preferredDomains,
        years: Number(guest.experienceYears || 0),
      };
    } else {
      return NextResponse.json({ success: false, error: "Complete your job profile first." }, { status: 428 });
    }

    const { requirements, responsibilities } = buildRequirements(job);
    const inferredExperience = inferExperience(job.description, job.title, job.minimumExperience);
    if (inferredExperience !== undefined && !requirements.some(r => r.category === "experience")) {
      requirements.unshift({ name: `${inferredExperience}+ years experience`, category: "experience", importance: "required", evidence: "Detected from the posting or role level." });
    }

    // Always provide meaningful, job-specific analysis even when the source omitted structured fields.
    requirements.push({ name: `Role alignment: ${job.title}`, category: "competency", importance: "required", evidence: "Derived from the job title." });
    if (job.domain) requirements.push({ name: `Domain alignment: ${job.domain}`, category: "other", importance: "preferred", evidence: "Derived from the job domain." });
    for (const item of extractDescriptionRequirements(job.description)) {
      if (!requirements.some(r => r.name.toLowerCase() === item.toLowerCase())) requirements.push({ name: item, category: "skill", importance: "preferred", evidence: "Recovered from the job description." });
    }

    const unique = requirements.filter((r, i, arr) => arr.findIndex(x => x.name.toLowerCase() === r.name.toLowerCase() && x.category === r.category) === i).slice(0, 18);
    const rows = unique.map(r => {
      const isExperience = r.category === "experience";
      const result = isExperience ? experienceResult(inferredExperience, profileFacts.years) : matchRequirement(r, profileFacts);
      return { ...r, result };
    });
    let missing = rows.filter(r => !r.result.matched);
    let matched = rows.filter(r => r.result.matched);
    // Never render an empty gap analysis: when all stated requirements are covered,
    // surface the remaining real-world readiness step as an evidence gap rather than
    // pretending the candidate has nothing left to validate.
    if (!missing.length) {
      const evidenceGap = {
        name: `Role-specific evidence for ${job.title}`,
        category: "other",
        importance: "preferred" as const,
        evidence: "Readiness still needs to be demonstrated through a role-specific work sample, assessment, project, case, portfolio item or equivalent evidence.",
        result: { matched: false, evidence: "No role-specific evidence was provided in the profile.", score: 0 },
      };
      rows.push(evidenceGap);
      missing = [evidenceGap];
    }
    matched = rows.filter(r => r.result.matched);
    const score = rows.length ? Math.round((matched.length / rows.length) * 100) : 0;

    return NextResponse.json({ success: true, data: {
      jobId: job.id,
      jobTitle: job.title,
      domain: job.domain || "General",
      company: job.company,
      score,
      matched,
      missing,
      requirements: rows,
      responsibilities,
      methodology: "Deterministic requirement-by-requirement comparison using the selected job and the candidate profile. AI is not required.",
      generatedAt: new Date().toISOString(),
    }});
  } catch (e) {
    console.error("Skill gap analysis failed", e);
    return NextResponse.json({ success: false, error: "We couldn't analyze this job right now. Please try again." }, { status: 500 });
  }
}
