import { NextResponse } from "next/server";
import { auth } from "@/auth";
import { prisma } from "@/lib/db/prisma";

export async function GET() {
  try {
    const session = await auth();
    if (!session?.user?.id) return NextResponse.json({ success: false, message: "Unauthorized" }, { status: 401 });
    const jobs = await prisma.savedJob.findMany({ where: { userId: session.user.id }, include: { job: true }, orderBy: { createdAt: "desc" } });
    return NextResponse.json({ success: true, jobs });
  } catch (error) {
    console.error("Saved jobs load failed:", error);
    return NextResponse.json({ success: false, message: "Unable to load saved jobs." }, { status: 500 });
  }
}

export async function POST(req: Request) {
  try {
    const session = await auth();
    if (!session?.user?.id) return NextResponse.json({ success: false, message: "Unauthorized" }, { status: 401 });
    const { jobId } = await req.json();
    if (!jobId) return NextResponse.json({ success: false, message: "jobId is required" }, { status: 400 });
    const job = await prisma.job.findUnique({ where: { id: jobId } });
    if (!job) return NextResponse.json({ success: false, message: "Job is not available in the database yet." }, { status: 404 });
    const saved = await prisma.savedJob.upsert({ where: { userId_jobId: { userId: session.user.id, jobId } }, create: { userId: session.user.id, jobId }, update: {} });
    return NextResponse.json({ success: true, saved });
  } catch (error) {
    console.error("Saved job update failed:", error);
    return NextResponse.json({ success: false, message: "Unable to update saved jobs." }, { status: 500 });
  }
}

export async function DELETE(req: Request) {
  try {
    const session = await auth();
    if (!session?.user?.id) return NextResponse.json({ success: false, message: "Unauthorized" }, { status: 401 });
    const { jobId } = await req.json();
    if (!jobId) return NextResponse.json({ success: false, message: "jobId is required" }, { status: 400 });
    await prisma.savedJob.deleteMany({ where: { userId: session.user.id, jobId } });
    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("Saved job delete failed:", error);
    return NextResponse.json({ success: false, message: "Unable to remove saved job." }, { status: 500 });
  }
}
