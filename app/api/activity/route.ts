import { NextResponse } from "next/server";
import { auth } from "@/auth";
import { prisma } from "@/lib/db/prisma";

const ALLOWED = ["visited", "interested", "applied"];

export async function GET() {
  try {
    const session = await auth();
    if (!session?.user?.id) return NextResponse.json({ success: false, message: "Unauthorized" }, { status: 401 });
    const activities = await prisma.jobActivity.findMany({ where: { userId: session.user.id }, include: { job: true }, orderBy: { createdAt: "desc" }, take: 200 });
    const latestApplicationByJob = new Map<string, (typeof activities)[number]>();
    for (const activity of activities) {
      if (activity.type === "applied" && !latestApplicationByJob.has(activity.jobId)) latestApplicationByJob.set(activity.jobId, activity);
    }
    const applications = [...latestApplicationByJob.values()].sort((a, b) => b.createdAt.getTime() - a.createdAt.getTime());
    return NextResponse.json({ success: true, activities, applications });
  } catch (error) {
    console.error("Activity load failed:", error);
    return NextResponse.json({ success: false, message: "Unable to load activity." }, { status: 500 });
  }
}

export async function POST(req: Request) {
  try {
    const session = await auth();
    if (!session?.user?.id) return NextResponse.json({ success: false, message: "Unauthorized" }, { status: 401 });
    const { jobId, type } = await req.json();
    if (!jobId || !ALLOWED.includes(type)) return NextResponse.json({ success: false, message: "Invalid activity" }, { status: 400 });
    const job = await prisma.job.findUnique({ where: { id: jobId } });
    if (!job) return NextResponse.json({ success: false, message: "Job is not available in the database yet." }, { status: 404 });

    if (type === "applied") {
      // One confirmed application record per user/job. Repeated clicks do not create duplicates.
      const existing = await prisma.jobActivity.findFirst({ where: { userId: session.user.id, jobId, type: "applied" } });
      if (existing) {
        const activity = await prisma.jobActivity.findUnique({ where: { id: existing.id }, include: { job: true } });
        return NextResponse.json({ success: true, activity });
      }
    }
    const activity = await prisma.jobActivity.create({ data: { userId: session.user.id, jobId, type }, include: { job: true } });
    return NextResponse.json({ success: true, activity });
  } catch (error) {
    console.error("Activity write failed:", error);
    return NextResponse.json({ success: false, message: "Unable to record activity." }, { status: 500 });
  }
}
