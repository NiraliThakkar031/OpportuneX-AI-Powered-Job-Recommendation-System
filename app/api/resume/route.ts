import { NextRequest, NextResponse } from "next/server";
import { analyzeResume } from "@/lib/gemini/resumeAnalysis";

const MAX_FILE_SIZE = 5 * 1024 * 1024;

export async function POST(req: NextRequest) {
  try {
    const formData = await req.formData();

    const file = formData.get("resume");

    if (!(file instanceof File)) {
      return NextResponse.json(
        { error: "No resume file uploaded." },
        { status: 400 }
      );
    }

    if (file.type !== "application/pdf") {
      return NextResponse.json(
        { error: "Only PDF resumes are supported." },
        { status: 400 }
      );
    }

    if (file.size > MAX_FILE_SIZE) {
      return NextResponse.json(
        { error: "Resume must be smaller than 5 MB." },
        { status: 400 }
      );
    }

    const analysis = await analyzeResume(file);

    return NextResponse.json({
      analysis,
    });
  } catch (error) {
    console.error(error);

    return NextResponse.json(
      {
        error: "Failed to analyze resume.",
      },
      { status: 500 }
    );
  }
}