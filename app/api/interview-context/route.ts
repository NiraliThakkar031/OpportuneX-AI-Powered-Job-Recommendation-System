import { NextResponse } from "next/server";
import { auth } from "@/auth";
import { prisma } from "@/lib/db/prisma";

export async function GET() {
  try {
    const session = await auth();
    if (!session?.user?.id) return NextResponse.json({ success: false, error: "Guest" }, { status: 401 });
    const context = await prisma.jobActivity.findFirst({ where: { userId: session.user.id, type: "interview_context" }, orderBy: { createdAt: "desc" }, include: { job: true } });
    if (!context?.job) return NextResponse.json({ success: false, error: "Search jobs first so Interview Prep can use your recent job context." }, { status: 428 });
    return NextResponse.json({ success: true, job: { id: context.job.id, title: context.job.title, company: context.job.company, location: context.job.location, description: context.job.description, domain: context.job.domain, requiredSkills: context.job.requiredSkills, preferredSkills: context.job.preferredSkills, minimumExperience: context.job.minimumExperience } });
  } catch (error) {
    console.error("Interview context lookup failed", error);
    return NextResponse.json({ success: false, error: "Unable to load recent job context." }, { status: 500 });
  }
}
