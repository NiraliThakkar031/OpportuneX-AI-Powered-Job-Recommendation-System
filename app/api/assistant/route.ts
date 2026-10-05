import { NextRequest, NextResponse } from "next/server";
import { getGeminiClient } from "@/lib/gemini";
import { SYSTEM_PROMPT } from "@/prompts/systemPrompt";
import { auth } from "@/auth";
import { prisma } from "@/lib/db/prisma";

type ChatMessage = {
  role: "user" | "assistant";
  content: string;
};

export async function POST(req: NextRequest) {
  try {
    if (!process.env.GEMINI_API_KEY) {
      return NextResponse.json(
        { error: "Career Copilot is unavailable because GEMINI_API_KEY is not configured." },
        { status: 503 }
      );
    }

    const session = await auth();
    const profile = session?.user?.id
      ? await prisma.profile.findUnique({ where: { userId: session.user.id } })
      : null;
    const recentRecommendations = session?.user?.id
      ? await prisma.recommendation.findMany({
          where: { userId: session.user.id },
          include: { job: true },
          orderBy: { score: "desc" },
          take: 5,
        })
      : [];
    const { messages } = await req.json();

    if (!messages || !Array.isArray(messages)) {
      return NextResponse.json(
        { error: "Messages are required." },
        { status: 400 }
      );
    }

    // Keep only the most recent conversation
    const recentMessages = messages.slice(-20);

    const profileContext = profile
      ? `Signed-in OpportuneX profile context:
Education: ${profile.degree || profile.education || "Not provided"}
Specialization/domain: ${profile.specialization || "Not provided"}
Experience years: ${profile.experienceYears}
Skills: ${Array.isArray(profile.skills) ? profile.skills.join(", ") : "Not provided"}
Preferred roles: ${Array.isArray(profile.preferredRoles) ? profile.preferredRoles.join(", ") : "Not provided"}
Preferred domains: ${Array.isArray(profile.preferredDomains) ? profile.preferredDomains.join(", ") : "Not provided"}
Preferred locations: ${Array.isArray(profile.preferredLocations) ? profile.preferredLocations.join(", ") : "Not provided"}
Workplace preference: ${profile.workplacePreference || "Not provided"}
Sector preference: ${Array.isArray(profile.sectors) ? profile.sectors.join(", ") : "Not provided"}
Certifications: ${Array.isArray(profile.certifications) ? profile.certifications.join(", ") : "Not provided"}`
      : "No signed-in OpportuneX profile context is available. Ask the user to complete their profile if personalization is needed.";
    const recommendationContext = recentRecommendations.length
      ? `Recent recommendation context:\n${recentRecommendations.map((item) => `- ${item.job.title} at ${item.job.company}, score ${Math.round(item.score)}%, location ${item.job.location}`).join("\n")}`
      : "No recent recommendation context is available.";

    const contents = [
      {
        role: "user",
        parts: [
          {
            text: `${SYSTEM_PROMPT}\n\n${profileContext}\n\n${recommendationContext}\n\nUse this context when it is relevant. Do not invent saved jobs, applications, salaries, or match reasons that are not supported by the context.`,
          },
        ],
      },
      ...recentMessages.map((message: ChatMessage) => ({
        role: message.role === "assistant" ? "model" : "user",
        parts: [
          {
            text: message.content,
          },
        ],
      })),
    ];

    const response = await getGeminiClient().models.generateContent({
      model: "gemini-2.5-flash",
      contents,
    });

    return NextResponse.json({
      reply: response.text,
    });
  } catch (error) {
    console.error(error);

    return NextResponse.json(
      {
        error: "Something went wrong.",
      },
      { status: 500 }
    );
  }
}
