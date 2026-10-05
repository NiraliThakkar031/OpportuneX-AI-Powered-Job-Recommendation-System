import { NextResponse } from "next/server";
import { prisma } from "@/lib/db/prisma";

function authorized(request: Request) {
  const configured = process.env.JOB_SYNC_SECRET || process.env.CRON_SECRET;
  if (!configured) return false;
  const headerSecret = request.headers.get("x-job-sync-secret");
  const bearer = request.headers.get("authorization")?.replace(/^Bearer\s+/i, "");
  return headerSecret === configured || bearer === configured;
}

export async function GET(request: Request) {
  if (!authorized(request)) return NextResponse.json({ success: false, message: "Unauthorized" }, { status: 401 });
  try {
    const states = await prisma.jobSyncState.findMany({ orderBy: { source: "asc" } });
    const activeJobs = await prisma.job.count({ where: { active: true } });
    const staleJobs = await prisma.job.count({ where: { active: true, lastSeenAt: { lt: new Date(Date.now() - 14 * 24 * 60 * 60 * 1000) } } });
    const embeddingPending = await prisma.job.count({ where: { active: true, embeddingStatus: { in: ["pending", "failed"] }, embeddingAttempts: { lt: 5 } } });
    const embeddingReady = await prisma.job.count({ where: { active: true, embeddingStatus: "ready" } });
    const embeddingFailed = await prisma.job.count({ where: { active: true, embeddingStatus: "failed", embeddingAttempts: { gte: 5 } } });
    return NextResponse.json({ success: true, activeJobs, staleJobs, embeddingPending, embeddingReady, embeddingFailed, sources: states });
  } catch (error) {
    console.error("Sync status lookup failed", error);
    return NextResponse.json({ success: false, message: "Unable to load sync status" }, { status: 503 });
  }
}
