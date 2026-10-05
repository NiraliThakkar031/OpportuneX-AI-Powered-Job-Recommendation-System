import { NextResponse } from "next/server";
import { auth } from "@/auth";
import { prisma } from "@/lib/db/prisma";
import { getGeminiClient } from "@/lib/gemini";

function stringArray(value: unknown): string[] {
  return Array.isArray(value) ? value.filter((v): v is string => typeof v === "string") : [];
}

export async function POST(req: Request) {
  let fallbackDomain = "your target role";
  let recentJob: any = null;
  try {
    const session = await auth();
    const body = await req.json().catch(() => ({}));
    let profile: any = null;

    if (session?.user?.id) {
      profile = await prisma.profile.findUnique({ where: { userId: session.user.id } });
      const recentContext = await prisma.jobActivity.findFirst({
        where: { userId: session.user.id, type: "interview_context" },
        orderBy: { createdAt: "desc" },
        include: { job: true },
      });
      recentJob = recentContext?.job ?? null;
    } else {
      profile = body?.profile && typeof body.profile === "object" ? body.profile : null;
      recentJob = body?.jobContext && typeof body.jobContext === "object" ? body.jobContext : null;
    }

    if (!profile) return NextResponse.json({ error: "Complete your job profile first." }, { status: 428 });
    if (!recentJob) return NextResponse.json({ error: "Search jobs first so Interview Prep can use your recent job context." }, { status: 428 });

    const domains = stringArray(profile.preferredDomains);
    const roles = stringArray(profile.preferredRoles);
    const skills = stringArray(profile.skills);
    const jobRequiredSkills = stringArray(recentJob.requiredSkills);
    const jobPreferredSkills = stringArray(recentJob.preferredSkills);
    const domain = String(recentJob.domain || domains[0] || profile.specialization || roles[0] || "general workplace skills");
    fallbackDomain = String(recentJob.title || domain);

    const prompt = `Create a 10-question interactive mock interview MCQ quiz for a job seeker.
Target job: ${recentJob.title || "Not specified"}
Company: ${recentJob.company || "Not specified"}
Job domain: ${domain}
Job description: ${String(recentJob.description || "").slice(0, 5000)}
Required job skills: ${jobRequiredSkills.join(", ") || "not specified"}
Preferred job skills: ${jobPreferredSkills.join(", ") || "not specified"}
Candidate preferred roles: ${roles.join(", ") || "not specified"}
Candidate skills: ${skills.join(", ") || "not specified"}
Candidate education: ${profile.degree || profile.education || "not specified"}
Candidate experience: ${profile.experienceYears ?? profile.experience ?? 0} years

Make the quiz specific to this job. Prioritize the actual role, domain, required skills, practical scenarios and realistic interview decisions. Do not produce generic software questions unless the selected job actually requires them. Include a mix of role knowledge, practical application, troubleshooting/decision making and behavioural questions relevant to the posting.

Return ONLY valid JSON with this exact shape:
{"domain":"...","questions":[{"id":"q1","question":"...","options":["...","...","...","..."],"answer":0,"explanation":"..."}]}
Rules: exactly 10 questions, exactly 4 options per question, answer is a zero-based index, exactly one correct option, concise explanations, no markdown, no code fences.`;

    const response = await getGeminiClient().models.generateContent({ model: "gemini-2.5-flash", contents: [{ role: "user", parts: [{ text: prompt }] }] });
    const raw = response.text?.trim() || "";
    const cleaned = raw.replace(/^```json\s*/i, "").replace(/^```\s*/i, "").replace(/\s*```$/i, "").trim();
    const parsed = JSON.parse(cleaned);
    if (!Array.isArray(parsed.questions) || parsed.questions.length !== 10) throw new Error("Invalid question count.");
    const questions = parsed.questions.map((q: any, index: number) => ({
      id: String(q.id || `q${index + 1}`).trim(), question: String(q.question || "").trim(),
      options: Array.isArray(q.options) ? q.options.map((v: unknown) => String(v).trim()).slice(0, 4) : [], answer: Number(q.answer), explanation: String(q.explanation || "").trim(),
    }));
    const ids = new Set<string>();
    for (const q of questions) {
      if (!q.id || ids.has(q.id) || !q.question || q.options.length !== 4 || q.options.some((v: string) => !v) || new Set(q.options.map((v: string) => v.toLowerCase())).size !== 4 || !Number.isInteger(q.answer) || q.answer < 0 || q.answer >= 4 || !q.explanation) throw new Error("Invalid generated quiz.");
      ids.add(q.id);
    }
    if (questions.length !== 10) throw new Error("Invalid generated quiz.");
    return NextResponse.json({ success: true, quiz: { domain: String(parsed.domain || recentJob.title || domain), questions } });
  } catch (error) {
    console.error("Interview quiz generation failed; using deterministic fallback:", error);
    const focusSkills = stringArray((typeof recentJob === "object" && recentJob) ? recentJob.requiredSkills : []).slice(0, 4);
    const focusSkill = focusSkills[0] || "the required skills for this role";
    const questions = Array.from({ length: 10 }, (_, index) => ({
      id: `fallback-${index + 1}`,
      question: index % 2 === 0 ? `For ${fallbackDomain}, especially around ${focusSkill}, which response best demonstrates practical readiness?` : `When discussing ${fallbackDomain}, which approach is most useful in an interview?`,
      options: [
        index % 2 === 0 ? `Connect your answer to the role's required skills and give a concrete example of applying them.` : `Explain your reasoning, trade-offs and the evidence behind your approach.`,
        "Give a generic answer without referring to the role requirements.",
        "Focus only on memorized definitions and avoid practical examples.",
        "Claim experience with tools or tasks you have not actually used."
      ],
      answer: 0,
      explanation: "The fallback keeps the selected role central and rewards evidence-based, practical interview reasoning."
    }));
    return NextResponse.json({ success: true, quiz: { domain: fallbackDomain, questions }, source: "fallback" });
  }
}
