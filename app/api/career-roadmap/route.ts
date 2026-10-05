import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/auth";
import { prisma } from "@/lib/db/prisma";
import { getGeminiClient } from "@/lib/gemini";

function fallbackCareer(target: string, profile: any) {
  const skills = Array.isArray(profile?.skills) ? profile.skills : [];
  const certs = Array.isArray(profile?.certifications) ? profile.certifications : [];
  const current = `${profile?.degree || profile?.education || "Education not provided"}; ${profile?.experienceYears || 0} years experience; ${skills.slice(0, 8).join(", ") || "skills not provided"}.`;
  const phases = [
    { phase: "Baseline and role requirements", focus: `Translate ${target} into a concrete requirement checklist.`, actions: [`Collect 10 current ${target} job descriptions and group repeated requirements.`, `Mark each requirement as already evidenced, partially evidenced, or missing.`, "Choose the 3 highest-impact gaps to close first."], evidenceOfReadiness: ["A one-page target-role requirement matrix linked to real job postings."] },
    { phase: "Close the highest-impact gaps", focus: "Build the missing capabilities in prerequisite order.", actions: [`Study the first missing capability using an authoritative source.`, "Complete a realistic task that exercises it.", "Repeat the task independently and document the result."], evidenceOfReadiness: ["A verified work sample for each priority gap."] },
    { phase: "Create role evidence", focus: `Turn learning into evidence that a ${target} employer can evaluate.`, actions: [`Complete one end-to-end ${target} case, project, work sample or domain assessment.`, "Document the problem, approach, result and what you learned.", "Update the resume with only evidence you can support."], evidenceOfReadiness: ["One polished role-specific work sample and updated resume evidence."] },
    { phase: "Validate and apply", focus: "Test readiness against real hiring requirements.", actions: ["Re-score your profile against current target jobs.", "Practice role-specific interview questions and explain your evidence.", "Apply only where the core requirements are reasonably supported."], evidenceOfReadiness: ["A repeatable application/interview preparation checklist and measured improvement in target-job match."] }
  ];
  return { targetRole: target, currentState: current, gaps: ["Validate the exact requirements of the target role", ...skills.length ? [] : ["Build a demonstrable skill base"], ...certs.length ? [] : ["Add role-relevant certification only if job evidence shows it is expected"]], phases, next30Days: ["Collect and analyze 10 target-role postings.", "Close the first priority gap and create one evidence artifact.", "Update resume evidence using only verified experience."], next90Days: [`Complete the end-to-end ${target} work sample.`, "Run a fresh requirement-to-evidence comparison against current jobs.", "Practice interviews and begin targeted applications."], fallback: true };
}

function parseJson(raw: string) {
  const cleaned = raw.replace(/^```(?:json)?\s*/i, "").replace(/\s*```$/i, "").trim();
  const start = cleaned.indexOf("{"); const end = cleaned.lastIndexOf("}");
  if (start < 0 || end <= start) throw new Error("Invalid career roadmap response");
  return JSON.parse(cleaned.slice(start, end + 1));
}

export async function POST(req: NextRequest) {
  try {
    const session = await auth();
    const profile = session?.user?.id ? await prisma.profile.findUnique({ where: { userId: session.user.id } }) : null;
    const b = await req.json().catch(() => ({}));
    const target = String(b.targetRole || (Array.isArray(profile?.preferredRoles) ? profile?.preferredRoles[0] : "") || "").trim();
    if (!target) return NextResponse.json({ success: false, error: "Set a target role in your profile or enter one." }, { status: 400 });
    const ctx = `Education: ${profile?.degree || profile?.education || "not provided"}\nSpecialization: ${profile?.specialization || "not provided"}\nExperience: ${profile?.experienceYears || 0}\nSkills: ${Array.isArray(profile?.skills) ? profile.skills.join(", ") : "not provided"}\nCertifications: ${Array.isArray(profile?.certifications) ? profile.certifications.join(", ") : "not provided"}`;
    const prompt = `Build a concrete, domain-neutral career roadmap from the candidate's current evidence to target role "${target}". Do not assume software. Return JSON only: {targetRole:string,currentState:string,gaps:string[],phases:[{phase:string,focus:string,actions:string[],evidenceOfReadiness:string[]}],next30Days:string[],next90Days:string[]}. Every action must be executable and specific: name the type of job research, learning activity, work sample, assessment, certification decision, portfolio evidence or interview practice. Avoid generic statements such as "improve skills". Use only profile facts; uncertain requirements must be labeled "validate".\nPROFILE:\n${ctx}`;
    try {
      const r = await getGeminiClient().models.generateContent({ model: "gemini-2.5-flash", contents: [{ text: prompt }] });
      const data = parseJson(r.text || "");
      if (!Array.isArray(data.phases) || data.phases.length < 3) throw new Error("Incomplete career roadmap");
      return NextResponse.json({ success: true, data, source: "ai" });
    } catch (e) {
      console.warn("Career roadmap AI unavailable; using deterministic fallback.", e);
      return NextResponse.json({ success: true, data: fallbackCareer(target, profile), source: "fallback" });
    }
  } catch (e) {
    return NextResponse.json({ success: false, error: "We couldn't build the career roadmap right now. Please try again." }, { status: 500 });
  }
}
