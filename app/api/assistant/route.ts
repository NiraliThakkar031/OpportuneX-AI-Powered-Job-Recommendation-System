import { NextRequest, NextResponse } from "next/server";
import { ai } from "@/lib/gemini";
import { SYSTEM_PROMPT } from "@/prompts/systemPrompt";

type ChatMessage = {
  role: "user" | "assistant";
  content: string;
};

export async function POST(req: NextRequest) {
  try {
    const { messages } = await req.json();

    if (!messages || !Array.isArray(messages)) {
      return NextResponse.json(
        { error: "Messages are required." },
        { status: 400 }
      );
    }

    // Keep only the most recent conversation
    const recentMessages = messages.slice(-20);

    const contents = [
      {
        role: "user",
        parts: [
          {
            text: SYSTEM_PROMPT,
          },
        ],
      },
      ...recentMessages.map((message: ChatMessage) => ({
        role: message.role === "assistant" ? "model" : "user",
        parts: [
          {
            text: message.content,
          },
        ],
      })),
    ];

    const response = await ai.models.generateContent({
      model: "gemini-2.5-flash",
      contents,
    });

    return NextResponse.json({
      reply: response.text,
    });
  } catch (error) {
    console.error(error);

    return NextResponse.json(
      {
        error: "Something went wrong.",
      },
      { status: 500 }
    );
  }
}