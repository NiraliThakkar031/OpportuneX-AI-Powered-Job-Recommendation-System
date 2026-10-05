import { NextResponse } from "next/server";
import { auth } from "@/auth";
import { prisma } from "@/lib/db/prisma";
import { profilePayloadSchema } from "@/lib/profilePayload";
import { ZodError } from "zod";

export async function GET() {
  try {
    const session = await auth();
    if (!session?.user?.id) return NextResponse.json({ success: false, error: "Sign in is required." }, { status: 401 });
    const [profile, recommendations, savedCount, appliedCount] = await Promise.all([
      prisma.profile.findUnique({ where: { userId: session.user.id } }),
      prisma.recommendation.findMany({
        where: { userId: session.user.id },
        orderBy: { createdAt: "desc" },
        take: 20,
        select: { score: true },
      }),
      prisma.savedJob.count({ where: { userId: session.user.id } }),
      prisma.jobActivity.findMany({ where: { userId: session.user.id, type: "applied" }, select: { jobId: true }, distinct: ["jobId"] }),
    ]);
    const matchQuality = recommendations.length
      ? recommendations.reduce((sum, item) => sum + item.score, 0) / recommendations.length
      : null;
    return NextResponse.json({
      success: true,
      data: { profile, matchQuality, savedCount, appliedCount: appliedCount.length },
    });
  } catch (error) {
    console.error("Profile load failed:", error);
    return NextResponse.json({ success: false, error: "Unable to load profile." }, { status: 500 });
  }
}

export async function PUT(req: Request) {
  try {
    const session = await auth();
    if (!session?.user?.id) return NextResponse.json({ success: false, error: "Sign in is required before saving a profile." }, { status: 401 });
    const parsed = profilePayloadSchema.parse(await req.json());
    const profile = await prisma.profile.upsert({
      where: { userId: session.user.id },
      create: { userId: session.user.id, ...parsed },
      update: parsed,
    });
    return NextResponse.json({ success: true, data: { profile } });
  } catch (error) {
    if (error instanceof ZodError) {
      return NextResponse.json({ success: false, error: error.issues[0]?.message ?? "Invalid profile." }, { status: 400 });
    }
    console.error("Profile save failed:", error);
    return NextResponse.json({ success: false, error: "Unable to save profile. Please try again." }, { status: 500 });
  }
}

export const POST = PUT;
