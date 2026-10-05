import { NextResponse } from "next/server";
import { prisma } from "@/lib/db/prisma";
export async function GET() {
  try { await prisma.$queryRaw`SELECT 1`; return NextResponse.json({ ok: true, database: "connected", timestamp: new Date().toISOString() }); }
  catch { return NextResponse.json({ ok: false, database: "unavailable" }, { status: 503 }); }
}
