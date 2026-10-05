"use client";
import ReactMarkdown from "react-markdown";
import { useEffect, useRef, useState } from "react";
import { Send, Sparkles, MessageCircle, ArrowRight, Paperclip, FileText } from "lucide-react";
import DashboardNav from "../components/dashboard/DashboardNav";
import CareerCopilotNav from "../components/dashboard/CareerCopilotNav";
import CopilotHero from "../components/dashboard/CopilotHero";

type QuizQuestion = { id: string; question: string; options: string[]; answer: number; explanation: string };
type Quiz = { domain: string; questions: QuizQuestion[] };

type ChatMessage = {
  role: "user" | "assistant";
  content: string;
  type?: "text" | "resume" | "file";
  fileName?: string;
};

const starterPrompts = [
  "How can you help me?",
  "Optimize my resume",
  "How do I improve my resume?",
  "How should I prepare for my target role?",
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
  const [attachedFileContext, setAttachedFileContext] = useState<{name:string;text:string}|null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const [interviewOffer, setInterviewOffer] = useState(false);
  const [quiz, setQuiz] = useState<Quiz | null>(null);
  const [quizAnswers, setQuizAnswers] = useState<number[]>([]);
  const [quizIndex, setQuizIndex] = useState(0);
  const [quizFinished, setQuizFinished] = useState(false);
  const [quizLoading, setQuizLoading] = useState(false);
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({
      behavior: "smooth",
    });
  }, [messages]);
  async function handleSendMessage(messageText?: string) {
    const trimmedMessage = (messageText ?? chatInput).trim();

    if (!trimmedMessage || assistantBusy) {
      return;
    }

    const contentWithFile = attachedFileContext
      ? `${trimmedMessage}\n\n[ATTACHED FILE: ${attachedFileContext.name}]\n${attachedFileContext.text}`
      : trimmedMessage;
    const displayMessages = [
      ...messages,
      { role: "user", content: trimmedMessage } as ChatMessage,
    ];
    const apiMessages = [
      ...messages,
      { role: "user", content: contentWithFile } as ChatMessage,
    ];

    setMessages(displayMessages);
    setChatInput("");
    setAttachedFileContext(null);
    setAssistantBusy(true);

    try {
      const response = await fetch("/api/assistant", {
        method: "POST",
        headers: {
         "Content-Type": "application/json",
        },
        body: JSON.stringify({
          messages: apiMessages,
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

  async function handleFileUpload(file: File) {
    if (assistantBusy) return;
    setAssistantBusy(true);
    setMessages((prev) => [...prev, { role: "user", content: `Uploaded: ${file.name}`, type: "file", fileName: file.name } as ChatMessage]);
    try {
      const form = new FormData(); form.append("file", file);
      const response = await fetch("/api/assistant-file", { method: "POST", body: form });
      const data = await response.json().catch(() => ({}));
      if (!response.ok || !data.success) throw new Error(data.error || "Could not read the file.");
      setAttachedFileContext({ name: file.name, text: data.text });
      setMessages((prev) => [...prev, { role: "assistant", content: `I’ve read **${file.name}**. Ask me what you’d like me to analyze, summarize, improve, or explain.

The extracted content is ready for the next message.` }]);
    } catch (error) { setMessages((prev) => [...prev, { role: "assistant", content: error instanceof Error ? error.message : "Could not read the file." }]); }
    finally { setAssistantBusy(false); }
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
  async function startMockQuiz() {
    setInterviewOffer(false);
    setQuizLoading(true);
    try {
      let guestProfile: any = null; let guestJobContext: any = null; try { guestProfile = JSON.parse(sessionStorage.getItem("opx:guest-profile") || "null"); guestJobContext = JSON.parse(sessionStorage.getItem("opx:guest-job-context") || "null"); } catch {}
      const response = await fetch("/api/interview-quiz", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(guestProfile ? { profile: guestProfile, jobContext: guestJobContext?.job || guestJobContext } : {}) });
      const data = await response.json();
      if (!response.ok || !data.success) throw new Error(data.error || "Unable to generate the mock interview.");
      setQuiz(data.quiz);
      setQuizAnswers([]);
      setQuizIndex(0);
      setQuizFinished(false);
      setMessages((prev) => [...prev, { role: "assistant", content: `Great. I created a 10-question mock interview based on your ${data.quiz.domain} profile. Select one answer for each question.` }]);
    } catch (error) {
      setMessages((prev) => [...prev, { role: "assistant", content: error instanceof Error ? error.message : "Unable to generate the mock interview." }]);
    } finally {
      setQuizLoading(false);
    }
  }

  function submitQuizAnswer(optionIndex: number) {
    if (!quiz || quizFinished) return;
    const next = [...quizAnswers, optionIndex];
    setQuizAnswers(next);
    if (quizIndex === quiz.questions.length - 1) { setQuizFinished(true); }
    else setQuizIndex((value) => value + 1);
  }

  return (
    <main className="dashboard-shell route-dashboard-screen">
      <DashboardNav active="Career Copilot" />
      <CareerCopilotNav active="Chatbot" />
      <section className="assistant-scene dashboard-assistant-scene">
        <CopilotHero variant="chatbot" kicker="CAREER COPILOT" title={<>Think it through.<br/><span>Build what comes next.</span></>} description="Your personal AI career assistant for resumes, interviews, skills and practical career decisions." />

        <section className="assistant-chat-shell">

          <div className="assistant-chat-window">
            {messages.map((message, index) => (
              <article
                className={`assistant-chat-bubble ${message.role}`}
                key={`${message.role}-${index}`}
              >
                {message.type === "file" ? (
                  <div className="resume-message"><div className="resume-icon"><FileText size={17}/></div><div><strong>{message.fileName}</strong><div>File uploaded</div></div></div>
                ) : message.type === "resume" ? (
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

            {interviewOffer && !quiz && (
              <div className="interview-offer-card">
                <strong>Mock Interview Test</strong>
                <p>10 interactive MCQs based on your saved domain and skills.</p>
                <div className="route-actions"><button className="route-primary-button" onClick={() => void startMockQuiz()}>Yes, start test</button><button className="route-secondary-button" onClick={() => { setInterviewOffer(false); setMessages((prev) => [...prev, { role: "assistant", content: "No problem. I can help with normal interview preparation instead." }]); }}>Not now</button></div>
              </div>
            )}
            {quizLoading && <div className="interview-offer-card"><strong>Building your mock interview...</strong><p>Creating questions for your profile.</p></div>}
            {quiz && !quizFinished && (
              <div className="interactive-quiz-card">
                <div className="quiz-progress">Question {quizIndex + 1} of {quiz.questions.length} · {quiz.domain}</div>
                <h3>{quiz.questions[quizIndex].question}</h3>
                <div className="quiz-options">{quiz.questions[quizIndex].options.map((option, index) => <button key={option} type="button" onClick={() => submitQuizAnswer(index)}>{String.fromCharCode(65 + index)}. {option}</button>)}</div>
              </div>
            )}
            {quiz && quizFinished && (
              <div className="interactive-quiz-card quiz-results-card">
                <div className="quiz-progress">Mock interview complete · {quiz.domain}</div>
                <h3>Score: {quizAnswers.reduce((score, answer, index) => score + (answer === quiz.questions[index].answer ? 1 : 0), 0)} / {quiz.questions.length}</h3>
                <p>Review your answers below.</p>
                <div className="quiz-review-list">{quiz.questions.map((question, index) => { const correct = quizAnswers[index] === question.answer; return <div key={question.id} className="quiz-review-item"><strong>{index + 1}. {correct ? "✓" : "✕"} {question.question}</strong><span>Your answer: {question.options[quizAnswers[index]] || "Not answered"}</span><span>Correct answer: {question.options[question.answer]}</span><small>{question.explanation}</small></div>; })}</div>
                <div className="quiz-feedback-grid"><div><strong>Strengths</strong><p>{quizAnswers.filter((answer, index) => answer === quiz.questions[index].answer).length >= 7 ? "Strong overall performance. Your correct answers show good coverage of the tested concepts." : "You handled several concepts correctly. Review the explanations for the questions you answered correctly and build on those areas."}</p></div><div><strong>Weaknesses</strong><p>{quizAnswers.filter((answer, index) => answer === quiz.questions[index].answer).length < 7 ? "Focus on the concepts behind the questions you missed and retake the quiz after targeted practice." : "Your missed questions identify the specific topics to revise before the next interview."}</p></div></div>
                <button className="route-primary-button" onClick={() => { setQuiz(null); setQuizAnswers([]); setQuizIndex(0); setQuizFinished(false); }}>Practice again</button>
              </div>
            )}

            <div ref={messagesEndRef} />
          </div>

          <div className="assistant-composer">
            <div className="assistant-input-wrapper">
              <input ref={fileInputRef} type="file" accept="application/pdf,text/plain,text/markdown,text/csv,application/json" hidden onChange={(e)=>{const f=e.target.files?.[0];if(f)void handleFileUpload(f);e.currentTarget.value="";}}/>
              <button type="button" className="assistant-attach-button" disabled={assistantBusy} onClick={()=>fileInputRef.current?.click()} aria-label="Attach a file"><Paperclip size={17}/></button>
              <div className="assistant-input-prefix"><Sparkles size={15}/><span>Career Copilot</span><i></i></div>
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
