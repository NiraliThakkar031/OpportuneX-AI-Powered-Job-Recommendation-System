import { NextResponse } from "next/server";
import { processEmbeddingQueue } from "@/lib/recommendation/embeddingWorker";

function authorized(request: Request) {
  const configured = process.env.JOB_SYNC_SECRET || process.env.CRON_SECRET;
  if (!configured) return false;
  const secret = request.headers.get("x-job-sync-secret");
  const bearer = request.headers.get("authorization")?.replace(/^Bearer\s+/i, "");
  return secret === configured || bearer === configured;
}

export async function POST(request: Request) {
  if (!authorized(request)) return NextResponse.json({ success: false, message: "Unauthorized" }, { status: 401 });
  if (!process.env.GEMINI_API_KEY) return NextResponse.json({ success: false, message: "GEMINI_API_KEY is not configured." }, { status: 503 });
  try {
    const result = await processEmbeddingQueue(32);
    return NextResponse.json({ success: true, ...result });
  } catch (error) {
    return NextResponse.json({ success: false, message: error instanceof Error ? error.message : "Embedding worker failed" }, { status: 503 });
  }
}

export async function GET(request: Request) {
  return POST(request);
}
