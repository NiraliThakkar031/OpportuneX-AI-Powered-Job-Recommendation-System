"use client";
import ReactMarkdown from "react-markdown";
import { useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { Send } from "lucide-react";

type ChatMessage = {
  role: "user" | "assistant";
  content: string;
  type?: "text" | "resume";
  fileName?: string;
};

const starterPrompts = [
  "How can you help me?",
  "How do I improve my resume?",
  "Suggest a roadmap to become a Data Analyst",
];

const initialAssistantMessage: ChatMessage = {
  role: "assistant",
  content: `Hi! I'm Career Copilot.

I can help you with:

- Resume reviews
- Interview preparation
- Career guidance
- Learning roadmaps
- Job search

What would you like to work on today?`,
};

export default function AssistantPage() {
  const [messages, setMessages] = useState<ChatMessage[]>([initialAssistantMessage]);
  const [chatInput, setChatInput] = useState("");
  const [assistantBusy, setAssistantBusy] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const [showQuickActions, setShowQuickActions] = useState(false);
  const router = useRouter();
  const quickActionsRef = useRef<HTMLDivElement>(null);
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({
      behavior: "smooth",
    });
  }, [messages]);
  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (
        quickActionsRef.current &&
        !quickActionsRef.current.contains(event.target as Node)
      ) {
        setShowQuickActions(false);
      }
    }

    document.addEventListener("mousedown", handleClickOutside);

    return () => {
      document.removeEventListener("mousedown", handleClickOutside);
    };
  }, []);
  async function handleSendMessage(messageText?: string) {
    const trimmedMessage = (messageText ?? chatInput).trim();

    if (!trimmedMessage || assistantBusy) {
      return;
    }

    const nextMessages = [
      ...messages,
      { role: "user", content: trimmedMessage } as ChatMessage,
    ];

    setMessages(nextMessages);
    setChatInput("");
    setShowQuickActions(false);
    setAssistantBusy(true);

    try {
      const response = await fetch("/api/assistant", {
        method: "POST",
        headers: {
         "Content-Type": "application/json",
        },
        body: JSON.stringify({
          messages: nextMessages,
        }),
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error ?? "Unknown error");
      }

      const data = await response.json();

      setMessages((prev) => [
        ...prev,
        {
          role: "assistant",
          content: data.reply,
        },
      ]);

    }catch (error) {
      setMessages((prev) => [
        ...prev,
        {
          role: "assistant",
          content:
            error instanceof Error
              ? error.message
              : "The assistant is unavailable right now.",
        },
      ]);
    } finally {
      setAssistantBusy(false);
    }
  }

  async function handleResumeUpload(file: File) {
    if (assistantBusy) return;

    if (file.type !== "application/pdf") {
      setMessages((prev) => [
        ...prev,
        {
          role: "assistant",
          content: "❌ Please upload a PDF resume.",
        },
      ]);
      return;
    }

    // Check file size (5 MB max)
    if (file.size > 5 * 1024 * 1024) {
      setMessages((prev) => [
        ...prev,
        {
          role: "assistant",
          content: "❌ Resume size must be less than 5 MB.",
        },
      ]);
      return;
    }

    setAssistantBusy(true);

    setMessages((prev) => [
      ...prev,
      {
        role: "user",
        content: "",
        type: "resume",
        fileName: file.name,
      },
    ]);

    try {
      const formData = new FormData();
      formData.append("resume", file);

      const response = await fetch("/api/resume", {
        method: "POST",
        body: formData,
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || "Resume analysis failed.");
      }

      setMessages((prev) => [
        ...prev,
        {
          role: "assistant",
          content: data.analysis,
        },
      ]);
    } catch (error) {
      setMessages((prev) => [
        ...prev,
        {
          role: "assistant",
          content:
            error instanceof Error
              ? error.message
              : "Failed to analyze the resume.",
        },
      ]);
    } finally {
      setAssistantBusy(false);
    }
  }
  function handleQuickAction(action: string) {
    setShowQuickActions(false);

    switch (action) {
      case "resume":
        fileInputRef.current?.click();
        break;

      case "career":
        setChatInput(
          "Guide me in choosing the right career path based on my interests."
        );
        break;

      case "interview":
        setChatInput(
          "Help me prepare for a technical and HR interview."
        );
        break;

      case "roadmap":
        setChatInput(
          "Create a learning roadmap for my career goal."
        );
        break;

      case "jobs":
        router.push("/openings");
        break;
    }
  }
  return (
    <main className="route-screen">
      <section className="assistant-scene">
        <div className="route-flow-header assistant-page-header">
          <h1>Career Copilot</h1>
          <p>
            Your personal AI career assistant.
          </p>
        </div>

        <section className="assistant-chat-shell">

          <div className="assistant-chat-window">
            {messages.map((message, index) => (
              <article
                className={`assistant-chat-bubble ${message.role}`}
                key={`${message.role}-${index}`}
              >
                {message.type === "resume" ? (
                  <div className="resume-message">
                    <div className="resume-icon">📄</div>

                    <div>
                      <strong>{message.fileName}</strong>
                      <div>Resume uploaded</div>
                    </div>
                  </div>
                ) : (
                  <ReactMarkdown>
                    {message.content}
                  </ReactMarkdown>
                )}
              </article>
            ))}
            {assistantBusy && (
              <article className="assistant-chat-bubble assistant">
                <div className="typing-indicator">
                  <span></span>
                  <span></span>
                  <span></span>
                </div>
              </article>
            )}

            <div ref={messagesEndRef} />
          </div>

          <div
            className="assistant-composer"
            ref={quickActionsRef}
          >
            {showQuickActions && (
              <div className="quick-actions-dock">

                <button
                  className="quick-pill"
                  onClick={() => handleQuickAction("resume")}
                >
                  Review Resume
                </button>

                <button
                  className="quick-pill"
                  onClick={() => handleQuickAction("career")}
                >
                  Career Guidance
                </button>

                <button
                  className="quick-pill"
                  onClick={() => handleQuickAction("interview")}
                >
                  Interview Prep
                </button>

                <button
                  className="quick-pill"
                  onClick={() => handleQuickAction("roadmap")}
                >
                  Learning Roadmap
                </button>

                <button
                  className="quick-pill"
                  onClick={() => handleQuickAction("jobs")}
                >
                  Find Jobs
                </button>

              </div>
            )}
            <input
              ref={fileInputRef}
              type="file"
              accept=".pdf"
              hidden
              onChange={(event) => {
                const file = event.target.files?.[0];

                if (file) {
                  void handleResumeUpload(file);
                }

                event.target.value = "";
              }}
            />
            <button
              type="button"
              className={`quick-actions-button ${
                showQuickActions ? "active" : ""
              }`}
              onClick={() => setShowQuickActions(!showQuickActions)}
            >
              ⚡
            </button>

            <div className="assistant-input-wrapper">
              <textarea
                disabled={assistantBusy}
                value={chatInput}
                onChange={(event) => setChatInput(event.target.value)}
                onKeyDown={(event) => {
                  if (event.key === "Enter" && !event.shiftKey) {
                    event.preventDefault();
                    void handleSendMessage();
                  }
                }}
                placeholder="Ask about resumes, interviews or careers..."
              />
              <button
                type="button"
                className="assistant-send-button"
                disabled={assistantBusy}
                onClick={() => void handleSendMessage()}
              >
                <Send size={18} />
              </button>
            </div>
          </div>
        </section>
      </section>
    </main>
  );
}
