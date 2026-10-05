import { getGeminiClient } from "@/lib/gemini";
import { RESUME_PROMPT } from "@/prompts/resumePrompt";

export async function analyzeResume(file: File): Promise<string> {
  const bytes = await file.arrayBuffer();

  const response = await getGeminiClient().models.generateContent({
    model: "gemini-2.5-flash",
    contents: [
      {
        text: RESUME_PROMPT,
      },
      {
        inlineData: {
          mimeType: "application/pdf",
          data: Buffer.from(bytes).toString("base64"),
        },
      },
    ],
  });

  const analysis = response.text?.trim();

  if (!analysis) {
    throw new Error("No analysis was generated.");
  }

  return analysis;
}
