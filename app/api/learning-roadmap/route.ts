import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/auth";
import { getGeminiClient } from "@/lib/gemini";

function concreteFallbackRoadmap(target: string, missing: string[]) {
  const gaps = [...new Set(missing.map(x => x.trim()).filter(Boolean))].slice(0, 10);
  const focus = gaps.length ? gaps : ["role-specific fundamentals", "practical evidence", "interview readiness"];
  const phases = focus.map((gap, i) => ({
    week: i + 1,
    title: `Close the gap: ${gap}`,
    objectives: [
      `Define what ${gap} means in the context of a ${target} role and identify the exact level expected in the job description.`,
      `Learn the core concepts, terminology, standards or procedures needed to perform ${gap} correctly.`
    ],
    practice: [
      `Complete one guided exercise or real-world task focused specifically on ${gap}.`,
      `Repeat the task without the guide and record the mistakes or questions that remain.`,
      `Review one real ${target} job requirement and map how ${gap} is used in that workplace.`
    ],
    evidence: [
      `Produce one concrete artifact demonstrating ${gap}: a project, case study, calculation, design, report, assessment, work sample, presentation, or other domain-appropriate evidence.`,
      `Write a short evidence note explaining what you did, the tools/methods used, and the result.`
    ],
    resources: [
      `Use an authoritative course, textbook, official documentation, professional standard, or domain training material for ${gap}.`,
      `Use one realistic practice problem or case from the target profession.`
    ],
    deliverable: `A verified ${gap} work sample plus a short explanation of the result.`,
    checkpoint: `Can you perform the ${gap} task independently and explain your decisions?`
  }));

  phases.push({
    week: phases.length + 1,
    title: `Integrate the skills for ${target}`,
    objectives: [`Combine the closed gaps into one realistic ${target} scenario.`, "Identify the last evidence or knowledge gap before applying."],
    practice: [`Complete a realistic end-to-end ${target} task using the skills above.`, "Review the result against the original job requirements."],
    evidence: ["Keep the final work sample and a concise explanation of the outcome."],
    resources: ["Use a real job description, professional case study, assessment or domain benchmark as the final reference."],
    deliverable: `One portfolio/work-sample case proving readiness for ${target}.`,
    checkpoint: "You can explain what you know, what you can do, and what evidence proves it."
  });

  return {
    durationWeeks: phases.length,
    goal: `Become demonstrably ready for ${target} by closing the identified gaps in order and producing evidence at every stage.`,
    weeks: phases,
    milestones: phases.map(w => `End of Week ${w.week}: ${w.title}`),
    fallback: true
  };
}

function cleanJson(raw: string) {
  const cleaned = raw.replace(/^```(?:json)?\s*/i, "").replace(/\s*```$/i, "").trim();
  const start = cleaned.indexOf("{");
  const end = cleaned.lastIndexOf("}");
  if (start < 0 || end <= start) throw new Error("Invalid roadmap response");
  return JSON.parse(cleaned.slice(start, end + 1));
}

async function generateWithRetry(prompt: string) {
  const client = getGeminiClient();
  let lastError: unknown;
  for (let attempt = 0; attempt < 2; attempt++) {
    try {
      const r = await client.models.generateContent({ model: "gemini-2.5-flash", contents: [{ text: prompt }] });
      const parsed = cleanJson(r.text || "");
      if (!Array.isArray(parsed.weeks) || parsed.weeks.length < 4) throw new Error("Incomplete roadmap structure");
      return parsed;
    } catch (e) {
      lastError = e;
      if (attempt === 0) await new Promise(resolve => setTimeout(resolve, 700));
    }
  }
  throw lastError instanceof Error ? lastError : new Error("AI roadmap unavailable");
}

export async function POST(req: NextRequest) {
  try {
    const session = await auth();
    const b = await req.json().catch(() => ({}));
    const target = String(b.targetRole || "").trim();
    const missing = Array.isArray(b.missingSkills) ? b.missingSkills.map(String).filter(Boolean) : [];
    if (!target) return NextResponse.json({ success: false, error: "A target role is required." }, { status: 400 });

    const prompt = `Create a highly practical, domain-neutral learning roadmap for a candidate targeting "${target}". The plan must work for ANY profession and must use the exact gaps supplied below. Do not give generic advice such as "learn more", "practice regularly", "build skills", or "improve knowledge" without saying exactly what the candidate should study, do, produce and verify.\n\nReturn JSON only with this shape:\n{"durationWeeks":number,"goal":string,"weeks":[{"week":number,"title":string,"objectives":string[],"practice":string[],"evidence":string[],"resources":string[],"deliverable":string,"checkpoint":string}],"milestones":string[]}\n\nFor every gap, specify: (1) the concrete concepts/knowledge to learn, (2) a realistic task or exercise to perform, (3) a domain-appropriate work sample or artifact to produce, (4) what to use as a learning resource such as official documentation, standards, textbooks, professional training, labs, case studies or authoritative courses, and (5) a measurable checkpoint. Order prerequisites before advanced work. Finish with an integration project/work sample and job-readiness validation. Use 4-10 weeks depending on the number and depth of gaps. Never assume programming.\n\nTARGET ROLE: ${target}\nIDENTIFIED GAPS: ${missing.length ? missing.join(", ") : "No explicit gaps; strengthen evidence and validate readiness against the target role."}`;

    try {
      const data = await generateWithRetry(prompt);
      return NextResponse.json({ success: true, data, source: "ai" });
    } catch (aiError) {
      console.warn("Learning roadmap AI unavailable; using concrete fallback.", aiError);
      return NextResponse.json({ success: true, data: concreteFallbackRoadmap(target, missing), source: "fallback" });
    }
  } catch (e) {
    return NextResponse.json({ success: false, error: "We couldn't build the roadmap right now. Please try again." }, { status: 500 });
  }
}
