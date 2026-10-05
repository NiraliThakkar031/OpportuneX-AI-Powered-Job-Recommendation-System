import { NextResponse } from "next/server";
import { auth } from "@/auth";
import { prisma } from "@/lib/db/prisma";

export async function GET() {
  const session = await auth();
  if (!session?.user?.id) return NextResponse.json({ success:false, message:"Unauthorized" }, { status:401 });
  const alerts = await prisma.jobAlert.findMany({ where:{ userId:session.user.id }, orderBy:{ id:"desc" } });
  return NextResponse.json({ success:true, alerts });
}

export async function POST(req: Request) {
  const session = await auth();
  if (!session?.user?.id) return NextResponse.json({ success:false, message:"Unauthorized" }, { status:401 });
  const body = await req.json();
  if (!body.role?.trim()) return NextResponse.json({ success:false, message:"Role is required" }, { status:400 });
  const alert = await prisma.jobAlert.create({ data:{ userId:session.user.id, role:body.role.trim(), location:body.location?.trim() || null, minMatch:Number(body.minMatch || 80), frequency:body.frequency || "daily", enabled:body.enabled !== false } });
  return NextResponse.json({ success:true, alert });
}

export async function PATCH(req: Request) {
  const session = await auth();
  if (!session?.user?.id) return NextResponse.json({ success:false, message:"Unauthorized" }, { status:401 });
  const body = await req.json();
  if (!body.id) return NextResponse.json({ success:false, message:"id is required" }, { status:400 });
  const alert = await prisma.jobAlert.updateMany({ where:{ id:body.id, userId:session.user.id }, data:{ ...(body.enabled !== undefined ? { enabled:Boolean(body.enabled) } : {}), ...(body.minMatch !== undefined ? { minMatch:Number(body.minMatch) } : {}), ...(body.frequency ? { frequency:body.frequency } : {}) } });
  return NextResponse.json({ success:true, updated:alert.count });
}
