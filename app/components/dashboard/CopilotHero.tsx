"use client";

import { ArrowLeft, Bot, BriefcaseBusiness, Compass, GraduationCap, MessageSquareText, Route, Sparkles, Target } from "lucide-react";
import type { ReactNode } from "react";
import { useRouter } from "next/navigation";

type Variant = "chatbot" | "learning" | "career" | "interview";

type Props = {
  variant: Variant;
  title: ReactNode;
  description: string;
  kicker: string;
};

const config: Record<Variant, { icon: typeof Bot; label: string }> = {
  chatbot: { icon: Bot, label: "CAREER COPILOT" },
  learning: { icon: GraduationCap, label: "LEARNING INTELLIGENCE" },
  career: { icon: Route, label: "CAREER INTELLIGENCE" },
  interview: { icon: MessageSquareText, label: "INTERVIEW INTELLIGENCE" },
};

export default function CopilotHero({ variant, title, description, kicker }: Props) {
  const router = useRouter();
  const Icon = config[variant].icon;

  return (
    <section className={`copilot-hero copilot-hero-${variant}`}>
      <button className="copilot-hero-back" onClick={() => router.back()}>
        <ArrowLeft size={14} /> Back to Career Copilot
      </button>
      <div className="copilot-hero-copy">
        <div className="copilot-hero-kicker"><Icon size={13} /> {kicker || config[variant].label}</div>
        <h1>{title}</h1>
        <p>{description}</p>
      </div>
      <div className="copilot-hero-visual" aria-hidden="true">
        {variant === "chatbot" && <>
          <div className="chatbot-orbit chatbot-orbit-a" /><div className="chatbot-orbit chatbot-orbit-b" />
          <div className="chatbot-core"><Bot size={24} /></div>
          <span className="chatbot-node chatbot-node-a"><MessageSquareText size={13} /></span><span className="chatbot-node chatbot-node-b"><Sparkles size={13} /></span>
        </>}
        {variant === "learning" && <>
          <div className="learning-track learning-track-a" /><div className="learning-track learning-track-b" />
          <div className="learning-core"><GraduationCap size={24} /></div>
          <span className="learning-node learning-node-a"><Target size={13} /></span><span className="learning-node learning-node-b"><Sparkles size={13} /></span>
        </>}
        {variant === "career" && <>
          <div className="career-path-line career-path-a" /><div className="career-path-line career-path-b" />
          <div className="career-core"><Compass size={24} /></div>
          <span className="career-node career-node-a"><BriefcaseBusiness size={13} /></span><span className="career-node career-node-b"><Target size={13} /></span>
        </>}
        {variant === "interview" && <>
          <div className="interview-orbit interview-orbit-a" /><div className="interview-orbit interview-orbit-b" />
          <div className="interview-core-new"><MessageSquareText size={24} /></div>
          <span className="interview-node interview-node-a">Q</span><span className="interview-node interview-node-b"><Target size={13} /></span>
        </>}
      </div>
    </section>
  );
}
